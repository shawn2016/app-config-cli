<template>
  <div class="config-list">
    <div class="list-header">
      <h3>已有品牌配置</h3>
      <div class="header-actions">
        <div class="search-bar">
          <el-input
            v-model="searchText"
            placeholder="搜索品牌名、应用名、英文名等..."
            clearable
            style="width: 300px; margin-right: 10px;"
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="filterRegion"
            placeholder="筛选环境"
            clearable
            style="width: 150px; margin-right: 10px;"
            @change="handleSearch"
          >
            <el-option label="全部" value="" />
            <el-option label="美国 (US)" value="us" />
            <el-option label="东南亚 (SEA)" value="sea" />
            <el-option label="欧洲 (EU)" value="eu" />
            <el-option label="测试环境 (TEST)" value="test" />
          </el-select>
        </div>
        <div class="view-controls">
          <el-button-group>
            <el-button
              :type="viewMode === 'list' ? 'primary' : ''"
              @click="viewMode = 'list'"
            >
              <el-icon><List /></el-icon>
              列表
            </el-button>
            <el-button
              :type="viewMode === 'card' ? 'primary' : ''"
              @click="viewMode = 'card'"
            >
              <el-icon><Grid /></el-icon>
              卡片
            </el-button>
          </el-button-group>
          <el-button @click="showFieldConfigDialog = true">
            <el-icon><Setting /></el-icon>
            配置字段
          </el-button>
          <el-button type="primary" @click="showImportDialog = true">
            <el-icon><Upload /></el-icon>
            导入配置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <el-table
      v-if="viewMode === 'list'"
      v-loading="loading"
      :data="filteredConfigs"
      style="width: 100%"
      empty-text="暂无配置，请先创建"
    >
      <el-table-column
        v-for="field in visibleFields"
        :key="field.key"
        :prop="field.key"
        :label="field.label"
        :width="field.width"
        :min-width="field.minWidth"
      >
        <template #default="{ row }">
          <template v-if="field.key === 'baseUrlRegion'">
            <el-tag
              v-if="row[field.key]"
              :type="getRegionTagType(row[field.key])"
              size="small"
            >
              {{ getRegionLabel(row[field.key]) }}
            </el-tag>
            <span v-else>-</span>
          </template>
          <template v-else-if="field.key === 'createdAt'">
            {{ formatDate(row[field.key]) }}
          </template>
          <template v-else>
            {{ row[field.key] || '-' }}
          </template>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="500" fixed="right">
        <template #default="{ row }">
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            <el-button type="primary" link @click="viewConfig(row.folderName || row.alias)">
              查看
            </el-button>
            <el-button type="warning" link @click="editConfig(row.folderName || row.alias)">
              编辑
            </el-button>
            <el-button type="danger" link @click="deleteConfig(row.folderName || row.alias)">
              删除
            </el-button>
            <el-button type="success" link @click="viewKeystoreInfo(row.folderName || row.alias)">
              查看密钥
            </el-button>
            <el-button type="info" link @click="regenerateKeystore(row.folderName || row.alias)">
              重新生成 Keystore
            </el-button>
            <el-button type="primary" link @click="generateUnipush(row.folderName || row.alias)">
              生成 unipush 云函数
            </el-button>
            <el-button type="warning" link @click="showCloudBuildDialog(row.folderName || row.alias, row)">
              云打包
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 卡片视图 -->
    <div v-else v-loading="loading" class="config-grid">
      <el-card
        v-for="config in filteredConfigs"
        :key="config.folderName"
        class="config-card"
        shadow="hover"
      >
        <template #header>
          <div class="card-header">
            <div class="brand-info">
              <h4>{{ config.alias }}</h4>
              <el-tag
                v-if="config.baseUrlRegion"
                :type="getRegionTagType(config.baseUrlRegion)"
                size="small"
              >
                {{ getRegionLabel(config.baseUrlRegion) }}
              </el-tag>
            </div>
          </div>
        </template>

        <div class="card-content">
          <!-- Logo 展示 -->
          <div v-if="visibleFieldsMap.logoExists" class="logo-section">
            <img
              v-if="config.logoExists"
              :src="`/appConfig/${config.folderName}/logo.png`"
              alt="Logo"
              class="logo-image"
              @error="handleImageError"
            />
            <div v-else class="logo-placeholder">
              <el-icon><Picture /></el-icon>
              <span>暂无 Logo</span>
            </div>
          </div>

          <!-- 配置信息 -->
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item
              v-for="field in visibleFields.filter(f => f.key !== 'logoExists' && f.key !== 'alias' && f.key !== 'baseUrlRegion')"
              :key="field.key"
              :label="field.label"
            >
              <template v-if="field.key === 'createdAt'">
                {{ formatDate(config[field.key]) }}
              </template>
              <template v-else>
                {{ config[field.key] || '-' }}
              </template>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 操作按钮 -->
          <div class="card-actions">
            <el-button type="primary" link @click="viewConfig(config.folderName || config.alias)">
              查看
            </el-button>
            <el-button type="warning" link @click="editConfig(config.folderName || config.alias)">
              编辑
            </el-button>
            <el-button type="danger" link @click="deleteConfig(config.folderName || config.alias)">
              删除
            </el-button>
            <el-button type="success" link @click="viewKeystoreInfo(config.folderName || config.alias)">
              查看密钥
            </el-button>
            <el-button type="info" link @click="regenerateKeystore(config.folderName || config.alias)">
              重新生成 Keystore
            </el-button>
            <el-button type="primary" link @click="generateUnipush(config.folderName || config.alias)">
              生成 unipush 云函数
            </el-button>
            <el-button type="warning" link @click="showCloudBuildDialog(config.folderName || config.alias, config)">
              云打包
            </el-button>
          </div>
        </div>
      </el-card>

      <el-empty
        v-if="!loading && filteredConfigs.length === 0"
        description="暂无配置或未找到匹配的配置"
      />
    </div>

    <!-- 字段配置对话框 -->
    <el-dialog
      v-model="showFieldConfigDialog"
      title="配置显示字段"
      width="600px"
    >
      <el-checkbox-group v-model="selectedFields">
        <el-checkbox
          v-for="field in allFields"
          :key="field.key"
          :label="field.key"
        >
          {{ field.label }}
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="showFieldConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFieldConfig">确定</el-button>
        <el-button @click="resetFieldConfig">重置为默认</el-button>
      </template>
    </el-dialog>

    <!-- 查看配置对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="查看配置"
      width="70%"
      :before-close="closeViewDialog"
    >
      <div v-if="viewingConfig">
        <el-tag type="info" style="margin-bottom: 15px">
          品牌别名: {{ viewingConfig.alias }}
        </el-tag>
        <el-card>
          <pre class="config-content">{{ viewingConfig.content }}</pre>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="closeViewDialog">关闭</el-button>
        <el-button type="primary" @click="copyConfig">
          <el-icon><DocumentCopy /></el-icon>
          复制内容
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑配置对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑配置"
      width="800px"
      :before-close="closeEditDialog"
    >
      <el-form
        v-if="editingConfig"
        ref="editFormRef"
        :model="editingConfig"
        label-width="150px"
        class="edit-form"
      >
        <el-divider content-position="left">基础信息</el-divider>
        <el-form-item label="品牌别名">
          <el-input v-model="editingConfig.alias" readonly disabled />
          <div class="form-tip">品牌别名不可修改</div>
        </el-form-item>

        <el-divider content-position="left">包名配置</el-divider>
        <el-form-item label="Android 包名">
          <el-input v-model="editingConfig.packagename" placeholder="如：ai.restosuite.mollytea">
            <template #append>
              <el-button @click="copyToClipboard(editingConfig.packagename)">
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
            </template>
          </el-input>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            Android 包名，用于 Android 应用标识。<strong style="color: #e6a23c;">打包时必填项</strong>
            <el-link
              href="https://cinyja0w5wn.feishu.cn/wiki/BF9fwROcCiTW2tkaTdmcTK5xnyg"
              target="_blank"
              type="primary"
              style="margin: 0 4px"
            >
              开发参考文档
            </el-link>
          </div>
        </el-form-item>

        <el-form-item label="iOS Bundle ID">
          <el-input v-model="editingConfig.iosAppId" placeholder="如：ai.restosuite.mollytea">
            <template #append>
              <el-button @click="copyToClipboard(editingConfig.iosAppId)">
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
            </template>
          </el-input>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            iOS Bundle ID，用于 iOS 应用标识。<strong style="color: #e6a23c;">打包时必填项</strong>
            <el-link
              href="https://cinyja0w5wn.feishu.cn/wiki/Ek5UwfzkgiK4nbkc2MlcSqLMnGh"
              target="_blank"
              type="primary"
              style="margin: 0 4px"
            >
              开发参考文档
            </el-link>
          </div>
        </el-form-item>

        <el-form-item label="应用名称">
          <el-input v-model="editingConfig.appName" placeholder="请输入应用名称" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            应用显示名称（中文），将显示在应用图标下方。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-form-item label="应用英文名">
          <el-input v-model="editingConfig.appEnName" placeholder="请输入应用英文名" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            应用显示名称（英文），建议与 iOS CFBundleName 保持一致。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-form-item label="应用描述">
          <el-input
            v-model="editingConfig.appDescription"
            type="textarea"
            :rows="3"
            placeholder="请输入应用描述"
          />
        </el-form-item>

        <el-form-item label="DCloud App ID">
          <el-input
            v-model="editingConfig.dcAppId"
            placeholder="请输入 DCloud App ID"
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            DCloud 应用 ID，用于 uni-app 打包。<strong style="color: #e6a23c;">打包时必填项</strong> 请前往
            <el-link
              href="https://dev.dcloud.net.cn/pages/app/list"
              target="_blank"
              type="primary"
              style="margin: 0 4px"
            >
              DCloud 开发者中心
            </el-link>
            创建后补充。
            <el-link
              href="https://restosuite.sg.larksuite.com/wiki/IwJBwRZ4FirwoJkiLHQlgo3ugYL?from=from_copylink"
              target="_blank"
              type="primary"
              style="margin: 0 4px"
            >
              开发参考文档
            </el-link>
          </div>
        </el-form-item>

        <el-divider content-position="left">Logo 配置</el-divider>
        <el-form-item label="应用 Logo">
          <div style="display: flex; align-items: flex-start; gap: 20px;">
            <div v-if="editLogoPreview || editLogoUrl" style="position: relative; display: inline-block;">
              <img 
                :src="editLogoPreview || editLogoUrl" 
                alt="Logo 预览" 
                style="width: 102px; height: 102px; border: 1px solid #dcdfe6; border-radius: 8px; object-fit: contain; background: #f5f7fa;"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                style="position: absolute; top: -8px; right: -8px;"
                @click="deleteEditLogo"
                title="删除 Logo"
              />
            </div>
            <div v-else style="width: 102px; height: 102px; border: 1px dashed #dcdfe6; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #fafafa; color: #909399; font-size: 12px; text-align: center; padding: 10px;">
              暂无 Logo
            </div>
            <div style="flex: 1;">
              <el-upload
                ref="editLogoUploadRef"
                :auto-upload="false"
                :on-change="handleEditLogoChange"
                :on-remove="handleEditLogoRemove"
                :limit="1"
                accept="image/png"
                :show-file-list="false"
              >
                <template #trigger>
                  <el-button type="primary">
                    <el-icon><Upload /></el-icon>
                    选择 Logo
                  </el-button>
                </template>
              </el-upload>
              <div class="form-tip" style="margin-top: 8px;">
                <el-icon><InfoFilled /></el-icon>
                Logo 要求：PNG 格式，尺寸 1024x1024 像素。<strong style="color: #e6a23c;">打包时必填项</strong>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-divider content-position="left">环境配置</el-divider>
        <el-form-item label="API 地区">
          <el-select 
            v-model="editingConfig.baseUrlRegion" 
            placeholder="请选择 API 地区"
            @change="handleEditRegionChange"
          >
            <el-option 
              v-for="region in editRegionOptions" 
              :key="region.value"
              :label="region.label"
              :value="region.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="iOS App Links 域名">
          <el-input
            v-model="editingConfig.iosApplinksDomain"
            readonly
            disabled
          />
        </el-form-item>

        <el-divider content-position="left">版本配置</el-divider>
        <el-form-item label="版本号">
          <el-input v-model="editingConfig.versionName" placeholder="1.0.0" />
        </el-form-item>

        <el-form-item label="版本代码">
          <el-input-number v-model="editingConfig.versionCode" :min="1" />
        </el-form-item>

        <el-form-item label="iOS 版本代码">
          <el-input-number v-model="editingConfig.iosVersionCode" :min="1" />
        </el-form-item>

        <el-form-item label="Android 版本代码">
          <el-input-number v-model="editingConfig.androidVersionCode" :min="1" />
        </el-form-item>

        <el-divider content-position="left">其他配置</el-divider>
        <el-form-item label="默认语言">
          <el-select v-model="editingConfig.locale">
            <el-option label="简体中文 (zh_CN)" value="zh_CN" />
            <el-option label="繁体中文 (zh_TW)" value="zh_TW" />
            <el-option label="English (en_US)" value="en_US" />
          </el-select>
        </el-form-item>

        <el-form-item label="iOS Team ID">
          <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <el-input v-model="editingConfig.teamId" placeholder="如：NU8N6PC4M2" style="flex: 1;" />
            <el-popover
              placement="right"
              :width="450"
              trigger="hover"
              :show-after="200"
            >
              <template #reference>
                <el-icon 
                  :size="18" 
                  style="color: #909399; cursor: pointer; flex-shrink: 0;"
                  :class="{ 'hover-icon': true }"
                >
                  <QuestionFilled />
                </el-icon>
              </template>
              <div style="text-align: center;">
                <img 
                  src="/ios-download-tip.png" 
                  alt="Team ID 使用说明" 
                  style="max-width: 100%; height: auto; border-radius: 4px; display: block;"
                />
              </div>
            </el-popover>
          </div>
          <div class="form-tip" style="margin-top: 8px; display: block; width: 100%;">
            <el-icon><InfoFilled /></el-icon>
            iOS 开发团队 ID，用于 iOS 应用签名。<strong style="color: #e6a23c;">打包时必填项</strong> 请前往
            <el-link
              href="https://developer.apple.com/account"
              target="_blank"
              type="primary"
              style="margin: 0 4px"
            >
              Apple Developer 账号
            </el-link>
            查看并复制
          </div>
        </el-form-item>

        <el-form-item label="集团 ID">
          <el-input v-model="editingConfig.corporationId" placeholder="如：247" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            集团 ID，用于多品牌管理。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-form-item label="装修 ID">
          <el-input v-model="editingConfig.extAppId" placeholder="如：1951103932717666313" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            装修 ID，用于应用主题和样式配置。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-form-item label="iOS 下载链接">
          <el-input v-model="editingConfig.iosDownloadUrl" placeholder="如：https://apps.apple.com/cn/app/molly-tea/id6749044844" />
          <div class="form-tip" style="color: #e6a23c; margin-top: 8px; display: block; width: 100%;">
            <el-icon><InfoFilled /></el-icon>
            <strong>上架后记得补齐</strong> - iOS App Store 下载链接，用于 App Association 配置。安卓下载链接会自动生成，无需添加。
          </div>
        </el-form-item>

        <el-form-item label="主题颜色">
          <el-input v-model="editingConfig.themeColor" placeholder="#52a1ff">
            <template #prepend>
              <el-color-picker v-model="editingConfig.themeColor" />
            </template>
          </el-input>
        </el-form-item>

        <el-divider content-position="left">证书配置</el-divider>
        <el-form-item label="iOS 发布证书 (.p12)">
          <div style="display: flex; align-items: flex-start; gap: 20px;">
            <div v-if="editP12File || editP12FileName || editP12Exists" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; border: 1px solid #dcdfe6;">
              <el-icon style="color: #67c23a;"><Document /></el-icon>
              <span style="font-size: 14px;">{{ editP12FileName || 'app.p12' }}</span>
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="deleteEditP12"
                title="删除证书"
              />
            </div>
            <div v-else style="padding: 8px 12px; background: #fafafa; border: 1px dashed #dcdfe6; border-radius: 4px; color: #909399; font-size: 14px;">
              暂无证书
            </div>
            <div style="flex: 1;">
              <el-upload
                ref="editP12UploadRef"
                :auto-upload="false"
                :on-change="handleEditP12Change"
                :on-remove="handleEditP12Remove"
                :limit="1"
                accept=".p12"
                :show-file-list="false"
              >
                <template #trigger>
                  <el-button type="primary">
                    <el-icon><Upload /></el-icon>
                    选择 .p12 文件
                  </el-button>
                </template>
              </el-upload>
              <div class="form-tip" style="margin-top: 8px;">
                <el-icon><InfoFilled /></el-icon>
                上传 iOS 发布证书文件，将自动重命名为 app.p12。<strong style="color: #e6a23c;">打包时必填项</strong>
                <el-link
                  href="https://doc.weixin.qq.com/doc/w3_AHwA9AboAOcCNvWD6OtO3QuOfv211?scode=AMkAYwc4AAwexSOiUVAHwA9AboAOc"
                  target="_blank"
                  type="primary"
                  style="margin-left: 4px"
                >
                  开发参考文档
                </el-link>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="iOS 描述文件 (.mobileprovision)">
          <div style="display: flex; align-items: flex-start; gap: 20px;">
            <div v-if="editMobileprovisionFile || editMobileprovisionFileName || editMobileprovisionExists" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; border: 1px solid #dcdfe6;">
              <el-icon style="color: #67c23a;"><Document /></el-icon>
              <span style="font-size: 14px;">{{ editMobileprovisionFileName || 'app.mobileprovision' }}</span>
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="deleteEditMobileprovision"
                title="删除描述文件"
              />
            </div>
            <div v-else style="padding: 8px 12px; background: #fafafa; border: 1px dashed #dcdfe6; border-radius: 4px; color: #909399; font-size: 14px;">
              暂无描述文件
            </div>
            <div style="flex: 1;">
              <el-upload
                ref="editMobileprovisionUploadRef"
                :auto-upload="false"
                :on-change="handleEditMobileprovisionChange"
                :on-remove="handleEditMobileprovisionRemove"
                :limit="1"
                accept=".mobileprovision"
                :show-file-list="false"
              >
                <template #trigger>
                  <el-button type="primary">
                    <el-icon><Upload /></el-icon>
                    选择 .mobileprovision 文件
                  </el-button>
                </template>
              </el-upload>
              <div class="form-tip" style="margin-top: 8px;">
                <el-icon><InfoFilled /></el-icon>
                上传 iOS 描述文件，将自动重命名为 app.mobileprovision。<strong style="color: #e6a23c;">打包时必填项</strong>
                <el-link
                  href="https://doc.weixin.qq.com/doc/w3_AHwA9AboAOcCNvWD6OtO3QuOfv211?scode=AMkAYwc4AAwexSOiUVAHwA9AboAOc"
                  target="_blank"
                  type="primary"
                  style="margin-left: 4px"
                >
                  开发参考文档
                </el-link>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="功能开关">
          <el-checkbox v-model="editingConfig.isSupportEnterprise">支持企业包</el-checkbox>
          <el-checkbox v-model="editingConfig.isTest" disabled>测试环境</el-checkbox>
          <el-checkbox v-model="editingConfig.isSupportHotUpdate">支持热更新</el-checkbox>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            功能开关配置：企业包（是否支持企业版）、热更新（是否支持代码热更新）。测试环境开关已与 API 地区绑定，选择测试环境时自动勾选，不可手动修改
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeEditDialog">取消</el-button>
        <el-button type="primary" :loading="updating" @click="saveEditConfig">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入配置对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入配置"
      width="600px"
    >
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        accept=".ts"
        drag
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将 index.ts 文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只能上传 .ts 文件，且文件内容需符合配置格式
          </div>
        </template>
      </el-upload>

      <div v-if="importPreview" class="import-preview">
        <h4>预览解析结果：</h4>
        <el-alert
          v-if="importError"
          :title="importError"
          type="error"
          :closable="false"
          style="margin-bottom: 10px"
        />
        <el-card v-else>
          <pre class="preview-code">{{ importPreview }}</pre>
        </el-card>
      </div>

      <template #footer>
        <el-button @click="cancelImport">取消</el-button>
        <el-button
          type="primary"
          :disabled="!importData || !!importError"
          :loading="importing"
          @click="confirmImport"
        >
          确认导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看 Keystore 信息对话框 -->
    <el-dialog
      v-model="keystoreDialogVisible"
      title="查看 Keystore 信息"
      width="70%"
      :before-close="closeKeystoreDialog"
    >
      <div v-loading="keystoreLoading">
        <div v-if="keystoreInfo && keystoreInfo.info">
          <el-alert
            title="密钥信息"
            type="info"
            :closable="false"
            style="margin-bottom: 20px"
          />
          
          <el-descriptions :column="1" border>
            <el-descriptions-item label="别名">
              {{ keystoreInfo.info?.alias || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="SHA1">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; word-break: break-all;">{{ keystoreInfo.info?.sha1 || '-' }}</span>
                <el-button
                  v-if="keystoreInfo.info?.sha1"
                  type="primary"
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(keystoreInfo.info.sha1)"
                >
                  复制
                </el-button>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="SHA256">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; word-break: break-all;">{{ keystoreInfo.info?.sha256 || '-' }}</span>
                <el-button
                  v-if="keystoreInfo.info?.sha256"
                  type="primary"
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(keystoreInfo.info.sha256)"
                >
                  复制
                </el-button>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="MD5">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; word-break: break-all;">{{ keystoreInfo.info?.md5 || '-' }}</span>
                <el-button
                  v-if="keystoreInfo.info?.md5"
                  type="primary"
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(keystoreInfo.info.md5)"
                >
                  复制
                </el-button>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="所有者">
              {{ keystoreInfo.info?.owner || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="颁发者">
              {{ keystoreInfo.info?.issuer || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="有效期开始">
              {{ keystoreInfo.info?.validFrom || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="有效期结束">
              {{ keystoreInfo.info?.validUntil || '-' }}
            </el-descriptions-item>
          </el-descriptions>

          <el-divider>完整信息</el-divider>
          <el-card>
            <pre style="max-height: 400px; overflow: auto; font-size: 12px; line-height: 1.5;">{{ keystoreInfo.info?.raw || '-' }}</pre>
          </el-card>
        </div>
        <div v-else-if="keystoreError" style="text-align: center; padding: 40px;">
          <el-alert
            :title="keystoreError"
            type="error"
            :closable="false"
          />
        </div>
        <div v-else-if="!keystoreLoading" style="text-align: center; padding: 40px;">
          <el-alert
            title="暂无数据"
            type="info"
            :closable="false"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 云打包对话框 -->
    <el-dialog
      v-model="cloudBuildDialogVisible"
      title="云打包配置"
      width="600px"
      :before-close="closeCloudBuildDialog"
    >
      <el-form
        ref="cloudBuildFormRef"
        :model="cloudBuildForm"
        label-width="120px"
        :rules="cloudBuildRules"
      >
        <el-form-item label="品牌别名">
          <el-input v-model="cloudBuildForm.alias" readonly disabled />
        </el-form-item>

        <el-form-item label="平台" prop="platform">
          <el-radio-group v-model="cloudBuildForm.platform">
            <el-radio label="android">Android</el-radio>
            <el-radio label="ios">iOS</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="环境" prop="environment">
          <el-radio-group v-model="cloudBuildForm.environment">
            <el-radio label="test">测试环境</el-radio>
            <el-radio label="production">生产环境</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="操作类型" prop="operation">
          <el-radio-group v-model="cloudBuildForm.operation">
            <el-radio label="cloudbuild">云打包</el-radio>
            <el-radio label="wgt">制作wgt文件</el-radio>
          </el-radio-group>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            云打包：完整的云打包流程（包含上传蒲公英、转apk等）<br>
            制作wgt文件：仅生成wgt文件到downloads目录
          </div>
        </el-form-item>

        <el-form-item
          v-if="cloudBuildForm.operation === 'wgt'"
          label="版本描述"
          prop="userVersionDesc"
        >
          <el-input
            v-model="cloudBuildForm.userVersionDesc"
            type="textarea"
            :rows="3"
            placeholder="请输入版本更新描述（可选）"
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            版本更新描述，用于wgt文件上传时的描述信息
          </div>
        </el-form-item>

        <el-form-item label="不增加版本号">
          <el-checkbox v-model="cloudBuildForm.noIncrement">
            不增加版本号（保持当前版本号不变）
          </el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeCloudBuildDialog">取消</el-button>
        <el-button type="primary" :loading="cloudBuildLoading" @click="confirmCloudBuild">
          开始打包
        </el-button>
      </template>
    </el-dialog>

    <!-- 云打包进度对话框 -->
    <el-dialog
      v-model="cloudBuildProgressVisible"
      title="云打包进度"
      width="800px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!cloudBuildLoading"
    >
      <div v-loading="cloudBuildLoading" class="cloud-build-output">
        <div v-if="cloudBuildOutput.length > 0" class="output-content">
          <div
            v-for="(line, index) in cloudBuildOutput"
            :key="index"
            :class="['output-line', line.type]"
          >
            {{ line.text }}
          </div>
        </div>
        <div v-else class="output-placeholder">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>正在启动打包流程...</span>
        </div>
      </div>
      <template #footer>
        <el-button
          v-if="!cloudBuildLoading"
          type="primary"
          @click="closeCloudBuildProgress"
        >
          关闭
        </el-button>
        <el-button v-else disabled>打包进行中...</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, DocumentCopy, UploadFilled, Delete, InfoFilled, Document, Search, List, Grid, Setting, Picture, Loading } from '@element-plus/icons-vue';
import axios from 'axios';

const loading = ref(false);
const configs = ref([]);
const viewMode = ref('list'); // 'list' 或 'card'
const searchText = ref('');
const filterRegion = ref('');
const showFieldConfigDialog = ref(false);
const selectedFields = ref([]);

// 所有可用字段定义
const allFields = [
  { key: 'alias', label: '品牌别名', width: 150, default: true },
  { key: 'appName', label: '应用名称', minWidth: 150, default: true },
  { key: 'appEnName', label: '应用英文名', minWidth: 150, default: true },
  { key: 'appDescription', label: '描述', minWidth: 200, default: true },
  { key: 'dcAppId', label: 'DCloud App ID', minWidth: 150, default: false },
  { key: 'packagename', label: 'Android 包名', minWidth: 180, default: false },
  { key: 'iosAppId', label: 'iOS Bundle ID', minWidth: 180, default: false },
  { key: 'appLinksuffix', label: 'App Link Suffix', minWidth: 150, default: false },
  { key: 'schemes', label: 'Schemes', minWidth: 120, default: false },
  { key: 'urltypes', label: 'URL Types', minWidth: 120, default: false },
  { key: 'teamId', label: 'iOS Team ID', minWidth: 150, default: false },
  { key: 'corporationId', label: '集团 ID', minWidth: 120, default: false },
  { key: 'extAppId', label: '装修 ID', minWidth: 120, default: false },
  { key: 'iosApplinksDomain', label: 'iOS App Links 域名', minWidth: 200, default: false },
  { key: 'baseUrlRegion', label: '环境', width: 120, default: true },
  { key: 'logoExists', label: 'Logo', width: 100, default: false },
  { key: 'createdAt', label: '创建时间', width: 180, default: true }
];

// 默认显示的字段
const defaultFields = allFields.filter(f => f.default).map(f => f.key);

// 初始化选中的字段（从 localStorage 读取或使用默认值）
const initSelectedFields = () => {
  const saved = localStorage.getItem('configListSelectedFields');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // 验证字段是否有效
      const validFields = parsed.filter(f => allFields.some(af => af.key === f));
      if (validFields.length > 0) {
        selectedFields.value = validFields;
        return;
      }
    } catch (e) {
      console.error('Failed to parse saved fields:', e);
    }
  }
  selectedFields.value = [...defaultFields];
};

initSelectedFields();

// 可见字段（根据用户选择）
const visibleFields = computed(() => {
  return allFields.filter(f => selectedFields.value.includes(f.key));
});

// 可见字段映射（用于快速查找）
const visibleFieldsMap = computed(() => {
  const map = {};
  selectedFields.value.forEach(key => {
    map[key] = true;
  });
  return map;
});

// 环境选项
const regionOptions = [
  { label: '美国 (US)', value: 'us' },
  { label: '东南亚 (SEA)', value: 'sea' },
  { label: '欧洲 (EU)', value: 'eu' },
  { label: '测试环境 (TEST)', value: 'test' }
];

// 获取环境标签类型
const getRegionTagType = (region) => {
  const typeMap = {
    us: 'success',
    sea: 'primary',
    eu: 'warning',
    test: 'danger'
  };
  return typeMap[region] || 'info';
};

// 获取环境标签文本
const getRegionLabel = (region) => {
  const option = regionOptions.find(r => r.value === region);
  return option ? option.label : region;
};

// 过滤后的配置列表
const filteredConfigs = computed(() => {
  let result = configs.value;

  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase();
    result = result.filter(config => {
      return (
        (config.alias && config.alias.toLowerCase().includes(search)) ||
        (config.appName && config.appName.toLowerCase().includes(search)) ||
        (config.appEnName && config.appEnName.toLowerCase().includes(search)) ||
        (config.appDescription && config.appDescription.toLowerCase().includes(search)) ||
        (config.dcAppId && config.dcAppId.toLowerCase().includes(search)) ||
        (config.packagename && config.packagename.toLowerCase().includes(search)) ||
        (config.iosAppId && config.iosAppId.toLowerCase().includes(search)) ||
        (config.baseUrlRegion && config.baseUrlRegion.toLowerCase().includes(search))
      );
    });
  }

  // 环境过滤
  if (filterRegion.value) {
    result = result.filter(config => config.baseUrlRegion === filterRegion.value);
  }

  return result;
});

// 处理搜索
const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
};

// 保存字段配置
const saveFieldConfig = () => {
  if (selectedFields.value.length === 0) {
    ElMessage.warning('请至少选择一个字段');
    return;
  }
  localStorage.setItem('configListSelectedFields', JSON.stringify(selectedFields.value));
  showFieldConfigDialog.value = false;
  ElMessage.success('字段配置已保存');
};

// 重置字段配置
const resetFieldConfig = () => {
  selectedFields.value = [...defaultFields];
  ElMessage.info('已重置为默认字段');
};

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.style.display = 'none';
  const placeholder = event.target.nextElementSibling;
  if (placeholder) {
    placeholder.style.display = 'flex';
  }
};
const viewDialogVisible = ref(false);
const viewingConfig = ref(null);
const showImportDialog = ref(false);
const uploadRef = ref(null);
const importData = ref(null);
const importPreview = ref('');
const importError = ref('');
const importing = ref(false);
const editDialogVisible = ref(false);
const editingConfig = ref(null);
const editFormRef = ref(null);
const updating = ref(false);
const editLogoUploadRef = ref(null);
const editLogoFile = ref(null);
const editLogoPreview = ref('');
const editLogoUrl = ref('');
const editP12UploadRef = ref(null);
const editP12File = ref(null);
const editP12FileName = ref('');
const editP12Exists = ref(false);
const editMobileprovisionUploadRef = ref(null);
const editMobileprovisionFile = ref(null);
const editMobileprovisionFileName = ref('');
const editMobileprovisionExists = ref(false);
const keystoreDialogVisible = ref(false);
const keystoreInfo = ref(null);
const keystoreError = ref('');
const keystoreLoading = ref(false);
const cloudBuildDialogVisible = ref(false);
const cloudBuildForm = ref({
  alias: '',
  platform: 'android',
  environment: 'test',
  operation: 'cloudbuild',
  userVersionDesc: '',
  noIncrement: false
});
const cloudBuildFormRef = ref(null);
const cloudBuildLoading = ref(false);
const cloudBuildProgressVisible = ref(false);
const cloudBuildOutput = ref([]);
const cloudBuildRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  environment: [{ required: true, message: '请选择环境', trigger: 'change' }],
  operation: [{ required: true, message: '请选择操作类型', trigger: 'change' }]
};

// API 地区选项（用于编辑表单）
const editRegionOptions = [
  { 
    label: '美国 (US) - https://m.us.restosuite.ai', 
    value: 'us',
    applinksDomain: 'https://applinks.us.restosuite.ai'
  },
  { 
    label: '东南亚 (SEA) - https://m.sea.restosuite.ai', 
    value: 'sea',
    applinksDomain: 'https://applinks.sea.restosuite.ai'
  },
  { 
    label: '欧洲 (EU) - https://m.eu.restosuite.ai', 
    value: 'eu',
    applinksDomain: 'https://applinks.eu.restosuite.ai'
  },
  { 
    label: '测试环境 (TEST) - https://m.test.restosuite.cn', 
    value: 'test',
    applinksDomain: 'https://applinks.test.restosuite.cn'
  }
];

// 加载配置列表
const loadConfigs = async () => {
  try {
    loading.value = true;
    const response = await axios.get('/api/configs');
    configs.value = response.data;
  } catch (error) {
    ElMessage.error('加载配置列表失败: ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
};

// 查看配置
const viewConfig = async (alias) => {
  try {
    const response = await axios.get(`/api/configs/${alias}`);
    viewingConfig.value = response.data;
    viewDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载配置失败: ' + (error.response?.data?.error || error.message));
  }
};

// 关闭查看对话框
const closeViewDialog = () => {
  viewDialogVisible.value = false;
  viewingConfig.value = null;
};

// 查看 Keystore 信息
const viewKeystoreInfo = async (alias) => {
  console.log('查看 keystore 信息:', alias);
  try {
    // 先打开对话框
    keystoreDialogVisible.value = true;
    keystoreLoading.value = true;
    keystoreError.value = '';
    keystoreInfo.value = null;

    const response = await axios.get(`/api/configs/${alias}/keystore`);
    console.log('keystore 信息响应:', response);
    console.log('response.data:', response.data);
    console.log('response.status:', response.status);
    
    // 检查响应数据
    if (response.data) {
      if (response.data.success === true && response.data.info) {
        // 成功获取数据
        keystoreInfo.value = response.data;
      } else if (response.data.error) {
        // 有错误信息
        keystoreError.value = response.data.error;
        keystoreInfo.value = null;
      } else if (response.data.success === false) {
        // 明确标记为失败
        keystoreError.value = response.data.error || '获取 keystore 信息失败';
        keystoreInfo.value = null;
      } else {
        // 数据格式不正确
        console.error('数据格式不正确:', response.data);
        keystoreError.value = '获取 keystore 信息失败：服务器返回的数据格式不正确。响应数据：' + JSON.stringify(response.data);
        keystoreInfo.value = null;
      }
    } else {
      keystoreError.value = '获取 keystore 信息失败：服务器未返回数据';
      keystoreInfo.value = null;
    }
  } catch (error) {
    console.error('获取 keystore 信息错误:', error);
    console.error('error.response:', error.response);
    
    if (error.response) {
      // 服务器返回了错误响应
      if (error.response.data && error.response.data.error) {
        keystoreError.value = error.response.data.error;
      } else {
        keystoreError.value = `获取 keystore 信息失败：${error.response.status} ${error.response.statusText}`;
      }
    } else {
      // 网络错误或其他错误
      keystoreError.value = '获取 keystore 信息失败：' + error.message;
    }
    keystoreInfo.value = null;
  } finally {
    keystoreLoading.value = false;
  }
};

// 关闭 Keystore 信息对话框
const closeKeystoreDialog = () => {
  keystoreDialogVisible.value = false;
  keystoreInfo.value = null;
  keystoreError.value = '';
};

// 复制配置内容
const copyConfig = async () => {
  if (!viewingConfig.value?.content) return;
  
  try {
    await navigator.clipboard.writeText(viewingConfig.value.content);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败，请手动复制');
  }
};

// 删除配置
const deleteConfig = async (alias) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除品牌配置 "${alias}" 吗？此操作将删除整个配置目录，包括所有相关文件（index.ts、keystore、logo、证书等），且无法恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    );

    const response = await axios.delete(`/api/configs/${alias}`);
    ElMessage.success(response.data.message || '删除成功');
    loadConfigs(); // 重新加载列表
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 重新生成 Keystore
const regenerateKeystore = async (alias) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新生成品牌 "${alias}" 的 keystore 文件吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const response = await axios.post('/api/keystore', { alias });
    ElMessage.success(response.data.message || 'Keystore 生成成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('生成失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 生成 unipush 云函数
const generateUnipush = async (alias) => {
  try {
    await ElMessageBox.confirm(
      `确定要为品牌 "${alias}" 生成 unipush 云函数吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    );

    ElMessage.info('正在生成 unipush 云函数，请稍候...');
    const response = await axios.post(`/api/configs/${alias}/generate-unipush`);
    
    if (response.data && response.data.success) {
      ElMessage.success(response.data.message || 'unipush 云函数生成成功');
    } else {
      ElMessage.error(response.data?.error || '生成失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      const errorMsg = error.response?.data?.error || error.message;
      ElMessage.error('生成失败: ' + errorMsg);
      if (error.response?.data?.output) {
        console.error('命令输出:', error.response.data.output);
      }
    }
  }
};

// 显示云打包对话框
const showCloudBuildDialog = (alias, config) => {
  cloudBuildForm.value = {
    alias: alias,
    platform: 'android',
    environment: config.baseUrlRegion === 'test' ? 'test' : 'production',
    operation: 'cloudbuild',
    userVersionDesc: '',
    noIncrement: false
  };
  cloudBuildDialogVisible.value = true;
};

// 关闭云打包对话框
const closeCloudBuildDialog = () => {
  cloudBuildDialogVisible.value = false;
  cloudBuildForm.value = {
    alias: '',
    platform: 'android',
    environment: 'test',
    operation: 'cloudbuild',
    userVersionDesc: '',
    noIncrement: false
  };
  if (cloudBuildFormRef.value) {
    cloudBuildFormRef.value.resetFields();
  }
};

// 确认云打包
const confirmCloudBuild = async () => {
  if (!cloudBuildFormRef.value) return;
  
  try {
    await cloudBuildFormRef.value.validate();
    
    // 关闭配置对话框，打开进度对话框
    cloudBuildDialogVisible.value = false;
    cloudBuildProgressVisible.value = true;
    cloudBuildLoading.value = true;
    cloudBuildOutput.value = [];
    
    // 使用 fetch 接收流式响应
    const response = await fetch(`/api/configs/${cloudBuildForm.value.alias}/cloud-build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform: cloudBuildForm.value.platform,
        environment: cloudBuildForm.value.environment,
        operation: cloudBuildForm.value.operation,
        userVersionDesc: cloudBuildForm.value.userVersionDesc || '',
        noIncrement: cloudBuildForm.value.noIncrement
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'success') {
              cloudBuildLoading.value = false;
              ElMessage.success('云打包完成');
              // 解析输出并显示
              if (data.data.output) {
                const outputLines = data.data.output.split('\n');
                outputLines.forEach(text => {
                  if (text.trim()) {
                    cloudBuildOutput.value.push({ type: 'info', text });
                  }
                });
              }
            } else if (data.type === 'error') {
              cloudBuildLoading.value = false;
              ElMessage.error(data.data.message || '云打包失败');
              // 解析错误输出并显示
              if (data.data.errorOutput) {
                const errorLines = data.data.errorOutput.split('\n');
                errorLines.forEach(text => {
                  if (text.trim()) {
                    cloudBuildOutput.value.push({ type: 'error', text });
                  }
                });
              }
            } else if (data.type === 'output') {
              // 实时输出
              if (data.data.text) {
                cloudBuildOutput.value.push({ type: 'info', text: data.data.text });
                // 限制输出行数，避免内存溢出
                if (cloudBuildOutput.value.length > 1000) {
                  cloudBuildOutput.value = cloudBuildOutput.value.slice(-500);
                }
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    cloudBuildLoading.value = false;
    const errorMsg = error.message || '云打包失败';
    ElMessage.error('云打包失败: ' + errorMsg);
    cloudBuildOutput.value.push({ type: 'error', text: errorMsg });
  }
};

// 关闭云打包进度对话框
const closeCloudBuildProgress = () => {
  cloudBuildProgressVisible.value = false;
  cloudBuildOutput.value = [];
  cloudBuildLoading.value = false;
};

// 处理文件选择
const handleFileChange = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      
      // 尝试解析配置
      parseConfigFile(content);
    } catch (error) {
      importError.value = '文件读取失败: ' + error.message;
      importData.value = null;
    }
  };
  reader.readAsText(file.raw);
};

// 解析配置文件
const parseConfigFile = (content) => {
  try {
    importError.value = '';
    
    // 简单的正则解析，提取关键字段
    const aliasMatch = content.match(/aliasname:\s*['"]([^'"]+)['"]/);
    const appNameMatch = content.match(/app_name:\s*['"]([^'"]+)['"]/);
    const appEnNameMatch = content.match(/app_en_name:\s*['"]([^'"]+)['"]/);
    
    if (!aliasMatch) {
      importError.value = '无法解析 aliasname 字段';
      importPreview.value = '';
      return;
    }
    
    const alias = aliasMatch[1];
    const appName = appNameMatch ? appNameMatch[1] : '';
    const appEnName = appEnNameMatch ? appEnNameMatch[1] : '';
    
    importPreview.value = `解析到以下信息：
品牌别名: ${alias}
应用名称: ${appName}
应用英文名: ${appEnName}

将创建目录: appConfig/${alias}/`;
    
    // 保存解析的数据
    importData.value = {
      content,
      alias,
      appName,
      appEnName
    };
  } catch (error) {
    importError.value = '解析配置文件失败: ' + error.message;
    importPreview.value = '';
  }
};

// 确认导入
const confirmImport = async () => {
  if (!importData.value || importError.value || typeof importData.value === 'string') return;
  
  try {
    importing.value = true;
    
    const response = await axios.post('/api/configs/import', {
      content: importData.value.content,
      alias: importData.value.alias
    });
    
    ElMessage.success(response.data.message || '导入成功');
    cancelImport();
    loadConfigs();
  } catch (error) {
    ElMessage.error('导入失败: ' + (error.response?.data?.error || error.message));
  } finally {
    importing.value = false;
  }
};

// 取消导入
const cancelImport = () => {
  showImportDialog.value = false;
  uploadRef.value?.clearFiles();
  importData.value = null;
  importPreview.value = '';
  importError.value = '';
};

// 编辑配置
const editConfig = async (alias) => {
  try {
    const response = await axios.get(`/api/configs/${alias}?parse=true`);
    editingConfig.value = response.data;
    // 确保数值类型正确
    editingConfig.value.versionCode = parseInt(editingConfig.value.versionCode) || 1;
    editingConfig.value.iosVersionCode = parseInt(editingConfig.value.iosVersionCode) || 1;
    editingConfig.value.androidVersionCode = parseInt(editingConfig.value.androidVersionCode) || 1;
    
    // 根据 API 地区自动设置测试环境开关
    if (editingConfig.value.baseUrlRegion) {
      editingConfig.value.isTest = editingConfig.value.baseUrlRegion === 'test';
    }
    
    // 加载 logo
    try {
      const logoResponse = await axios.get(`/api/configs/${alias}/logo`);
      if (logoResponse.data.exists) {
        editLogoUrl.value = logoResponse.data.url;
        editLogoPreview.value = '';
      } else {
        editLogoUrl.value = '';
        editLogoPreview.value = '';
      }
    } catch (error) {
      editLogoUrl.value = '';
      editLogoPreview.value = '';
    }

    // 加载 P12 证书信息
    try {
      const p12Response = await axios.get(`/api/configs/${alias}/certificate/p12`);
      if (p12Response.data.exists) {
        editP12Exists.value = true;
        editP12FileName.value = p12Response.data.filename;
      } else {
        editP12Exists.value = false;
        editP12FileName.value = '';
      }
    } catch (error) {
      editP12Exists.value = false;
      editP12FileName.value = '';
    }

    // 加载 Mobileprovision 文件信息
    try {
      const mobileprovisionResponse = await axios.get(`/api/configs/${alias}/certificate/mobileprovision`);
      if (mobileprovisionResponse.data.exists) {
        editMobileprovisionExists.value = true;
        editMobileprovisionFileName.value = mobileprovisionResponse.data.filename;
      } else {
        editMobileprovisionExists.value = false;
        editMobileprovisionFileName.value = '';
      }
    } catch (error) {
      editMobileprovisionExists.value = false;
      editMobileprovisionFileName.value = '';
    }
    
    // 重置文件
    editLogoFile.value = null;
    editLogoUploadRef.value?.clearFiles();
    editP12File.value = null;
    editP12UploadRef.value?.clearFiles();
    editMobileprovisionFile.value = null;
    editMobileprovisionUploadRef.value?.clearFiles();
    
    editDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载配置失败: ' + (error.response?.data?.error || error.message));
  }
};

// 关闭编辑对话框
const closeEditDialog = () => {
  editDialogVisible.value = false;
  editingConfig.value = null;
  editLogoFile.value = null;
  editLogoPreview.value = '';
  editLogoUrl.value = '';
  editLogoUploadRef.value?.clearFiles();
  editP12File.value = null;
  editP12FileName.value = '';
  editP12Exists.value = false;
  editP12UploadRef.value?.clearFiles();
  editMobileprovisionFile.value = null;
  editMobileprovisionFileName.value = '';
  editMobileprovisionExists.value = false;
  editMobileprovisionUploadRef.value?.clearFiles();
};

// 处理编辑时的地区变化
const handleEditRegionChange = (value) => {
  // 根据 API 地区自动设置测试环境开关
  // 如果选择的是测试环境（test），则勾选测试环境开关；否则取消勾选
  if (editingConfig.value) {
    editingConfig.value.isTest = value === 'test';
  }
  
  // 设置对应的 iOS App Links 域名
  const selectedRegion = editRegionOptions.find(r => r.value === value);
  if (selectedRegion && selectedRegion.applinksDomain) {
    editingConfig.value.iosApplinksDomain = selectedRegion.applinksDomain;
  }
};

// 保存编辑的配置
const saveEditConfig = async () => {
  if (!editingConfig.value) return;
  
  try {
    updating.value = true;
    const response = await axios.put(`/api/configs/${editingConfig.value.alias}`, editingConfig.value);
    ElMessage.success(response.data.message || '配置更新成功');
    
    // 如果有新的 logo 文件，上传 logo
    if (editLogoFile.value) {
      try {
        const formDataLogo = new FormData();
        formDataLogo.append('logo', editLogoFile.value);
        await axios.post(`/api/configs/${editingConfig.value.alias}/logo`, formDataLogo, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        ElMessage.success('Logo 上传成功！');
      } catch (error) {
        ElMessage.warning('配置更新成功，但 Logo 上传失败：' + (error.response?.data?.error || error.message));
      }
    }

    // 如果有新的 P12 文件，上传证书
    if (editP12File.value) {
      try {
        const formDataP12 = new FormData();
        formDataP12.append('p12', editP12File.value);
        await axios.post(`/api/configs/${editingConfig.value.alias}/certificate/p12`, formDataP12, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        ElMessage.success('P12 证书上传成功！');
      } catch (error) {
        ElMessage.warning('配置更新成功，但 P12 证书上传失败：' + (error.response?.data?.error || error.message));
      }
    }

    // 如果有新的 Mobileprovision 文件，上传描述文件
    if (editMobileprovisionFile.value) {
      try {
        const formDataMobileprovision = new FormData();
        formDataMobileprovision.append('mobileprovision', editMobileprovisionFile.value);
        await axios.post(`/api/configs/${editingConfig.value.alias}/certificate/mobileprovision`, formDataMobileprovision, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        ElMessage.success('Mobileprovision 文件上传成功！');
      } catch (error) {
        ElMessage.warning('配置更新成功，但 Mobileprovision 文件上传失败：' + (error.response?.data?.error || error.message));
      }
    }
    
    closeEditDialog();
    loadConfigs();
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.response?.data?.error || error.message));
  } finally {
    updating.value = false;
  }
};

// 处理编辑时的 Logo 文件选择
const handleEditLogoChange = (file) => {
  // 验证文件类型
  if (file.raw.type !== 'image/png') {
    ElMessage.error('Logo 必须是 PNG 格式');
    editLogoUploadRef.value?.clearFiles();
    return;
  }

  // 验证文件尺寸
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      if (img.width !== 1024 || img.height !== 1024) {
        ElMessage.error(`Logo 尺寸必须是 1024x1024，当前尺寸：${img.width}x${img.height}`);
        editLogoUploadRef.value?.clearFiles();
        editLogoFile.value = null;
        editLogoPreview.value = '';
        return;
      }
      // 验证通过
      editLogoFile.value = file.raw;
      editLogoPreview.value = e.target.result;
      editLogoUrl.value = ''; // 清除旧 URL，显示新预览
    };
    img.onerror = () => {
      ElMessage.error('图片加载失败，请重新选择');
      editLogoUploadRef.value?.clearFiles();
      editLogoFile.value = null;
      editLogoPreview.value = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file.raw);
};

// 处理编辑时的 Logo 文件移除
const handleEditLogoRemove = () => {
  editLogoFile.value = null;
  editLogoPreview.value = '';
};

// 删除编辑时的 Logo
const deleteEditLogo = async () => {
  if (!editingConfig.value) return;
  
  try {
    await ElMessageBox.confirm(
      '确定要删除 Logo 吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`/api/configs/${editingConfig.value.alias}/logo`);
    editLogoFile.value = null;
    editLogoPreview.value = '';
    editLogoUrl.value = '';
    editLogoUploadRef.value?.clearFiles();
    ElMessage.success('Logo 删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 处理编辑时的 P12 文件选择
const handleEditP12Change = (file) => {
  if (!file.raw.name.toLowerCase().endsWith('.p12')) {
    ElMessage.error('文件必须是 .p12 格式');
    editP12UploadRef.value?.clearFiles();
    return;
  }
  editP12File.value = file.raw;
  editP12FileName.value = file.raw.name;
  editP12Exists.value = false; // 新上传的文件，清除已存在标记
};

// 处理编辑时的 P12 文件移除
const handleEditP12Remove = () => {
  editP12File.value = null;
  editP12FileName.value = '';
};

// 删除编辑时的 P12 证书
const deleteEditP12 = async () => {
  if (!editingConfig.value) return;
  
  try {
    await ElMessageBox.confirm(
      '确定要删除 P12 证书吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`/api/configs/${editingConfig.value.alias}/certificate/p12`);
    editP12File.value = null;
    editP12FileName.value = '';
    editP12Exists.value = false;
    editP12UploadRef.value?.clearFiles();
    ElMessage.success('P12 证书删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 处理编辑时的 Mobileprovision 文件选择
const handleEditMobileprovisionChange = (file) => {
  if (!file.raw.name.toLowerCase().endsWith('.mobileprovision')) {
    ElMessage.error('文件必须是 .mobileprovision 格式');
    editMobileprovisionUploadRef.value?.clearFiles();
    return;
  }
  editMobileprovisionFile.value = file.raw;
  editMobileprovisionFileName.value = file.raw.name;
  editMobileprovisionExists.value = false; // 新上传的文件，清除已存在标记
};

// 处理编辑时的 Mobileprovision 文件移除
const handleEditMobileprovisionRemove = () => {
  editMobileprovisionFile.value = null;
  editMobileprovisionFileName.value = '';
};

// 删除编辑时的 Mobileprovision 文件
const deleteEditMobileprovision = async () => {
  if (!editingConfig.value) return;
  
  try {
    await ElMessageBox.confirm(
      '确定要删除 Mobileprovision 文件吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`/api/configs/${editingConfig.value.alias}/certificate/mobileprovision`);
    editMobileprovisionFile.value = null;
    editMobileprovisionFileName.value = '';
    editMobileprovisionExists.value = false;
    editMobileprovisionUploadRef.value?.clearFiles();
    ElMessage.success('Mobileprovision 文件删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败，请手动复制');
  }
};

onMounted(() => {
  loadConfigs();
});

// 暴露方法供父组件调用
defineExpose({
  loadConfigs,
  viewConfig,
  editConfig
});
</script>

<style scoped>
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.form-tip .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.cloud-build-output {
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.output-content {
  white-space: pre-wrap;
  word-break: break-all;
}

.output-line {
  margin-bottom: 2px;
}

.output-line.error {
  color: #f48771;
}

.output-line.info {
  color: #d4d4d4;
}

.output-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  padding: 40px;
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.config-list {
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  color: #303133;
}

.config-content {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 500px;
  overflow-y: auto;
}

.import-preview {
  margin-top: 20px;
}

.import-preview h4 {
  margin-bottom: 10px;
  color: #303133;
}

.preview-code {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.edit-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

/* 新增样式 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.config-card {
  transition: transform 0.2s;
}

.config-card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-info h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.card-content {
  padding: 10px 0;
}

.logo-section {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  min-height: 120px;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 10px;
}

.logo-image {
  max-width: 100%;
  max-height: 100px;
  object-fit: contain;
  border-radius: 4px;
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
  gap: 8px;
}

.logo-placeholder .el-icon {
  font-size: 32px;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
  width: 120px;
}

:deep(.el-descriptions__content) {
  word-break: break-word;
}

@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar {
    width: 100%;
    flex-direction: column;
  }

  .search-bar .el-input,
  .search-bar .el-select {
    width: 100% !important;
  }

  .view-controls {
    width: 100%;
    justify-content: space-between;
  }
}
</style>


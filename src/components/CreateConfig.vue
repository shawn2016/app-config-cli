<template>
  <div class="create-config">
    <el-steps :active="currentStep" finish-status="success" align-center>
      <el-step title="基础信息" />
      <el-step title="环境配置" />
      <el-step title="其他配置" />
      <el-step title="预览确认" />
    </el-steps>
    
    <!-- 后续步骤提示 -->
    <el-alert
      v-if="currentStep === 3"
      title="创建配置后的后续步骤"
      type="warning"
      :closable="false"
      show-icon
      style="margin: 20px 0;"
    >
      <template #default>
        <div style="line-height: 2;">
          <p style="margin: 0 0 10px 0; font-weight: 500;">配置创建成功后，还需要完成以下步骤：</p>
          <ol style="margin: 0; padding-left: 20px;">
            <li>
              <strong>生成 uni-app 应用</strong>：在 
              <el-link
                href="https://dev.dcloud.net.cn/pages/app/list"
                target="_blank"
                type="primary"
                style="margin: 0 4px"
              >
                DCloud 开发者中心
              </el-link>
              创建 uni-app 应用
            </li>
            <li>
              <strong>开通 UniPush</strong>：在 DCloud 开发者中心开通 UniPush 推送服务
            </li>
            <li>
              <strong>生成 App Links</strong>：在配置列表页面点击"生成 applinks"按钮
              <br>
              <span style="color: #909399; font-size: 12px; margin-left: 20px;">
                （生成成功后需要前往 
                <el-link
                  href="https://saturn.restosuite.cn/metadata-project?metadata-project=/metadata/project/P01JBB1TJ7D5YJW1KBSNS57FAPA/cicd&saturn-cicd=%2Fsaturn%2Fservice%2FP01JBB1TJ7D5YJW1KBSNS57FAPA%2FS01JZ825GTMG0SR7JS463A1B355%2Fdetail"
                  target="_blank"
                  type="primary"
                  style="margin: 0 4px"
                >
                  Saturn
                </el-link>
                构建）
              </span>
            </li>
            <li>
              <strong>生成云函数</strong>：在配置列表页面点击"生成 unipush 云函数"按钮
              <br>
              <span style="color: #909399; font-size: 12px; margin-left: 20px;">
                （生成成功后需要前往 
                <el-link
                  href="https://saturn.restosuite.cn/metadata-project?metadata-project=/metadata/project/P01JBB1TJ7D5YJW1KBSNS57FAPA/cicd&saturn-cicd=%2Fsaturn%2Fservice%2FP01JBB1TJ7D5YJW1KBSNS57FAPA%2FS01JZ825GTMG0SR7JS463A1B355%2Fdetail"
                  target="_blank"
                  type="primary"
                  style="margin: 0 4px"
                >
                  Saturn
                </el-link>
                构建）
              </span>
            </li>
          </ol>
          <p style="margin: 10px 0 0 0; color: #909399; font-size: 12px;">
            <el-icon><InfoFilled /></el-icon>
            详细操作步骤请参考
            <el-link
              href="https://restosuite.sg.larksuite.com/wiki/IwJBwRZ4FirwoJkiLHQlgo3ugYL?from=from_copylink"
              target="_blank"
              type="primary"
              style="margin: 0 4px"
            >
              开发参考文档
            </el-link>
          </p>
        </div>
      </template>
    </el-alert>

    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="150px"
      class="config-form"
    >
      <!-- 步骤 1: 基础信息 -->
      <div v-show="currentStep === 0" class="step-content">
        <h3>基础信息</h3>
        <el-form-item label="品牌别名" prop="alias">
          <el-input
            v-model="formData.alias"
            placeholder="请输入品牌别名（将作为文件夹名）"
            @blur="handleAliasBlur"
            :loading="aliasValidating"
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            将作为文件夹名，可使用大小写字母、数字和下划线。例如：mollytea、YiFang、app_123
          </div>
        </el-form-item>

        <el-form-item label="应用名称" prop="appName">
          <el-input v-model="formData.appName" placeholder="请输入应用名称" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            应用显示名称（中文），将显示在应用图标下方。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-form-item label="应用英文名" prop="appEnName">
          <el-input v-model="formData.appEnName" placeholder="请输入应用英文名" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            应用显示名称（英文），建议与 iOS CFBundleName 保持一致。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-form-item label="应用描述" prop="appDescription">
          <el-input
            v-model="formData.appDescription"
            type="textarea"
            :rows="3"
            placeholder="请输入应用描述"
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            应用的简短描述，用于应用商店展示
          </div>
        </el-form-item>

        <el-form-item label="DCloud App ID" prop="dcAppId">
          <el-input
            v-model="formData.dcAppId"
            placeholder="请输入 DCloud App ID，如：__UNI__41806F3"
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
            <div v-if="logoPreview" style="position: relative; display: inline-block;">
              <img 
                :src="logoPreview" 
                alt="Logo 预览" 
                style="width: 102px; height: 102px; border: 1px solid #dcdfe6; border-radius: 8px; object-fit: contain; background: #f5f7fa;"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                style="position: absolute; top: -8px; right: -8px;"
                @click="deleteLogoPreview"
                title="删除 Logo"
              />
            </div>
            <div v-else style="width: 102px; height: 102px; border: 1px dashed #dcdfe6; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #fafafa; color: #909399; font-size: 12px; text-align: center; padding: 10px;">
              暂无 Logo
            </div>
            <div style="flex: 1;">
              <el-upload
                ref="logoUploadRef"
                :auto-upload="false"
                :on-change="handleLogoChange"
                :on-remove="handleLogoRemove"
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

        <el-divider content-position="left">包名配置</el-divider>
        <el-form-item label="Android 包名" prop="packagename">
          <el-input v-model="formData.packagename" placeholder="如：ai.restosuite.mollytea">
            <template #append>
              <el-button @click="copyToClipboard(formData.packagename)">
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
            </template>
          </el-input>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            Android 包名，格式：ai.restosuite.别名。初始根据别名自动生成，生成后可手动修改。<strong style="color: #e6a23c;">打包时必填项</strong>
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

        <el-form-item label="iOS Bundle ID" prop="iosAppId">
          <el-input v-model="formData.iosAppId" placeholder="如：ai.restosuite.mollytea">
            <template #append>
              <el-button @click="copyToClipboard(formData.iosAppId)">
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
            </template>
          </el-input>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            iOS Bundle ID，格式：ai.restosuite.别名。初始根据别名自动生成，生成后可手动修改。<strong style="color: #e6a23c;">打包时必填项</strong>
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
      </div>

      <!-- 步骤 2: 环境配置 -->
      <div v-show="currentStep === 1" class="step-content">
        <h3>环境配置</h3>
        <el-form-item label="API 地区" prop="baseUrlRegion">
          <el-select 
            v-model="formData.baseUrlRegion" 
            placeholder="请选择 API 地区"
            @change="handleRegionChange"
          >
            <el-option 
              v-for="region in regionOptions" 
              :key="region.value"
              :label="region.label"
              :value="region.value"
            />
          </el-select>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            当前选择: {{ baseUrlPreview }} - API 基础地址，用于后端接口调用
          </div>
        </el-form-item>

        <el-form-item label="iOS App Links 域名" prop="iosApplinksDomain">
          <el-input
            v-model="formData.iosApplinksDomain"
            placeholder="将根据选择的 API 地区自动设置"
            readonly
            disabled
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            iOS App Links 域名，用于深度链接。格式：applinks:applinks.xxx.xxx。已根据选择的 API 地区自动匹配，不可手动修改
          </div>
        </el-form-item>
      </div>

      <!-- 步骤 3: 其他配置 -->
      <div v-show="currentStep === 2" class="step-content">
        <h3>其他配置</h3>
        
        <el-divider content-position="left">版本配置</el-divider>
        <el-form-item label="版本号" prop="versionName">
          <el-input v-model="formData.versionName" placeholder="1.0.0" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            版本名称，如 1.0.0，将显示给用户
          </div>
        </el-form-item>

        <el-form-item label="版本代码" prop="versionCode">
          <el-input-number v-model="formData.versionCode" :min="1" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            版本代码，保留原有字段以兼容性
          </div>
        </el-form-item>

        <el-form-item label="iOS 版本代码" prop="iosVersionCode">
          <el-input-number v-model="formData.iosVersionCode" :min="1" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            iOS 构建号，用于 App Store 版本管理
          </div>
        </el-form-item>

        <el-form-item label="Android 版本代码" prop="androidVersionCode">
          <el-input-number v-model="formData.androidVersionCode" :min="1" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            Android 构建号，每次发布需递增
          </div>
        </el-form-item>

        <el-divider content-position="left">基础配置</el-divider>
        <el-form-item label="默认语言" prop="locale">
          <el-select v-model="formData.locale">
            <el-option label="简体中文 (zh_CN)" value="zh_CN" />
            <el-option label="繁体中文 (zh_TW)" value="zh_TW" />
            <el-option label="English (en_US)" value="en_US" />
          </el-select>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            应用的默认语言设置
          </div>
        </el-form-item>

        <el-form-item label="iOS Team ID">
          <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <el-input v-model="formData.teamId" placeholder="如：NU8N6PC4M2" style="flex: 1;" />
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
                  src="/ios-teamid.jpg" 
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

        <el-divider content-position="left">企业配置</el-divider>
        <el-form-item label="集团 ID">
          <el-input v-model="formData.corporationId" placeholder="如：247" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            集团 ID，用于多品牌管理。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-form-item label="装修 ID">
          <el-input v-model="formData.extAppId" placeholder="如：1951103932717666313" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            装修 ID，用于应用主题和样式配置。<strong style="color: #e6a23c;">打包时必填项</strong>
          </div>
        </el-form-item>

        <el-divider content-position="left">App Store 配置</el-divider>
        <el-form-item label="iOS 下载链接">
          <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <el-input v-model="formData.iosDownloadUrl" placeholder="如：https://apps.apple.com/cn/app/molly-tea/id6749044844" style="flex: 1;" />
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
                  alt="iOS 下载链接使用说明" 
                  style="max-width: 100%; height: auto; border-radius: 4px; display: block;"
                />
              </div>
            </el-popover>
          </div>
          <div class="form-tip" style="color: #e6a23c; margin-top: 8px; display: block; width: 100%;">
            <el-icon><InfoFilled /></el-icon>
            <strong>上架后记得补齐</strong> - iOS App Store 下载链接，用于 App Association 配置。安卓下载链接会自动生成，无需添加。
          </div>
        </el-form-item>

        <el-form-item label="主题颜色">
          <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <el-input v-model="formData.themeColor" placeholder="#52a1ff" style="flex: 1;">
              <template #prepend>
                <el-color-picker v-model="formData.themeColor" />
              </template>
            </el-input>
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
                  alt="主题颜色使用说明" 
                  style="max-width: 100%; height: auto; border-radius: 4px; display: block;"
                />
              </div>
            </el-popover>
          </div>
          <div class="form-tip" style="margin-top: 8px; display: block; width: 100%;">
            <el-icon><InfoFilled /></el-icon>
            主题颜色，用于浏览器主题色设置，格式：十六进制颜色码
          </div>
        </el-form-item>

        <el-divider content-position="left">证书配置</el-divider>
        <el-form-item label="iOS 发布证书 (.p12)">
          <div style="display: flex; align-items: flex-start; gap: 20px;">
            <div v-if="p12File || p12FileName" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; border: 1px solid #dcdfe6;">
              <el-icon style="color: #67c23a;"><Document /></el-icon>
              <span style="font-size: 14px;">{{ p12FileName || 'app.p12' }}</span>
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="deleteP12File"
                title="删除证书"
              />
            </div>
            <div v-else style="padding: 8px 12px; background: #fafafa; border: 1px dashed #dcdfe6; border-radius: 4px; color: #909399; font-size: 14px;">
              暂无证书
            </div>
            <div style="flex: 1;">
              <el-upload
                ref="p12UploadRef"
                :auto-upload="false"
                :on-change="handleP12Change"
                :on-remove="handleP12Remove"
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
            <div v-if="mobileprovisionFile || mobileprovisionFileName" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; border: 1px solid #dcdfe6;">
              <el-icon style="color: #67c23a;"><Document /></el-icon>
              <span style="font-size: 14px;">{{ mobileprovisionFileName || 'app.mobileprovision' }}</span>
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="deleteMobileprovisionFile"
                title="删除描述文件"
              />
            </div>
            <div v-else style="padding: 8px 12px; background: #fafafa; border: 1px dashed #dcdfe6; border-radius: 4px; color: #909399; font-size: 14px;">
              暂无描述文件
            </div>
            <div style="flex: 1;">
              <el-upload
                ref="mobileprovisionUploadRef"
                :auto-upload="false"
                :on-change="handleMobileprovisionChange"
                :on-remove="handleMobileprovisionRemove"
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

        <el-divider content-position="left">功能开关</el-divider>
        <el-form-item label="功能开关">
          <el-checkbox v-model="formData.isSupportEnterprise">支持企业包</el-checkbox>
          <el-checkbox v-model="formData.isTest" disabled>测试环境</el-checkbox>
          <el-checkbox v-model="formData.isSupportHotUpdate">支持热更新</el-checkbox>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            功能开关配置：企业包（是否支持企业版）、热更新（是否支持代码热更新）。测试环境开关已与 API 地区绑定，选择测试环境时自动勾选，不可手动修改
          </div>
        </el-form-item>
      </div>

      <!-- 步骤 4: 预览确认 -->
      <div v-show="currentStep === 3" class="step-content">
        <h3>配置预览</h3>
        <el-alert
          title="请确认以下配置信息"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        />
        <el-card>
          <pre class="preview-code">{{ previewCode }}</pre>
        </el-card>
      </div>

      <!-- 按钮组 -->
      <div class="form-actions">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button
          v-if="currentStep < 3"
          type="primary"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 3"
          type="primary"
          :loading="submitting"
          @click="submitForm"
        >
          提交生成
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { InfoFilled, QuestionFilled, WarningFilled, DocumentCopy, Upload, Delete, Document } from '@element-plus/icons-vue';
import axios from 'axios';

const emit = defineEmits(['config-created']);

const formRef = ref(null);
const currentStep = ref(0);
const submitting = ref(false);
const aliasValidating = ref(false);
const aliasError = ref('');
const oldAlias = ref('');
const logoUploadRef = ref(null);
const logoFile = ref(null);
const logoPreview = ref('');
const p12UploadRef = ref(null);
const p12File = ref(null);
const p12FileName = ref('');
const mobileprovisionUploadRef = ref(null);
const mobileprovisionFile = ref(null);
const mobileprovisionFileName = ref('');

const formData = reactive({
  alias: '',
  appName: '',
  appEnName: '',
  appDescription: '',
  dcAppId: '',
  baseUrlRegion: 'test',
  iosApplinksDomain: '',
  packagename: '',
  iosAppId: '',
  versionName: '1.0.0',
  versionCode: 1,
  iosVersionCode: 1,
  androidVersionCode: 1,
  locale: 'zh_CN',
  teamId: '',
  corporationId: '',
  extAppId: '',
  iosDownloadUrl: '',
  themeColor: '#52a1ff',
  isSupportEnterprise: false,
  isTest: false,
  isSupportHotUpdate: false
});

// API 地区选项（带域名显示）
const regionOptions = [
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

// iOS App Links 域名预设列表（按地区分组）
const iosApplinksDomainMap = {
  us: 'https://applinks.us.restosuite.ai',
  sea: 'https://applinks.sea.restosuite.ai',
  eu: 'https://applinks.eu.restosuite.ai',
  test: 'https://applinks.test.restosuite.cn'
};

// 自定义别名校验函数
const validateAliasExists = async (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入品牌别名'));
    return;
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    callback(new Error('只能包含大小写字母、数字和下划线'));
    return;
  }

  // 检查别名是否已存在
  try {
    aliasValidating.value = true;
    await axios.get(`/api/configs/${value}`);
    // 如果请求成功，说明别名已存在
    const errorMsg = `品牌别名 "${value}" 已存在，请使用其他别名`;
    callback(new Error(errorMsg));
  } catch (error) {
    if (error.response?.status === 404) {
      // 404 说明别名不存在，可以使用
      callback();
    } else {
      // 其他错误
      const errorMsg = '校验失败，请稍后重试';
      callback(new Error(errorMsg));
    }
  } finally {
    aliasValidating.value = false;
  }
};

const rules = {
  alias: [
    { required: true, message: '请输入品牌别名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含大小写字母、数字和下划线', trigger: 'blur' },
    { validator: validateAliasExists, trigger: 'blur' }
  ],
  baseUrlRegion: [{ required: true, message: '请选择 API 地区', trigger: 'change' }]
};

// 计算属性：Base URL 预览
const baseUrlPreview = computed(() => {
  const urlMap = {
    us: 'https://m.us.restosuite.ai',
    sea: 'https://m.sea.restosuite.ai',
    eu: 'https://m.eu.restosuite.ai',
    test: 'https://m.test.restosuite.cn'
  };
  return urlMap[formData.baseUrlRegion] || '';
});


// 处理地区变化，自动设置对应的 iOS App Links 域名和测试环境开关
const handleRegionChange = (value) => {
  const selectedRegion = regionOptions.find(r => r.value === value);
  if (selectedRegion && selectedRegion.applinksDomain) {
    formData.iosApplinksDomain = selectedRegion.applinksDomain;
  }
  // 根据 API 地区自动设置测试环境开关
  // 如果选择的是测试环境（test），则勾选测试环境开关；否则取消勾选
  formData.isTest = value === 'test';
};

// 初始化时设置默认的 iOS App Links 域名和测试环境开关
onMounted(() => {
  if (formData.baseUrlRegion) {
    if (!formData.iosApplinksDomain) {
      handleRegionChange(formData.baseUrlRegion);
    } else {
      // 如果已经有 iOS App Links 域名，也要同步测试环境开关
      formData.isTest = formData.baseUrlRegion === 'test';
    }
  }
});


// 将字符串转换为驼峰命名
const toCamelCase = (str) => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
};

// 生成预览代码
const previewCode = computed(() => {
  const alias = formData.alias;
  const aliasCamel = toCamelCase(alias);
  
  return `import type { BrandConfig } from '../types'

const config: BrandConfig = {
  // ===== 版本配置 =====
  versionCode: '${formData.versionCode}', // 保留原有字段以兼容性
  iosVersionCode: '${formData.iosVersionCode}', // iOS 构建号
  androidVersionCode: '${formData.androidVersionCode}', // Android 构建号
  versionName: '${formData.versionName}', // 版本名称，如 1.0.0

  // ===== 应用基础信息 =====
  app_name: '${formData.appName}', // 应用显示名称（中文）
  app_en_name: '${formData.appEnName}', // 应用显示名称（英文）
  app_description: '${formData.appDescription || ''}', // 应用描述
  dc_appId: '${formData.dcAppId || ''}', // DCloud App ID，请前往 https://dev.dcloud.net.cn/pages/app/list 创建后补充
  packagename: '${formData.packagename || `ai.restosuite.${alias}`}', // Android 包名
  aliasname: '${alias}', // 品牌别名，用于文件夹命名
  iosAppId: '${formData.iosAppId || `ai.restosuite.${alias}`}', // iOS Bundle ID
  CFBundleName: '${formData.appEnName}', // iOS Bundle 显示名称，建议与 app_en_name 一致
  teamId: '${formData.teamId || ''}'${formData.teamId ? '' : ', // 请补充团队 ID'}, // iOS 开发团队 ID

  // ===== 签名配置 =====
  keystore: '../appConfig/${alias}/${alias}.keystore', // Android 签名文件路径
  password: '123456', // keystore 密码

  // ===== URL配置 =====
  VITE_BASE_URL: '${baseUrlPreview.value}', // API 基础地址
  ios_applinks_domain: '${formData.iosApplinksDomain || ''}', // iOS App Links 域名，用于深度链接
  appLinksuffix: 'Restosuite${aliasCamel}', // App Links 后缀，请在 m-app-association 项目新增一项，没有请申请项目权限

  // ===== 微信/支付宝配置 =====
  schemes: '${alias}', // URL Scheme，用于应用间跳转
  urlschemewhitelist: 'alipays', // URL Scheme 白名单，允许跳转的 Scheme
  urltypes: '${alias}', // URL Types，iOS 用于识别应用

  // ===== 企业配置 =====
  VITE_CORPORATIONID: '${formData.corporationId || ''}'${formData.corporationId ? '' : ', // 请补充集团 ID'}, // 集团 ID
  VITE_MP_APP_PLUS_EXTAPPID: '${formData.extAppId || ''}'${formData.extAppId ? '' : ', // 请补充装修 ID'}, // 装修 ID

  // ===== 国际化配置 =====
  locale: '${formData.locale}', // 默认语言，zh_CN(简体中文) / zh_TW(繁体中文) / en_US(英文)

  // ===== 设备配置 =====
  devices: 'iphone', // 支持的设备类型，iphone / ipad / universal

  // ===== 证书配置 =====
  certfile: '../appConfig/${alias}/certificate/prod/app.p12', // iOS 发布证书路径
  mobileprovision: '../appConfig/${alias}/certificate/prod/app.mobileprovision', // iOS 描述文件路径

  // ===== 蒲公英配置 =====
  pgyerApiKey: 'bfb4258d51ec656443252180367e20ff', // 蒲公英 API Key，用于内测分发

  // ===== 功能开关 =====
  isSupportEnterprise: ${formData.isSupportEnterprise}, // 是否支持企业包
  isTest: ${formData.isTest}, // 是否是测试环境
  isSupportHotUpdate: ${formData.isSupportHotUpdate}, // 是否支持热更新

  // ===== App Association 配置 =====
  iosDownloadUrl: '${formData.iosDownloadUrl || ''}', // iOS App Store 下载链接
  themeColor: '${formData.themeColor}', // 主题颜色，用于浏览器主题色设置
}

export default config`;
});

// 处理别名失去焦点
const handleAliasBlur = async () => {
  // 先验证别名
  await validateAlias();
  
  // 如果别名有效，且包名为空或未修改过，则自动生成包名
  if (formData.alias && !aliasError.value) {
    const defaultPackageName = `ai.restosuite.${formData.alias}`;
    const oldDefaultPackageName = oldAlias.value ? `ai.restosuite.${oldAlias.value}` : '';
    
    // 如果包名为空，或者是基于旧别名的默认格式（说明用户没有手动修改过），则更新
    if (!formData.packagename || (oldDefaultPackageName && formData.packagename === oldDefaultPackageName)) {
      formData.packagename = defaultPackageName;
    }
    if (!formData.iosAppId || (oldDefaultPackageName && formData.iosAppId === oldDefaultPackageName)) {
      formData.iosAppId = defaultPackageName;
    }
    // 更新旧别名记录
    oldAlias.value = formData.alias;
  }
};

// 复制到剪贴板
const copyToClipboard = async (text) => {
  if (!text) {
    ElMessage.warning('内容为空，无法复制');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败，请手动复制');
  }
};

// 处理 Logo 文件选择
const handleLogoChange = (file) => {
  // 验证文件类型
  if (file.raw.type !== 'image/png') {
    ElMessage.error('Logo 必须是 PNG 格式');
    logoUploadRef.value?.clearFiles();
    return;
  }

  // 验证文件尺寸
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      if (img.width !== 1024 || img.height !== 1024) {
        ElMessage.error(`Logo 尺寸必须是 1024x1024，当前尺寸：${img.width}x${img.height}`);
        logoUploadRef.value?.clearFiles();
        logoFile.value = null;
        logoPreview.value = '';
        return;
      }
      // 验证通过
      logoFile.value = file.raw;
      logoPreview.value = e.target.result;
    };
    img.onerror = () => {
      ElMessage.error('图片加载失败，请重新选择');
      logoUploadRef.value?.clearFiles();
      logoFile.value = null;
      logoPreview.value = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file.raw);
};

// 处理 Logo 文件移除
const handleLogoRemove = () => {
  logoFile.value = null;
  logoPreview.value = '';
};

// 删除 Logo 预览
const deleteLogoPreview = () => {
  logoFile.value = null;
  logoPreview.value = '';
  logoUploadRef.value?.clearFiles();
};

// 处理 P12 文件选择
const handleP12Change = (file) => {
  // 验证文件类型
  if (!file.raw.name.toLowerCase().endsWith('.p12')) {
    ElMessage.error('文件必须是 .p12 格式');
    p12UploadRef.value?.clearFiles();
    return;
  }
  p12File.value = file.raw;
  p12FileName.value = file.raw.name;
};

// 处理 P12 文件移除
const handleP12Remove = () => {
  p12File.value = null;
  p12FileName.value = '';
};

// 删除 P12 文件
const deleteP12File = () => {
  p12File.value = null;
  p12FileName.value = '';
  p12UploadRef.value?.clearFiles();
};

// 处理 Mobileprovision 文件选择
const handleMobileprovisionChange = (file) => {
  // 验证文件类型
  if (!file.raw.name.toLowerCase().endsWith('.mobileprovision')) {
    ElMessage.error('文件必须是 .mobileprovision 格式');
    mobileprovisionUploadRef.value?.clearFiles();
    return;
  }
  mobileprovisionFile.value = file.raw;
  mobileprovisionFileName.value = file.raw.name;
};

// 处理 Mobileprovision 文件移除
const handleMobileprovisionRemove = () => {
  mobileprovisionFile.value = null;
  mobileprovisionFileName.value = '';
};

// 删除 Mobileprovision 文件
const deleteMobileprovisionFile = () => {
  mobileprovisionFile.value = null;
  mobileprovisionFileName.value = '';
  mobileprovisionUploadRef.value?.clearFiles();
};

// 校验别名是否存在
const validateAlias = async () => {
  if (!formData.alias) {
    return;
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(formData.alias)) {
    return;
  }

  try {
    aliasValidating.value = true;
    aliasError.value = '';
    await axios.get(`/api/configs/${formData.alias}`);
    // 如果请求成功，说明别名已存在
    aliasError.value = `品牌别名 "${formData.alias}" 已存在，请使用其他别名`;
  } catch (error) {
    if (error.response?.status === 404) {
      // 404 说明别名不存在，可以使用
      aliasError.value = '';
    } else {
      // 其他错误
      aliasError.value = '校验失败，请稍后重试';
    }
  } finally {
    aliasValidating.value = false;
  }
};

const nextStep = async () => {
  if (currentStep.value === 0) {
    // 验证第一步
    try {
      await formRef.value.validateField(['alias']);
      currentStep.value++;
    } catch (error) {
      ElMessage.error('请填写品牌别名');
    }
  } else if (currentStep.value === 1) {
    // 验证第二步
    try {
      await formRef.value.validateField(['baseUrlRegion']);
      currentStep.value++;
    } catch (error) {
      ElMessage.error('请选择 API 地区');
    }
  } else {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const submitForm = async () => {
  try {
    submitting.value = true;
    const response = await axios.post('/api/configs', formData);
    ElMessage.success(response.data.message || '配置创建成功！');
    
    // 如果有 logo 文件，上传 logo
    if (logoFile.value) {
      try {
        const formDataLogo = new FormData();
        formDataLogo.append('logo', logoFile.value);
        await axios.post(`/api/configs/${formData.alias}/logo`, formDataLogo, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        ElMessage.success('Logo 上传成功！');
      } catch (error) {
        ElMessage.warning('配置创建成功，但 Logo 上传失败：' + (error.response?.data?.error || error.message));
      }
    }

    // 如果有 P12 文件，上传证书
    if (p12File.value) {
      try {
        const formDataP12 = new FormData();
        formDataP12.append('p12', p12File.value);
        await axios.post(`/api/configs/${formData.alias}/certificate/p12`, formDataP12, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        ElMessage.success('P12 证书上传成功！');
      } catch (error) {
        ElMessage.warning('配置创建成功，但 P12 证书上传失败：' + (error.response?.data?.error || error.message));
      }
    }

    // 如果有 Mobileprovision 文件，上传描述文件
    if (mobileprovisionFile.value) {
      try {
        const formDataMobileprovision = new FormData();
        formDataMobileprovision.append('mobileprovision', mobileprovisionFile.value);
        await axios.post(`/api/configs/${formData.alias}/certificate/mobileprovision`, formDataMobileprovision, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        ElMessage.success('Mobileprovision 文件上传成功！');
      } catch (error) {
        ElMessage.warning('配置创建成功，但 Mobileprovision 文件上传失败：' + (error.response?.data?.error || error.message));
      }
    }
    
    // 重置表单
    Object.assign(formData, {
      alias: '',
      appName: '',
      appEnName: '',
      appDescription: '',
      dcAppId: '',
      baseUrlRegion: 'test',
      iosApplinksDomain: '',
      packagename: '',
      iosAppId: '',
      versionName: '1.0.0',
      versionCode: 1,
      iosVersionCode: 1,
      androidVersionCode: 1,
      locale: 'zh_CN',
      teamId: '',
      corporationId: '',
      extAppId: '',
      iosDownloadUrl: '',
      themeColor: '#52a1ff',
      isSupportEnterprise: false,
      isTest: false,
      isSupportHotUpdate: false
    });
    // 清除 logo
    logoFile.value = null;
    logoPreview.value = '';
    logoUploadRef.value?.clearFiles();
    // 清除证书文件
    p12File.value = null;
    p12FileName.value = '';
    p12UploadRef.value?.clearFiles();
    mobileprovisionFile.value = null;
    mobileprovisionFileName.value = '';
    mobileprovisionUploadRef.value?.clearFiles();
    currentStep.value = 0;
    formRef.value?.resetFields();
    
    // 通知父组件配置已创建，触发列表刷新
    emit('config-created');
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '创建配置失败，请重试');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.create-config {
  padding: 20px;
}

.config-form {
  margin-top: 40px;
  max-width: 800px;
}

.step-content {
  min-height: 400px;
  padding: 20px 0;
}

.step-content h3 {
  margin-bottom: 20px;
  color: #303133;
  font-size: 18px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-tip .el-icon {
  font-size: 14px;
  color: #409eff;
}

.hover-icon:hover {
  color: #409eff !important;
  transition: color 0.3s;
}

.form-actions {
  margin-top: 30px;
  text-align: center;
}

.preview-code {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>


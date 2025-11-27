<template>
  <div class="environment-view">
    <div class="view-header">
      <h3>环境配置展示</h3>
      <div class="search-bar">
        <el-input
          v-model="searchText"
          placeholder="搜索品牌名、应用名、英文名、环境等..."
          clearable
          style="width: 400px; margin-right: 10px;"
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
          style="width: 150px;"
          @change="handleSearch"
        >
          <el-option label="全部" value="" />
          <el-option label="美国 (US)" value="us" />
          <el-option label="东南亚 (SEA)" value="sea" />
          <el-option label="欧洲 (EU)" value="eu" />
          <el-option label="测试环境 (TEST)" value="test" />
        </el-select>
      </div>
    </div>

    <div v-loading="loading" class="config-grid">
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
          <div class="logo-section">
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
            <el-descriptions-item label="应用名称">
              {{ config.appName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="应用英文名">
              {{ config.appEnName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="描述">
              {{ config.appDescription || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="DCloud App ID">
              {{ config.dcAppId || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="环境">
              <el-tag
                v-if="config.baseUrlRegion"
                :type="getRegionTagType(config.baseUrlRegion)"
                size="small"
              >
                {{ getRegionLabel(config.baseUrlRegion) }}
              </el-tag>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(config.createdAt) }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- 操作按钮 -->
          <div class="card-actions">
            <el-button type="primary" link @click="viewConfig(config.folderName || config.alias)">
              查看详情
            </el-button>
            <el-button type="warning" link @click="editConfig(config.folderName || config.alias)">
              编辑
            </el-button>
          </div>
        </div>
      </el-card>

      <el-empty
        v-if="!loading && filteredConfigs.length === 0"
        description="暂无配置或未找到匹配的配置"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Picture } from '@element-plus/icons-vue';
import axios from 'axios';

const emit = defineEmits(['view-config', 'edit-config']);

const loading = ref(false);
const configs = ref([]);
const searchText = ref('');
const filterRegion = ref('');

// 环境选项
const regionOptions = [
  { label: '美国 (US)', value: 'us' },
  { label: '东南亚 (SEA)', value: 'sea' },
  { label: '欧洲 (EU)', value: 'eu' },
  { label: '测试环境 (TEST)', value: 'test' }
];

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

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
};

// 处理搜索
const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
};

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.style.display = 'none';
  const placeholder = event.target.nextElementSibling;
  if (placeholder) {
    placeholder.style.display = 'flex';
  }
};

// 查看配置
const viewConfig = (identifier) => {
  // 触发父组件事件，切换到列表页并查看配置
  emit('view-config', identifier);
};

// 编辑配置
const editConfig = (identifier) => {
  // 触发父组件事件，切换到列表页并编辑配置
  emit('edit-config', identifier);
};

// 加载配置列表
const loadConfigs = async () => {
  try {
    loading.value = true;
    const response = await axios.get('/api/configs');
    configs.value = response.data || [];
  } catch (error) {
    ElMessage.error('加载配置列表失败: ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
};

// 暴露方法供父组件调用
defineExpose({
  loadConfigs
});

onMounted(() => {
  loadConfigs();
});
</script>

<style scoped>
.environment-view {
  padding: 20px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.search-bar {
  display: flex;
  align-items: center;
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
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
  width: 100px;
}

:deep(.el-descriptions__content) {
  word-break: break-word;
}

@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }

  .view-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .search-bar {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }

  .search-bar .el-input {
    width: 100% !important;
  }

  .search-bar .el-select {
    width: 100% !important;
  }
}
</style>


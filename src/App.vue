<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <h1>App Config 配置管理</h1>
    </el-header>
    <el-main class="app-main">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="创建新配置" name="create">
          <CreateConfig @config-created="handleConfigCreated" />
        </el-tab-pane>
        <el-tab-pane label="查看已有配置" name="list">
          <ConfigList ref="configListRef" />
        </el-tab-pane>
        <el-tab-pane label="环境展示" name="environment">
          <EnvironmentView
            ref="environmentViewRef"
            @view-config="handleViewConfig"
            @edit-config="handleEditConfig"
          />
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import CreateConfig from './components/CreateConfig.vue';
import ConfigList from './components/ConfigList.vue';
import EnvironmentView from './components/EnvironmentView.vue';

const activeTab = ref('create');
const configListRef = ref(null);
const environmentViewRef = ref(null);

const handleTabChange = (name) => {
  // 切换标签页时的处理
  nextTick(() => {
    if (name === 'list' && configListRef.value && configListRef.value.loadConfigs) {
      configListRef.value.loadConfigs();
    } else if (name === 'environment' && environmentViewRef.value && environmentViewRef.value.loadConfigs) {
      environmentViewRef.value.loadConfigs();
    }
  });
};

const handleConfigCreated = () => {
  // 配置创建成功后，切换到列表页并刷新
  activeTab.value = 'list';
  nextTick(() => {
    if (configListRef.value && configListRef.value.loadConfigs) {
      configListRef.value.loadConfigs();
    }
  });
};

const handleViewConfig = (identifier) => {
  // 切换到列表页并查看配置
  activeTab.value = 'list';
  nextTick(() => {
    if (configListRef.value && configListRef.value.viewConfig) {
      configListRef.value.viewConfig(identifier);
    }
  });
};

const handleEditConfig = (identifier) => {
  // 切换到列表页并编辑配置
  activeTab.value = 'list';
  nextTick(() => {
    if (configListRef.value && configListRef.value.editConfig) {
      configListRef.value.editConfig(identifier);
    }
  });
};
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.app-header {
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: white;
  min-height: calc(100vh - 60px);
}

:deep(.el-tabs__header) {
  margin-bottom: 20px;
}
</style>


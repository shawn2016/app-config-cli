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
      </el-tabs>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import CreateConfig from './components/CreateConfig.vue';
import ConfigList from './components/ConfigList.vue';

const activeTab = ref('create');
const configListRef = ref(null);

const handleTabChange = (name) => {
  // 切换标签页时的处理
  nextTick(() => {
    if (name === 'list' && configListRef.value && configListRef.value.loadConfigs) {
      configListRef.value.loadConfigs();
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


<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <h1>
        商户app 工具
        <span style="font-size: 14px; font-weight: normal; margin-left: 8px; opacity: 0.8;">（{{ appVersion }}）</span>
      </h1>
      <div class="user-info">
        <el-tag :type="userRole === 'developer' ? 'success' : 'info'">
          {{ userRole === 'developer' ? '开发人员' : '测试人员' }}
        </el-tag>
        <el-button type="text" @click="showRoleDialog = true" style="color: white; margin-left: 10px;">
          切换身份
        </el-button>
      </div>
    </el-header>
    <el-main class="app-main">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane v-if="userRole === 'developer'" label="新建应用" name="create">
          <CreateConfig @config-created="handleConfigCreated" />
        </el-tab-pane>
        <el-tab-pane label="应用列表" name="list">
          <ConfigList ref="configListRef" :user-role="userRole" />
        </el-tab-pane>
      </el-tabs>
    </el-main>

    <!-- 身份选择对话框 -->
    <el-dialog
      v-model="showRoleDialog"
      title="选择身份"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      align-center
    >
      <div class="role-selection">
        <div 
          class="role-card" 
          :class="{ active: selectedRole === 'developer' }"
          @click="selectedRole = 'developer'"
        >
          <div class="role-icon developer-icon">
            <el-icon :size="40"><User /></el-icon>
          </div>
          <div class="role-content">
            <div class="role-title">开发人员</div>
            <div class="role-desc">可以创建、编辑、删除配置，查看密钥，生成云函数等所有操作</div>
          </div>
          <div class="role-check">
            <el-icon v-if="selectedRole === 'developer'" :size="24" color="#409eff"><Check /></el-icon>
          </div>
        </div>
        
        <div 
          class="role-card" 
          :class="{ active: selectedRole === 'tester' }"
          @click="selectedRole = 'tester'"
        >
          <div class="role-icon tester-icon">
            <el-icon :size="40"><Monitor /></el-icon>
          </div>
          <div class="role-content">
            <div class="role-title">测试人员</div>
            <div class="role-desc">只能进行云打包操作</div>
          </div>
          <div class="role-check">
            <el-icon v-if="selectedRole === 'tester'" :size="24" color="#409eff"><Check /></el-icon>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="confirmRole" size="large" style="width: 100%;">确定</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { User, Monitor, Check } from '@element-plus/icons-vue';
import CreateConfig from './components/CreateConfig.vue';
import ConfigList from './components/ConfigList.vue';
import axios from 'axios';

const activeTab = ref('list');
const configListRef = ref(null);
const userRole = ref('developer'); // 'developer' 或 'tester'
const showRoleDialog = ref(false);
const selectedRole = ref('developer');
const appVersion = ref('1.0.7'); // 默认版本号

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

// 确认身份选择
const confirmRole = () => {
  userRole.value = selectedRole.value;
  localStorage.setItem('userRole', selectedRole.value);
  showRoleDialog.value = false;
  
  // 如果是测试人员，确保在列表页
  if (userRole.value === 'tester') {
    activeTab.value = 'list';
  }
};

// 初始化身份
const initRole = () => {
  const savedRole = localStorage.getItem('userRole');
  if (savedRole === 'developer' || savedRole === 'tester') {
    userRole.value = savedRole;
    selectedRole.value = savedRole;
  } else {
    // 如果没有保存的身份，显示选择对话框
    showRoleDialog.value = true;
  }
  
  // 如果是测试人员，确保在列表页
  if (userRole.value === 'tester') {
    activeTab.value = 'list';
  }
};

// 获取应用版本号
const loadAppVersion = async () => {
  try {
    const response = await axios.get('/api/version');
    if (response.data && response.data.version) {
      appVersion.value = response.data.version;
    }
  } catch (error) {
    console.warn('获取版本号失败，使用默认版本号:', error);
  }
};

// 页面加载时初始化身份
onMounted(() => {
  initRole();
  loadAppVersion();
  nextTick(() => {
    if (configListRef.value && configListRef.value.loadConfigs) {
      configListRef.value.loadConfigs();
    }
  });
});
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
  justify-content: space-between;
  padding: 0 20px;
}

.user-info {
  display: flex;
  align-items: center;
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

.role-selection {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 0;
}

.role-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 24px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
}

.role-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.role-card.active {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
}

.role-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  flex-shrink: 0;
}

.developer-icon {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.tester-icon {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.role-content {
  flex: 1;
  min-width: 0;
}

.role-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.role-card.active .role-title {
  color: #409eff;
}

.role-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.role-check {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 12px;
}
</style>


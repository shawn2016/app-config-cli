const fs = require('fs-extra');
const path = require('path');

// 获取 appConfig 目录路径（相对于项目根目录）
function getAppConfigDir() {
  // 直接在当前工作目录下查找 appConfig 目录
  // 用户应该在项目根目录执行 app-config serve 命令
  const appConfigPath = path.join(process.cwd(), 'appConfig');
  return appConfigPath;
}

function ensureAppConfigDir() {
  const appConfigDir = getAppConfigDir();
  if (!fs.existsSync(appConfigDir)) {
    fs.mkdirpSync(appConfigDir);
    console.log(`已创建 appConfig 目录: ${appConfigDir}`);
  }
  return appConfigDir;
}

// 将字符串转换为驼峰命名
function toCamelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
}

// 生成 base URL
function generateBaseUrl(region) {
  const urlMap = {
    us: 'https://m.us.restosuite.ai',
    sea: 'https://m.sea.restosuite.ai',
    eu: 'https://m.eu.restosuite.ai',
    test: 'https://m.test.restosuite.cn'
  };
  return urlMap[region] || urlMap.test;
}

// 获取项目路径（mp-eatwell 项目）
// 优先使用环境变量 MP_EATWELL_PATH，否则使用当前工作目录
function getProjectPath() {
  // 优先使用环境变量
  if (process.env.MP_EATWELL_PATH) {
    return process.env.MP_EATWELL_PATH;
  }
  
  // 否则使用当前工作目录（假设用户在项目目录下执行命令）
  return process.cwd();
}

module.exports = {
  getAppConfigDir,
  ensureAppConfigDir,
  toCamelCase,
  generateBaseUrl,
  getProjectPath
};


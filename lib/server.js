const express = require('express');
const path = require('path');
const cors = require('cors');
const open = require('open');
const chalk = require('chalk');
const fs = require('fs-extra');
const multer = require('multer');
const { getConfigs, createConfig, getConfigByAlias, generateKeystore, getKeystoreInfo, importConfig, updateConfig, deleteConfig, uploadLogo, deleteLogo, getLogo, uploadP12, deleteP12, getP12, uploadMobileprovision, deleteMobileprovision, getMobileprovision, generateUnipushCloudFunction, generateAppLinks, cloudBuild, cancelCloudBuild, updateVersion } = require('./api');
const { ensureAppConfigDir, getAppConfigDir } = require('./utils');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置 multer 用于文件上传（临时存储，不保存）
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 静态文件服务（前端构建后的文件）
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// 静态文件服务（appConfig 目录，用于访问 logo 等文件）
const appConfigDir = getAppConfigDir();
app.use('/appConfig', express.static(appConfigDir));

// API 路由
// 注意：更具体的路由要放在更通用的路由之前
app.get('/api/configs', getConfigs);
app.post('/api/configs', createConfig);
app.post('/api/keystore', generateKeystore);
app.post('/api/configs/import', importConfig);

// 证书相关路由（放在 /api/configs/:alias 之前，避免路由冲突）
app.post('/api/configs/:alias/certificate/p12', upload.single('p12'), uploadP12);
app.delete('/api/configs/:alias/certificate/p12', deleteP12);
app.get('/api/configs/:alias/certificate/p12', getP12);
app.post('/api/configs/:alias/certificate/mobileprovision', upload.single('mobileprovision'), uploadMobileprovision);
app.delete('/api/configs/:alias/certificate/mobileprovision', deleteMobileprovision);
app.get('/api/configs/:alias/certificate/mobileprovision', getMobileprovision);

// Logo 相关路由
app.post('/api/configs/:alias/logo', upload.single('logo'), uploadLogo);
app.delete('/api/configs/:alias/logo', deleteLogo);
app.get('/api/configs/:alias/logo', getLogo);

// Keystore 信息路由（放在 /api/configs/:alias 之前，避免路由冲突）
app.get('/api/configs/:alias/keystore', getKeystoreInfo);

// 生成 unipush 云函数路由（放在 /api/configs/:alias 之前，避免路由冲突）
app.post('/api/configs/:alias/generate-unipush', generateUnipushCloudFunction);

// 生成 applinks 路由（全局操作）
app.post('/api/generate-applinks', generateAppLinks);

// 更新版本号路由（放在 /api/configs/:alias 之前，避免路由冲突）
app.post('/api/configs/:alias/version', updateVersion);

// 云打包路由（放在 /api/configs/:alias 之前，避免路由冲突）
app.post('/api/configs/:alias/cloud-build', cloudBuild);
app.post('/api/configs/:alias/cloud-build/cancel', cancelCloudBuild);

// 通用配置路由（放在最后）
app.get('/api/configs/:alias', getConfigByAlias);
app.put('/api/configs/:alias', updateConfig);
app.delete('/api/configs/:alias', deleteConfig);

// 前端路由（SPA fallback）
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

let server = null;

// 检查端口是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
}

// 查找可用端口
async function findAvailablePort(startPort, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`无法找到可用端口，已尝试 ${maxAttempts} 个端口`);
}

async function startServer(port = 3000) {
  // 确保 appConfig 目录存在
  ensureAppConfigDir();
  
  // 检查 dist 目录是否存在
  if (!fs.existsSync(distPath)) {
    console.log(chalk.yellow('警告: dist 目录不存在，请先构建前端...'));
    console.log(chalk.blue('请先运行: npm run build'));
    console.log(chalk.blue('或者运行: npm install && npm run build'));
    process.exit(1);
  }
  
  try {
    let actualPort = port;
    
    // 检查初始端口是否可用
    const initialPortAvailable = await isPortAvailable(port);
    if (!initialPortAvailable) {
      console.log(chalk.yellow(`端口 ${port} 已被占用，正在查找可用端口...`));
      actualPort = await findAvailablePort(port);
      console.log(chalk.blue(`找到可用端口: ${actualPort}`));
    }
    
    server = app.listen(actualPort, () => {
      const url = `http://localhost:${actualPort}`;
      console.log(chalk.green(`✓ 服务已启动: ${url}`));
      if (actualPort !== port) {
        console.log(chalk.yellow(`  注意: 原端口 ${port} 被占用，已使用端口 ${actualPort}`));
      }
      console.log(chalk.blue('正在打开浏览器...'));
      
      // 延迟一下再打开浏览器，确保服务已完全启动
      setTimeout(() => {
        open(url).catch(err => {
          console.log(chalk.yellow(`无法自动打开浏览器，请手动访问: ${url}`));
        });
      }, 500);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // 如果启动时仍然被占用（可能是竞态条件），尝试下一个端口
        console.log(chalk.yellow(`端口 ${actualPort} 被占用，尝试下一个端口...`));
        if (server) {
          server.close();
        }
        // 递归尝试下一个端口
        startServer(actualPort + 1);
      } else {
        console.error(chalk.red(`服务器错误: ${err.message}`));
        process.exit(1);
      }
    });
  } catch (error) {
    console.error(chalk.red(`启动服务器失败: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { startServer };


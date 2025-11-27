const express = require('express');
const path = require('path');
const cors = require('cors');
const open = require('open');
const chalk = require('chalk');
const fs = require('fs-extra');
const multer = require('multer');
const { getConfigs, createConfig, getConfigByAlias, generateKeystore, getKeystoreInfo, importConfig, updateConfig, deleteConfig, uploadLogo, deleteLogo, getLogo, uploadP12, deleteP12, getP12, uploadMobileprovision, deleteMobileprovision, getMobileprovision } = require('./api');
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

// 通用配置路由（放在最后）
app.get('/api/configs/:alias', getConfigByAlias);
app.put('/api/configs/:alias', updateConfig);
app.delete('/api/configs/:alias', deleteConfig);

// 前端路由（SPA fallback）
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

let server = null;

function startServer(port = 3000) {
  // 确保 appConfig 目录存在
  ensureAppConfigDir();
  
  // 检查 dist 目录是否存在
  if (!fs.existsSync(distPath)) {
    console.log(chalk.yellow('警告: dist 目录不存在，请先构建前端...'));
    console.log(chalk.blue('请先运行: npm run build'));
    console.log(chalk.blue('或者运行: npm install && npm run build'));
    process.exit(1);
  }
  
  server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.green(`✓ 服务已启动: ${url}`));
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
      console.error(chalk.red(`错误: 端口 ${port} 已被占用，请使用 --port 指定其他端口`));
    } else {
      console.error(chalk.red(`服务器错误: ${err.message}`));
    }
    process.exit(1);
  });
}

module.exports = { startServer };


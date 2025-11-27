#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const { startServer } = require('../lib/server');

program
  .name('app-config')
  .description('可视化生成和管理 appConfig 品牌配置')
  .version('1.0.0');

program
  .command('serve')
  .description('启动本地服务并打开可视化页面')
  .option('-p, --port <port>', '指定端口号', '3000')
  .action((options) => {
    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(chalk.red('错误: 端口号必须是 1-65535 之间的数字'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`正在启动服务，端口: ${port}...`));
    startServer(port);
  });

program.parse();


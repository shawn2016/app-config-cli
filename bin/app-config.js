#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const { startServer } = require('../lib/server');
const packageJson = require('../package.json');

program
  .name('app-config')
  .description('可视化生成和管理 appConfig 品牌配置的 CLI 工具')
  .version(packageJson.version, '-v, --version', '显示版本号')
  .addHelpText('after', `
示例:
  $ app-config serve             启动服务（默认端口 3000）
  $ app-config serve --port 8080 启动服务并指定端口 8080
  $ app-config --version         显示版本号
  $ app-config --help            显示帮助信息

更新工具:
  $ npm install -g app-config-cli@latest

更多信息:
  详细使用说明请查看: https://github.com/your-repo/app-config-cli
  `);

program
  .command('serve')
  .description('启动本地服务并打开可视化页面')
  .option('-p, --port <port>', '指定端口号（默认: 3000）', '3000')
  .addHelpText('after', `
说明:
  启动 Web 服务，自动打开浏览器显示可视化配置界面。
  工具会在当前工作目录下查找或创建 appConfig 文件夹。

注意事项:
  - 请在项目根目录执行此命令
  - 确保当前目录有 appConfig 文件夹或允许创建
  - 首次使用需要先构建前端: npm run build
  `)
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


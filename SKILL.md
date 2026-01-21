# 商户app 工具 (app-config-cli) - 技术文档

## 项目概述

**商户app 工具** 是一个基于 Node.js 的 CLI 工具，提供可视化的 Web 界面，用于统一管理和生成 UniApp 多品牌应用的配置文件。该工具支持品牌配置管理、云打包、证书管理、App Links 生成等功能。

- **版本**: 1.0.24
- **许可证**: MIT
- **Node 版本要求**: >= 14.0.0

## 技术栈

### 后端技术
- **Node.js** - 运行时环境
- **Express** - Web 服务器框架
- **Commander.js** - CLI 命令行工具
- **Handlebars** - 模板引擎，用于生成配置文件
- **Multer** - 文件上传中间件
- **Sharp** - 图片处理库
- **Axios** - HTTP 客户端
- **fs-extra** - 增强的文件系统操作
- **pinyin-pro** - 中文转拼音库

### 前端技术
- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **Element Plus** - UI 组件库
- **@element-plus/icons-vue** - 图标库

### 其他工具
- **Chalk** - 终端彩色输出
- **Open** - 自动打开浏览器
- **CORS** - 跨域资源共享

## 项目结构

```
app-config-cli/
├── bin/                          # CLI 入口文件
│   └── app-config.js            # 命令行工具入口
├── lib/                          # 核心业务逻辑
│   ├── api.js                   # API 路由处理器
│   ├── generator.js             # 配置文件和 keystore 生成器
│   ├── server.js                # Express 服务器配置
│   ├── utils.js                 # 工具函数
│   └── PGYERAppUploader.js      # 蒲公英上传工具
├── src/                          # 前端源码
│   ├── App.vue                  # 主应用组件
│   ├── main.js                  # 前端入口
│   └── components/              # Vue 组件
├── dist/                         # 前端构建输出
├── public/                       # 静态资源
├── appConfig/                    # 品牌配置目录（运行时生成）
├── downloads/                    # 下载文件目录
├── templates/                    # 模板文件
├── package.json                  # 项目配置
├── vite.config.js               # Vite 配置
└── README.md                     # 项目说明

appConfig/ 目录结构（运行时生成）:
├── index.ts                      # 配置索引文件
├── types.ts                      # TypeScript 类型定义
└── {品牌别名}/
    ├── index.ts                 # 品牌配置文件
    ├── logo.png                 # 品牌 Logo
    ├── {品牌别名}.keystore      # Android 签名文件
    ├── certificate/             # iOS 证书目录
    │   ├── dev/                # 开发环境证书
    │   └── prod/               # 生产环境证书
    │       ├── app.p12
    │       └── app.mobileprovision
    └── other/                   # 其他配置文件
        ├── AuthKey_xxx.p8
        └── google-services.json
```

## 核心功能模块

### 1. CLI 命令行工具

**入口文件**: `bin/app-config.js`

支持的命令：
```bash
# 查看版本
app-config --version
app-config -v

# 查看帮助
app-config --help
app-config -h

# 启动服务
app-config serve [--port <端口号>]
```

**技术实现**:
- 使用 `Commander.js` 解析命令行参数
- 支持自定义端口号（默认 3000）
- 自动检测端口占用并查找可用端口
- 启动后自动打开浏览器

### 2. Express 服务器

**文件**: `lib/server.js`

**功能**:
- 提供 RESTful API 接口
- 静态文件服务（前端构建文件、appConfig 目录、downloads 目录）
- 文件上传处理（支持最大 500MB）
- SPA 路由支持

**端口管理**:
- 自动检测端口可用性
- 端口被占用时自动查找下一个可用端口
- 最多尝试 100 个端口

### 3. 品牌配置管理

**文件**: `lib/api.js`, `lib/generator.js`

#### 3.1 配置文件生成

使用 Handlebars 模板引擎生成 TypeScript 配置文件：

```typescript
// 生成的配置文件结构
interface BrandConfig {
  // 版本配置
  versionCode: string
  iosVersionCode: string
  androidVersionCode: string
  versionName: string
  
  // 应用基础信息
  app_name: string
  app_en_name: string
  app_description: string
  dc_appId: string
  packagename: string
  aliasname: string
  iosAppId: string
  CFBundleName: string
  teamId: string
  
  // 签名配置
  keystore: string
  password: string
  
  // URL 配置
  VITE_BASE_URL: string
  ios_applinks_domain: string
  appLinksuffix: string
  
  // 微信/支付宝配置
  schemes: string
  urlschemewhitelist: string
  urltypes: string
  
  // 企业配置
  VITE_CORPORATIONID: string
  VITE_MP_APP_PLUS_EXTAPPID: string
  
  // 国际化配置
  locale: string
  
  // 证书配置
  certfile: string
  mobileprovision: string
  
  // 功能开关
  isSupportEnterprise: boolean
  isTest: boolean
  isSupportHotUpdate: boolean
  isSupportAppSetting: boolean
  
  // 其他配置
  themeColor: string
  iosDownloadUrl: string
}
```

#### 3.2 Keystore 生成

使用 Java `keytool` 命令生成 Android 签名文件：

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore {alias}.keystore \
  -alias {alias} \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass 123456 \
  -keypass 123456 \
  -dname "CN=Restosuite, OU=Mobile, O=Restosuite, L=Beijing, ST=Beijing, C=CN"
```

#### 3.3 配置索引自动维护

工具会自动维护 `appConfig/index.ts` 文件，导出所有品牌配置：

```typescript
import type { BrandConfigMap } from './types'
import brand1 from './brand1'
import brand2 from './brand2'

const appConfigs: BrandConfigMap = {
  brand1,
  brand2,
}

export default appConfigs
```

### 4. 文件管理

#### 4.1 文件上传

支持的文件类型：
- **Logo**: PNG 格式图片
- **iOS 证书**: .p12 文件
- **iOS 描述文件**: .mobileprovision 文件
- **Android 签名**: .keystore 文件
- **其他文件**: AuthKey_xxx.p8, google-services.json 等

**技术实现**:
- 使用 Multer 中间件处理文件上传
- 内存存储模式（不保存临时文件）
- 文件大小限制：500MB
- 支持中文文件名（自动转换为拼音）

#### 4.2 中文文件名处理

使用 `pinyin-pro` 库将中文文件名转换为拼音：

```javascript
// 示例：测试文件.png -> ce-shi-wen-jian.png
function convertChineseToPinyin(filename) {
  // 分离文件名和扩展名
  // 检查是否包含中文字符
  // 逐字符转换：中文转拼音，其他字符保持不变
  // 清理多余的连字符
}
```

### 5. 云打包功能

**文件**: `lib/api.js`

#### 5.1 Git 分支管理

- 自动获取可用分支列表
- 支持切换分支（`git checkout`、`git pull`、`pnpm i`）
- 保存默认分支（按品牌+平台+环境组合）

#### 5.2 版本管理

- 自动递增构建号
- 支持自定义版本号
- 分别管理 iOS 和 Android 构建号

#### 5.3 云打包流程

1. 检查必填项（配置字段、证书文件）
2. 切换 Git 分支（可选）
3. 更新版本号
4. 设置环境变量（`BRAND`、`SKIP_CONFIRM`）
5. 执行云打包命令
6. 支持取消打包

### 6. App Links 生成

**功能**: 为所有品牌生成 iOS App Links 配置

**要求**:
- 品牌必须配置 `teamId`
- 品牌必须有 `logo.png` 文件

**生成内容**:
- Apple App Site Association 文件
- 深度链接配置

### 7. 云函数生成

**功能**: 生成 UniPush 云函数配置

**用途**: 支持 UniApp 推送通知功能

### 8. AAB 转 APK

**功能**: 将 Android App Bundle (.aab) 转换为 APK 文件

**技术实现**:
- 使用 Google 的 `bundletool-all.jar` 工具
- 自动使用品牌配置中的 keystore 签名
- 生成通用 APK（支持所有设备）

**工具位置**:
- 优先从 `appConfig/bundletool-all.jar` 查找
- 向后兼容：从 `lib/bundletool-all.jar` 查找

### 9. 蒲公英上传

**文件**: `lib/PGYERAppUploader.js`

**功能**: 将 APK/IPA/AAB 文件上传到蒲公英平台

**支持的功能**:
- 公开安装 / 密码安装
- 自定义更新说明
- 自定义 API Key
- AAB 文件自动转换为 APK 后上传

### 10. 用户角色管理

**角色类型**:
- **开发人员**: 拥有所有功能权限
  - 创建新应用
  - 编辑配置
  - 云打包
  - 生成 App Links
  - 生成云函数
  
- **测试人员**: 仅限云打包功能
  - 查看应用列表
  - 执行云打包
  - 配置显示字段

**技术实现**:
- 使用 localStorage 保存用户角色
- 前端根据角色动态显示/隐藏功能
- 首次使用时显示角色选择对话框

## API 接口

### 配置管理

```
GET    /api/configs                          # 获取所有品牌配置列表
POST   /api/configs                          # 创建新品牌配置
GET    /api/configs/:alias                   # 获取指定品牌配置
PUT    /api/configs/:alias                   # 更新品牌配置
DELETE /api/configs/:alias                   # 删除品牌配置
POST   /api/configs/import                   # 导入配置
```

### 文件管理

```
POST   /api/configs/:alias/logo              # 上传 Logo
DELETE /api/configs/:alias/logo              # 删除 Logo
GET    /api/configs/:alias/logo              # 获取 Logo 信息

POST   /api/configs/:alias/certificate/p12   # 上传 iOS 证书
DELETE /api/configs/:alias/certificate/p12   # 删除 iOS 证书
GET    /api/configs/:alias/certificate/p12   # 获取 iOS 证书信息

POST   /api/configs/:alias/certificate/mobileprovision  # 上传 iOS 描述文件
DELETE /api/configs/:alias/certificate/mobileprovision  # 删除 iOS 描述文件
GET    /api/configs/:alias/certificate/mobileprovision  # 获取 iOS 描述文件信息

POST   /api/configs/:alias/other             # 上传其他文件
DELETE /api/configs/:alias/other/:filename   # 删除其他文件
GET    /api/configs/:alias/other             # 获取其他文件列表
```

### Keystore 管理

```
POST   /api/keystore                         # 生成 keystore 文件
GET    /api/configs/:alias/keystore          # 获取 keystore 信息
```

### 云打包

```
GET    /api/configs/:alias/check-files       # 检查配置文件是否存在
GET    /api/configs/:alias/check-cloud-build # 检查云打包必填项
POST   /api/configs/:alias/version           # 更新版本号
POST   /api/configs/:alias/cloud-build       # 执行云打包
POST   /api/configs/:alias/cloud-build/cancel # 取消云打包
```

### Git 管理

```
GET    /api/git/branches                     # 获取 Git 分支列表
```

### 全局功能

```
POST   /api/generate-applinks                # 生成 App Links
POST   /api/generate-unipush                 # 生成云函数
GET    /api/version                          # 获取应用版本号
```

### AAB 转 APK

```
POST   /api/configs/:alias/convert-aab-to-apk # AAB 转 APK
DELETE /api/downloads/:filename              # 删除下载的 APK 文件
```

### 蒲公英上传

```
POST   /api/upload-pgyer                     # 上传到蒲公英
```

### 推送测试

```
POST   /api/configs/:alias/test-push         # 测试消息推送
```

## 工具函数

**文件**: `lib/utils.js`

### 核心工具函数

```javascript
// 获取 appConfig 目录路径
getAppConfigDir()

// 确保 appConfig 目录存在
ensureAppConfigDir()

// 获取项目根目录路径
getProjectPath()

// 将字符串转换为驼峰命名
toCamelCase(str)

// 根据地区生成 API 基础地址
generateBaseUrl(region)  // 'us' | 'sea' | 'eu' | 'test'
```

## 开发指南

### 本地开发

```bash
# 1. 克隆项目
git clone <repository-url>
cd app-config-cli

# 2. 安装依赖
npm install

# 3. 构建前端
npm run build

# 4. 启动开发服务器
npm run dev

# 5. 本地链接（全局使用）
npm link
```

### 构建和发布

```bash
# 构建前端
npm run build

# 发布到 npm（会自动执行 prepublishOnly 脚本）
npm publish
```

### 本地调试

```bash
# 链接到全局
npm link

# 在项目中使用
cd /path/to/your/project
app-config serve

# 取消链接
npm unlink -g app-config-cli

# 重新链接（快捷命令）
npm run reinstall
```

## 配置文件说明

### package.json 关键配置

```json
{
  "name": "app-config-cli",
  "version": "1.0.24",
  "main": "lib/index.js",
  "bin": {
    "app-config": "bin/app-config.js"
  },
  "scripts": {
    "dev": "vite build && node bin/app-config.js serve",
    "build": "vite build",
    "prepublishOnly": "npm run build"
  },
  "files": [
    "bin",
    "lib",
    "dist",
    "public",
    "README.md"
  ],
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### vite.config.js

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus']
        }
      }
    }
  }
})
```

## 依赖说明

### 生产依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| axios | ^1.6.0 | HTTP 客户端 |
| chalk | ^4.1.2 | 终端彩色输出 |
| commander | ^11.1.0 | CLI 命令行工具 |
| cors | ^2.8.5 | 跨域资源共享 |
| express | ^4.18.2 | Web 服务器框架 |
| form-data | ^4.0.5 | 表单数据处理 |
| fs-extra | ^11.2.0 | 增强的文件系统操作 |
| handlebars | ^4.7.8 | 模板引擎 |
| multer | ^1.4.5-lts.1 | 文件上传中间件 |
| open | ^8.4.2 | 自动打开浏览器 |
| pinyin-pro | ^3.27.0 | 中文转拼音 |
| sharp | ^0.32.6 | 图片处理 |

### 开发依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| @element-plus/icons-vue | ^2.3.1 | Element Plus 图标 |
| @vitejs/plugin-vue | ^4.5.0 | Vite Vue 插件 |
| element-plus | ^2.4.4 | UI 组件库 |
| vite | ^5.0.0 | 构建工具 |
| vue | ^3.3.4 | 前端框架 |

## 注意事项

### 1. 系统要求

- Node.js >= 14.0.0
- Java（用于生成 keystore）
- Git（用于云打包分支管理）

### 2. 工作目录

必须在项目根目录执行命令，工具会在当前目录查找/创建 `appConfig` 文件夹。

### 3. 证书文件

- iOS 证书需要手动上传
- Android keystore 可以自动生成
- keystore 密码固定为 `123456`

### 4. Git 分支管理

云打包时会自动切换分支，请确保本地没有未提交的重要更改。

### 5. 环境变量

云打包时通过环境变量传递品牌信息：
- `BRAND`: 品牌别名
- `SKIP_CONFIRM`: 跳过确认（设置为 `true`）

### 6. 端口占用

如果默认端口 3000 被占用，工具会自动查找下一个可用端口。

## 故障排查

### 云打包卡住

- 检查是否设置了环境变量 `BRAND`
- 确保 `SKIP_CONFIRM=true` 已设置
- 查看日志输出，确认卡在哪一步

### 无法切换分支

- 检查是否有本地未提交的更改
- 工具会自动执行 `git stash`，但建议提前提交或暂存更改

### 找不到配置文件

- 确认在项目根目录执行命令
- 检查 `appConfig` 文件夹是否存在
- 查看浏览器控制台错误信息

### Keystore 生成失败

- 确认系统已安装 Java
- 确认 `keytool` 命令可用
- 如果无法生成，会创建占位文件，需要手动生成

## 最佳实践

### 1. 品牌命名

- 使用小写字母和数字
- 避免使用特殊字符
- 使用有意义的别名（如 `dojo`、`yifang`）

### 2. 版本管理

- 遵循语义化版本规范（如 `1.0.0`）
- 每次打包前检查版本号
- 分别管理 iOS 和 Android 构建号

### 3. 证书管理

- 定期备份证书文件
- 记录证书有效期
- 使用统一的证书命名规范

### 4. Git 工作流

- 打包前提交本地更改
- 使用专门的打包分支
- 保存常用分支配置

### 5. 配置管理

- 定期导出配置备份
- 使用配置模板创建新品牌
- 保持配置字段的一致性

## 扩展开发

### 添加新的 API 接口

1. 在 `lib/api.js` 中添加处理函数
2. 在 `lib/server.js` 中注册路由
3. 在前端组件中调用 API

### 添加新的配置字段

1. 更新 `lib/generator.js` 中的模板
2. 更新 `appConfig/types.ts` 类型定义
3. 更新前端表单组件
4. 更新 API 处理逻辑

### 自定义文件处理

1. 在 `lib/api.js` 中添加文件处理函数
2. 使用 Multer 中间件处理上传
3. 使用 fs-extra 进行文件操作
4. 注意中文文件名处理

## 许可证

MIT License

## 技术支持

如有问题，请查看：
- 项目 README.md
- 使用说明.md
- 浏览器控制台错误信息
- 终端日志输出

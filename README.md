# app-config-cli

可视化生成和管理 appConfig 品牌配置的 CLI 工具

## 安装

### 全局安装（推荐）

```bash
npm install -g app-config-cli
```

### 本地开发

```bash
# 克隆或下载项目
cd app-config-cli

# 安装依赖
npm install

# 构建前端
npm run build

# 启动服务
npm run dev
# 或
npm start
```

## 使用

### 在项目根目录使用

**重要**：请在您的**项目根目录**执行以下命令，工具会在当前目录下查找或创建 `appConfig` 文件夹。

```bash
# 1. 全局安装（如果还没安装）
npm install -g app-config-cli

# 2. 在项目根目录执行（工具会在当前目录查找 appConfig 文件夹）
app-config serve

# 或者指定端口
app-config serve --port 8080
```

启动后会自动打开浏览器，显示可视化配置页面。

**使用说明**：
- ✅ 工具会在**当前工作目录**下查找 `appConfig` 文件夹
- ✅ 如果 `appConfig` 文件夹不存在，会自动创建
- ✅ 所有生成的品牌配置都会保存在 `appConfig/{品牌别名}/` 目录下
- ⚠️ **请确保在项目根目录执行命令**，这样生成的配置文件就在正确的位置
- 📁 生成的目录结构：
  ```
  项目根目录/
  └── appConfig/
      └── {品牌别名}/
          ├── index.ts
          ├── {品牌别名}.keystore
          ├── logo.png
          └── certificate/
              └── prod/
                  ├── app.p12
                  └── app.mobileprovision
  ```

## 功能

### 1. 创建新品牌配置

- **基础信息**：品牌别名、应用名称、应用英文名、应用描述、DCloud App ID
- **环境配置**：API 地区选择（us/sea/eu/test）、iOS App Links 域名
- **其他配置**：版本号、版本代码、语言、Team ID、集团 ID、装修 ID
- **预览确认**：实时预览生成的 index.ts 配置内容
- **自动生成**：
  - packagename 和 iosAppId：`ai.restosuite.{alias}`
  - appLinksuffix：`Restosuite{aliasCamelCase}`
  - keystore 路径和密码（固定 123456）

### 2. 查看已有配置

- 列表展示所有品牌配置
- 查看配置详情（格式化显示 index.ts 内容）
- 复制配置内容到剪贴板
- 导出配置文件

### 3. 导入配置

- 上传本地 index.ts 文件
- 自动解析配置信息
- 创建对应的目录结构

### 4. Keystore 管理

- 自动生成 keystore 文件
- 支持重新生成 keystore

## 生成的目录结构

```
appConfig/
└── {alias}/
    ├── index.ts                    # 配置文件
    ├── {alias}.keystore           # Android 签名文件
    └── certificate/
        └── prod/
            ├── README.md          # 证书说明文档
            ├── app.p12            # iOS 发布证书（需手动放置）
            └── app.mobileprovision # iOS 描述文件（需手动放置）
```

## 技术栈

- **后端**：Node.js + Express
- **前端**：Vue 3 + Vite + Element Plus
- **CLI**：Commander.js
- **模板引擎**：Handlebars

## 注意事项

1. 首次使用前需要先构建前端：`npm run build`
2. keystore 文件生成需要系统安装 Java 和 keytool
3. iOS 证书文件需要手动放置到 `certificate/prod/` 目录
4. DCloud App ID 需要前往 [DCloud 开发者中心](https://dev.dcloud.net.cn) 创建

## 开发

```bash
# 安装依赖
npm install

# 构建前端
npm run build

# 启动开发服务器
npm run dev
```

## License

MIT


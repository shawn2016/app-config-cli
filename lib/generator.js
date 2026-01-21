const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');
const { execSync } = require('child_process');

// 配置文件模板
const configTemplate = `import type { BrandConfig } from '../types'

const config: BrandConfig = {
  // ===== 版本配置 =====
  versionCode: '{{versionCode}}', // 保留原有字段以兼容性
  iosVersionCode: '{{iosVersionCode}}', // iOS 构建号
  androidVersionCode: '{{androidVersionCode}}', // Android 构建号
  versionName: '{{versionName}}', // 版本名称，如 1.0.0

  // ===== 应用基础信息 =====
  app_name: '{{appName}}', // 应用显示名称（中文）
  app_en_name: '{{appEnName}}', // 应用显示名称（英文）
  app_description: '{{appDescription}}', // 应用描述
  dc_appId: '{{dcAppId}}', // DCloud App ID，请前往 https://dev.dcloud.net.cn/pages/app/list 创建后补充
  packagename: '{{packagename}}', // Android 包名
  aliasname: '{{alias}}', // 品牌别名，用于文件夹命名
  iosAppId: '{{iosAppId}}', // iOS Bundle ID
  CFBundleName: '{{cfBundleName}}', // iOS Bundle 显示名称，建议与 app_en_name 一致
  teamId: '{{teamId}}'{{teamIdComment}}, // iOS 开发团队 ID
  splashscreen: {
    iosStyle: '{{splashscreen.iosStyle}}',
    androidStyle: '{{splashscreen.androidStyle}}',
  },

  // ===== 签名配置 =====
  keystore: '../appConfig/{{alias}}/{{alias}}.keystore', // Android 签名文件路径
  password: '123456', // keystore 密码

  // ===== URL配置 =====
  VITE_BASE_URL: '{{baseUrl}}', // API 基础地址
  ios_applinks_domain: '{{iosApplinksDomain}}', // iOS App Links 域名，用于深度链接
  appLinksuffix: '{{appLinksuffix}}', // App Links 后缀，请在 m-app-association 项目新增一项，没有请申请项目权限

  // ===== 微信/支付宝配置 =====
  schemes: '{{schemes}}', // URL Scheme，用于应用间跳转
  urlschemewhitelist: 'alipays', // URL Scheme 白名单，允许跳转的 Scheme
  urltypes: '{{urltypes}}', // URL Types，iOS 用于识别应用

  // ===== 企业配置 =====
  VITE_CORPORATIONID: '{{corporationId}}'{{corporationIdComment}}, // 集团 ID
  VITE_MP_APP_PLUS_EXTAPPID: '{{extAppId}}'{{extAppIdComment}}, // 装修 ID

  // ===== 国际化配置 =====
  locale: '{{locale}}', // 默认语言，zh_CN(简体中文) / zh_TW(繁体中文) / en_US(英文)

  // ===== 设备配置 =====
  devices: 'iphone', // 支持的设备类型，iphone / ipad / universal

  // ===== 证书配置 =====
  certfile: '../appConfig/{{alias}}/certificate/prod/app.p12', // iOS 发布证书路径
  mobileprovision: '../appConfig/{{alias}}/certificate/prod/app.mobileprovision', // iOS 描述文件路径

  // ===== 蒲公英配置 =====
  pgyerApiKey: 'bfb4258d51ec656443252180367e20ff', // 蒲公英 API Key，用于内测分发

  // ===== 功能开关 =====
  isSupportEnterprise: {{isSupportEnterprise}}, // 是否支持企业包
  isTest: {{isTest}}, // 是否是测试环境
  isSupportHotUpdate: {{isSupportHotUpdate}}, // 是否支持热更新
  isSupportAppSetting: {{isSupportAppSetting}}, // 是否支持应用设置

  // ===== App Association 配置 =====
  iosDownloadUrl: '{{iosDownloadUrl}}', // iOS App Store 下载链接
  themeColor: '{{themeColor}}', // 主题颜色，用于浏览器主题色设置
}

export default config
`;

// 生成配置文件
async function generateConfigFile(brandDir, configData) {
  // 确保包名和 Bundle ID 有默认值（在展开之前处理）
  const alias = configData.alias || '';
  const defaultPackageName = `ai.restosuite.${alias}`;
  
  // 添加注释字段（如果字段为空则添加注释）
  const templateData = {
    ...configData,
    // 确保版本代码是字符串
    versionCode: String(configData.versionCode || '1'),
    iosVersionCode: String(configData.iosVersionCode || configData.versionCode || '1'),
    androidVersionCode: String(configData.androidVersionCode || configData.versionCode || '1'),
    // 确保包名和 Bundle ID 有默认值（覆盖展开的值）
    packagename: (configData.packagename && configData.packagename.trim()) ? configData.packagename : defaultPackageName,
    iosAppId: (configData.iosAppId && configData.iosAppId.trim()) ? configData.iosAppId : defaultPackageName,
    // 确保其他字符串字段有默认值
    appName: configData.appName || '',
    appEnName: configData.appEnName || '',
    appDescription: configData.appDescription || '',
    dcAppId: configData.dcAppId || '',
    cfBundleName: configData.cfBundleName || configData.appEnName || '',
    teamId: configData.teamId || '',
    baseUrl: configData.baseUrl || '',
    iosApplinksDomain: configData.iosApplinksDomain || '',
    appLinksuffix: configData.appLinksuffix || '',
    schemes: configData.schemes || '',
    urltypes: configData.urltypes || '',
    corporationId: configData.corporationId || '',
    extAppId: configData.extAppId || '',
    locale: configData.locale || 'zh_CN',
    versionName: configData.versionName || '1.0.0',
    // 注释处理
    teamIdComment: (!configData.teamId || configData.teamId.trim() === '') ? ', // 请补充团队 ID' : '',
    corporationIdComment: (!configData.corporationId || configData.corporationId.trim() === '') ? ', // 请补充集团 ID' : '',
    extAppIdComment: (!configData.extAppId || configData.extAppId.trim() === '') ? ', // 请补充装修 ID' : '',
    // 默认值处理
    iosDownloadUrl: configData.iosDownloadUrl || '',
    themeColor: configData.themeColor || '#52a1ff',
    isSupportEnterprise: configData.isSupportEnterprise !== undefined ? configData.isSupportEnterprise : false,
    isTest: configData.isTest !== undefined ? configData.isTest : false,
    isSupportHotUpdate: configData.isSupportHotUpdate !== undefined ? configData.isSupportHotUpdate : false,
    isSupportAppSetting: configData.isSupportAppSetting !== undefined ? configData.isSupportAppSetting : false,
    // 启动屏配置
    splashscreen: configData.splashscreen || {
      iosStyle: 'common',
      androidStyle: 'common'
    }
  };
  
  const template = handlebars.compile(configTemplate);
  const content = template(templateData);
  const indexPath = path.join(brandDir, 'index.ts');
  await fs.writeFile(indexPath, content, 'utf-8');
}

// 生成 keystore 文件
async function generateKeystoreFile(brandDir, alias) {
  const keystorePath = path.join(brandDir, `${alias}.keystore`);
  
  // 如果 keystore 已存在，跳过
  if (await fs.pathExists(keystorePath)) {
    console.log(`keystore 文件已存在: ${keystorePath}`);
    return;
  }

  try {
    // 使用 keytool 生成 keystore
    // keytool -genkeypair -v -storetype PKCS12 -keystore [keystore路径] -alias [alias] -keyalg RSA -keysize 2048 -validity 10000 -storepass 123456 -keypass 123456 -dname "CN=Restosuite, OU=Mobile, O=Restosuite, L=Beijing, ST=Beijing, C=CN"
    const dname = `CN=Restosuite, OU=Mobile, O=Restosuite, L=Beijing, ST=Beijing, C=CN`;
    const command = `keytool -genkeypair -v -storetype PKCS12 -keystore "${keystorePath}" -alias ${alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass 123456 -keypass 123456 -dname "${dname}"`;
    
    execSync(command, { stdio: 'inherit' });
    console.log(`keystore 文件生成成功: ${keystorePath}`);
  } catch (error) {
    // 如果 keytool 不可用，创建一个占位文件
    console.warn(`无法使用 keytool 生成 keystore，创建占位文件: ${error.message}`);
    const placeholderContent = `# Keystore 文件占位符

请使用以下命令生成 keystore 文件：

keytool -genkeypair -v -storetype PKCS12 \\
  -keystore ${alias}.keystore \\
  -alias ${alias} \\
  -keyalg RSA \\
  -keysize 2048 \\
  -validity 10000 \\
  -storepass 123456 \\
  -keypass 123456 \\
  -dname "CN=Restosuite, OU=Mobile, O=Restosuite, L=Beijing, ST=Beijing, C=CN"

或者使用 Android Studio 的 Generate Signed Bundle/APK 功能生成。
`;
    await fs.writeFile(keystorePath + '.txt', placeholderContent);
  }
}

module.exports = {
  generateConfigFile,
  generateKeystoreFile
};


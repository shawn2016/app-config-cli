import type { BrandConfig } from '../types'

const config: BrandConfig = {
  // ===== 版本配置 =====
  versionCode: '1', // 保留原有字段以兼容性
  iosVersionCode: '1', // iOS 构建号
  androidVersionCode: '1', // Android 构建号
  versionName: '1.0.0', // 版本名称，如 1.0.0

  // ===== 应用基础信息 =====
  app_name: '', // 应用显示名称（中文）
  app_en_name: '', // 应用显示名称（英文）
  app_description: '', // 应用描述
  dc_appId: '', // DCloud App ID，请前往 https://dev.dcloud.net.cn/pages/app/list 创建后补充
  packagename: 'ai.restosuite.mollytea', // Android 包名
  aliasname: 'mollytea', // 品牌别名，用于文件夹命名
  iosAppId: 'ai.restosuite.mollytea', // iOS Bundle ID
  CFBundleName: '', // iOS Bundle 显示名称，建议与 app_en_name 一致
  teamId: '', // 请补充团队 ID, // iOS 开发团队 ID

  // ===== 签名配置 =====
  keystore: '../appConfig/mollytea/mollytea.keystore', // Android 签名文件路径
  password: '123456', // keystore 密码

  // ===== URL配置 =====
  VITE_BASE_URL: 'https://m.test.restosuite.cn', // API 基础地址
  ios_applinks_domain: 'https://applinks.test.restosuite.cn', // iOS App Links 域名，用于深度链接
  appLinksuffix: 'RestosuiteMollytea', // App Links 后缀，请在 m-app-association 项目新增一项，没有请申请项目权限

  // ===== 微信/支付宝配置 =====
  schemes: 'mollytea', // URL Scheme，用于应用间跳转
  urlschemewhitelist: 'alipays', // URL Scheme 白名单，允许跳转的 Scheme
  urltypes: 'mollytea', // URL Types，iOS 用于识别应用

  // ===== 企业配置 =====
  VITE_CORPORATIONID: '', // 请补充集团 ID, // 集团 ID
  VITE_MP_APP_PLUS_EXTAPPID: '', // 请补充装修 ID, // 装修 ID

  // ===== 国际化配置 =====
  locale: 'zh_CN', // 默认语言，zh_CN(简体中文) / zh_TW(繁体中文) / en_US(英文)

  // ===== 设备配置 =====
  devices: 'iphone', // 支持的设备类型，iphone / ipad / universal

  // ===== 证书配置 =====
  certfile: '../appConfig/mollytea/certificate/prod/app.p12', // iOS 发布证书路径
  mobileprovision: '../appConfig/mollytea/certificate/prod/app.mobileprovision', // iOS 描述文件路径

  // ===== 审核账号 =====
  '审核账号': 'dev_account@restosuite.ai', // App Store 审核账号
  '审核密码': '385217', // App Store 审核密码

  // ===== 蒲公英配置 =====
  pgyerApiKey: 'bfb4258d51ec656443252180367e20ff', // 蒲公英 API Key，用于内测分发

  // ===== 功能开关 =====
  isSupportEnterprise: true, // 是否支持企业包
  isTest: true, // 是否是测试环境
  isSupportHotUpdate: true, // 是否支持热更新

  // ===== App Association 配置 =====
  iosDownloadUrl: '', // iOS App Store 下载链接
  themeColor: '#52a1ff', // 主题颜色，用于浏览器主题色设置
}

export default config

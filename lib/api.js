const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');
const { pinyin } = require('pinyin-pro');
const { getAppConfigDir, toCamelCase, generateBaseUrl, getProjectPath } = require('./utils');
const { generateConfigFile, generateKeystoreFile } = require('./generator');

// 将中文文件名转换为拼音，避免编码问题
function convertChineseToPinyin(filename) {
  if (!filename) return filename;
  
  try {
    // 分离文件名和扩展名
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    
    // 检查是否包含中文字符
    if (!/[\u4e00-\u9fa5]/.test(nameWithoutExt)) {
      // 不包含中文，直接返回
      return filename;
    }
    
    // 逐个字符处理：中文字符转换为拼音，其他字符保持不变
    let result = '';
    for (let i = 0; i < nameWithoutExt.length; i++) {
      const char = nameWithoutExt[i];
      const isChinese = /[\u4e00-\u9fa5]/.test(char);
      const prevIsChinese = i > 0 && /[\u4e00-\u9fa5]/.test(nameWithoutExt[i - 1]);
      const nextIsChinese = i < nameWithoutExt.length - 1 && /[\u4e00-\u9fa5]/.test(nameWithoutExt[i + 1]);
      const prevIsAlphanumeric = i > 0 && /[a-zA-Z0-9]/.test(nameWithoutExt[i - 1]);
      const nextIsAlphanumeric = i < nameWithoutExt.length - 1 && /[a-zA-Z0-9]/.test(nameWithoutExt[i + 1]);
      
      if (isChinese) {
        // 中文字符，转换为拼音
        // 如果前一个字符是字母数字，添加连字符
        if (prevIsAlphanumeric) {
          result += '-';
        }
        const pinyinChar = pinyin(char, { toneType: 'none' }).trim();
        if (pinyinChar) {
          result += pinyinChar;
          // 如果下一个字符也是中文，添加连字符
          if (nextIsChinese) {
            result += '-';
          }
          // 如果下一个字符是字母数字，添加连字符
          if (nextIsAlphanumeric) {
            result += '-';
          }
        }
      } else {
        // 非中文字符，直接保留
        // 如果前一个字符是中文，添加连字符
        if (prevIsChinese) {
          result += '-';
        }
        result += char;
      }
    }
    
    // 清理多余的连字符
    const pinyinName = result
      .replace(/-+/g, '-')    // 将多个连字符替换为单个
      .replace(/^-|-$/g, '')  // 移除开头和结尾的连字符
      .toLowerCase();         // 转换为小写
    
    // 组合拼音文件名和扩展名
    return pinyinName + ext;
  } catch (error) {
    console.warn('中文转拼音失败，使用原始文件名:', filename, error.message);
    return filename;
  }
}

// 解码文件名，处理各种编码问题
function decodeFilename(filename) {
  if (!filename) return filename;
  
  let decoded = filename;
  
  try {
    // 1. 首先尝试 URL 解码（处理 %XX 格式）
    if (filename.includes('%')) {
      try {
        decoded = decodeURIComponent(filename);
      } catch (e) {
        // URL 解码失败，继续尝试其他方法
        decoded = filename;
      }
    }
    
    // 2. 检查是否是乱码（UTF-8 字节被错误解释为 Latin1）
    // 乱码特征：包含 Latin1 范围内的字符（\u0080-\u00FF），但不包含中文字符
    const hasLatin1Chars = /[\u0080-\u00FF]/.test(decoded);
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(decoded);
    
    if (hasLatin1Chars && !hasChineseChars) {
      // 很可能是 UTF-8 字节被错误解释为 Latin1，需要转换
      try {
        // 将 Latin1 字符串转换为 Buffer（按字节读取），然后按 UTF-8 解码
        const buffer = Buffer.from(decoded, 'latin1');
        const utf8Decoded = buffer.toString('utf8');
        
        // 验证转换后是否包含中文字符（说明转换成功）
        if (/[\u4e00-\u9fa5]/.test(utf8Decoded)) {
          return utf8Decoded;
        }
      } catch (e) {
        // 转换失败，继续使用当前值
      }
    }
    
    // 3. 如果已经包含中文字符，说明编码正确，直接返回
    if (hasChineseChars) {
      return decoded;
    }
    
    // 4. 如果原始文件名不包含 %，但看起来是乱码，尝试直接转换
    if (!filename.includes('%') && hasLatin1Chars) {
      try {
        // 假设是 Latin1 编码的 UTF-8 字节序列
        const buffer = Buffer.from(filename, 'latin1');
        const utf8String = buffer.toString('utf8');
        // 检查转换后是否包含中文字符
        if (/[\u4e00-\u9fa5]/.test(utf8String)) {
          return utf8String;
        }
      } catch (e) {
        // 转换失败
      }
    }
    
    return decoded;
  } catch (error) {
    console.warn('文件名解码失败，使用原始文件名:', filename, error.message);
    return filename;
  }
}

// 获取所有品牌配置列表
async function getConfigs(req, res) {
  try {
    const appConfigDir = getAppConfigDir();
    if (!fs.existsSync(appConfigDir)) {
      return res.json([]);
    }

    const dirs = await fs.readdir(appConfigDir);
    const configs = [];

    for (const dir of dirs) {
      const configPath = path.join(appConfigDir, dir);
      const stat = await fs.stat(configPath);
      
      if (stat.isDirectory()) {
        const indexPath = path.join(configPath, 'index.ts');
        if (await fs.pathExists(indexPath)) {
          // 读取配置文件，解析描述信息和别名
          let appDescription = '';
          let aliasFromConfig = dir; // 默认使用文件夹名
          let appName = '';
          let appEnName = '';
          let baseUrlRegion = '';
          let dcAppId = '';
          let logoExists = false;
          let packagename = '';
          let iosAppId = '';
          let appLinksuffix = '';
          let schemes = '';
          let urltypes = '';
          let teamId = '';
          let corporationId = '';
          let extAppId = '';
          let iosApplinksDomain = '';
          let versionName = '';
          let versionCode = '';
          let androidVersionCode = '';
          let iosVersionCode = '';
          let locale = '';
          let themeColor = '';
          let iosDownloadUrl = '';
          let reviewAccount = '';
          let reviewPassword = '';
          let isSupportEnterprise = false;
          let isTest = false;
          let isSupportHotUpdate = false;
          let isSupportAppSetting = false;
          try {
            const content = await fs.readFile(indexPath, 'utf-8');
            const parsedConfig = parseConfigContent(content);
            appDescription = parsedConfig.appDescription || '';
            appName = parsedConfig.appName || '';
            appEnName = parsedConfig.appEnName || '';
            baseUrlRegion = parsedConfig.baseUrlRegion || '';
            dcAppId = parsedConfig.dcAppId || '';
            packagename = parsedConfig.packagename || '';
            iosAppId = parsedConfig.iosAppId || '';
            appLinksuffix = parsedConfig.appLinksuffix || '';
            schemes = parsedConfig.schemes || '';
            urltypes = parsedConfig.urltypes || '';
            teamId = parsedConfig.teamId || '';
            corporationId = parsedConfig.corporationId || '';
            extAppId = parsedConfig.extAppId || '';
            iosApplinksDomain = parsedConfig.iosApplinksDomain || '';
            versionName = parsedConfig.versionName || '';
            versionCode = parsedConfig.versionCode || '';
            androidVersionCode = parsedConfig.androidVersionCode || parsedConfig.versionCode || '';
            iosVersionCode = parsedConfig.iosVersionCode || parsedConfig.versionCode || '';
            locale = parsedConfig.locale || '';
            themeColor = parsedConfig.themeColor || '';
            iosDownloadUrl = parsedConfig.iosDownloadUrl || '';
            reviewAccount = parsedConfig.reviewAccount || '';
            reviewPassword = parsedConfig.reviewPassword || '';
            isSupportEnterprise = parsedConfig.isSupportEnterprise || false;
            isTest = parsedConfig.isTest || false;
            isSupportHotUpdate = parsedConfig.isSupportHotUpdate || false;
            isSupportAppSetting = parsedConfig.isSupportAppSetting || false;
            // 如果配置文件中有 aliasname，使用配置文件中的别名
            if (parsedConfig.aliasname && parsedConfig.aliasname.trim() !== '') {
              aliasFromConfig = parsedConfig.aliasname;
            }
            // 检查logo是否存在
            const logoPath = path.join(configPath, 'logo.png');
            logoExists = await fs.pathExists(logoPath);
          } catch (err) {
            console.error(`解析配置 ${dir} 失败:`, err);
          }

          // 生成 Android 下载链接
          const androidDownloadUrl = packagename 
            ? `https://play.google.com/store/apps/details?id=${packagename}`
            : '';

          configs.push({
            alias: aliasFromConfig, // 使用配置文件中的别名
            folderName: dir, // 保存文件夹名
            path: configPath,
            appDescription: appDescription,
            appName: appName,
            appEnName: appEnName,
            baseUrlRegion: baseUrlRegion,
            dcAppId: dcAppId,
            logoExists: logoExists,
            packagename: packagename,
            iosAppId: iosAppId,
            appLinksuffix: appLinksuffix,
            schemes: schemes,
            urltypes: urltypes,
            teamId: teamId,
            corporationId: corporationId,
            extAppId: extAppId,
            iosApplinksDomain: iosApplinksDomain,
            versionName: versionName,
            versionCode: versionCode,
            androidVersionCode: androidVersionCode,
            iosVersionCode: iosVersionCode,
            locale: locale,
            themeColor: themeColor,
            iosDownloadUrl: iosDownloadUrl,
            androidDownloadUrl: androidDownloadUrl,
            reviewAccount: reviewAccount,
            reviewPassword: reviewPassword,
            isSupportEnterprise: isSupportEnterprise,
            isTest: isTest,
            isSupportHotUpdate: isSupportHotUpdate,
            isSupportAppSetting: isSupportAppSetting,
            createdAt: stat.birthtime
          });
        }
      }
    }

    res.json(configs.sort((a, b) => b.createdAt - a.createdAt));
  } catch (error) {
    console.error('获取配置列表错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 创建新品牌配置
async function createConfig(req, res) {
  try {
    const {
      alias,
      appName,
      appEnName,
      appDescription,
      dcAppId,
      packagename,
      iosAppId,
      baseUrlRegion,
      iosApplinksDomain,
      versionName = '1.0.0',
      versionCode = 1,
      iosVersionCode,
      androidVersionCode,
      locale = 'zh_CN',
      teamId,
      corporationId,
      extAppId,
      iosDownloadUrl,
      themeColor,
      isSupportEnterprise = false,
      isTest = false,
      isSupportHotUpdate = false,
      isSupportAppSetting = false
    } = req.body;

    if (!alias) {
      return res.status(400).json({ error: '缺少必填字段: alias' });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, alias);

    // 检查目录是否已存在
    if (await fs.pathExists(brandDir)) {
      return res.status(400).json({ error: `品牌配置 ${alias} 已存在` });
    }

    // 创建目录结构
    await fs.mkdirp(brandDir);
    await fs.mkdirp(path.join(brandDir, 'certificate', 'prod'));

    // 生成证书目录 README
    const readmeContent = `# 证书文件说明

请将以下文件放置在此目录：

1. **app.p12** - iOS 发布证书
2. **app.mobileprovision** - iOS 描述文件

## 获取证书步骤

1. 登录 [Apple Developer](https://developer.apple.com/)
2. 创建 App ID 和证书
3. 下载证书和描述文件
4. 将文件重命名为上述名称并放置在此目录

详细文档: https://developer.apple.com/documentation/xcode/managing-your-team-s-signing-assets
`;

    await fs.writeFile(
      path.join(brandDir, 'certificate', 'prod', 'README.md'),
      readmeContent
    );

    // 生成配置数据
    const configData = {
      alias,
      appName,
      appEnName,
      appDescription: appDescription || '',
      dcAppId: dcAppId || '',
      packagename: packagename || `ai.restosuite.${alias}`,
      iosAppId: iosAppId || `ai.restosuite.${alias}`,
      cfBundleName: appEnName,
      teamId: teamId || '',
      baseUrl: generateBaseUrl(baseUrlRegion || 'test'),
      iosApplinksDomain: iosApplinksDomain || '',
      appLinksuffix: `Restosuite${toCamelCase(alias)}`,
      schemes: alias,
      urltypes: alias,
      corporationId: corporationId || '',
      extAppId: extAppId || '',
      versionName,
      versionCode: versionCode || 1,
      iosVersionCode: iosVersionCode || 1,
      androidVersionCode: androidVersionCode || 1,
      locale,
      iosDownloadUrl: iosDownloadUrl || '',
      themeColor: themeColor || '#52a1ff',
      isSupportEnterprise: isSupportEnterprise || false,
      isTest: isTest || false,
      isSupportHotUpdate: isSupportHotUpdate || false,
      isSupportAppSetting: isSupportAppSetting || false
    };

    // 生成 index.ts
    await generateConfigFile(brandDir, configData);

    // 生成 keystore
    await generateKeystoreFile(brandDir, alias);

    // 更新 appConfig/index.ts
    await updateAppConfigIndex();

    res.json({
      success: true,
      message: `品牌配置 ${alias} 创建成功`,
      path: brandDir
    });
  } catch (error) {
    console.error('创建配置错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 更新 appConfig/index.ts 文件
async function updateAppConfigIndex() {
  try {
    const appConfigDir = getAppConfigDir();
    const indexPath = path.join(appConfigDir, 'index.ts');
    
    // 读取所有配置目录
    const dirs = await fs.readdir(appConfigDir);
    const configDirs = [];
    
    for (const dir of dirs) {
      const configPath = path.join(appConfigDir, dir);
      const stat = await fs.stat(configPath);
      
      if (stat.isDirectory() && dir !== 'bundletool-all.jar') {
        const configIndexPath = path.join(configPath, 'index.ts');
        if (await fs.pathExists(configIndexPath)) {
          configDirs.push(dir);
        }
      }
    }
    
    // 按字母顺序排序
    configDirs.sort();
    
    // 生成 import 语句和变量名
    // 变量名规则：直接使用文件夹名（保持原样，包括大小写和下划线）
    const imports = configDirs.map(dir => {
      return `import ${dir} from './${dir}'`;
    }).join('\n');
    
    // 生成 appConfigs 对象
    const configEntries = configDirs.map(dir => {
      return `  ${dir},`;
    }).join('\n');
    
    // 生成完整的文件内容
    const fileContent = `import type { BrandConfigMap } from './types'
${imports}

const appConfigs: BrandConfigMap = {
${configEntries}
}

export default appConfigs
`;

    // 写入文件
    await fs.writeFile(indexPath, fileContent, 'utf-8');
    console.log('appConfig/index.ts 已更新');
  } catch (error) {
    console.error('更新 appConfig/index.ts 失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

// 通过别名查找文件夹名（支持别名和文件夹名不同的情况）
async function findFolderByAlias(alias) {
  const appConfigDir = getAppConfigDir();
  if (!fs.existsSync(appConfigDir)) {
    return null;
  }

  const dirs = await fs.readdir(appConfigDir);
  
  for (const dir of dirs) {
    const configPath = path.join(appConfigDir, dir);
    const stat = await fs.stat(configPath);
    
    if (stat.isDirectory()) {
      const indexPath = path.join(configPath, 'index.ts');
      if (await fs.pathExists(indexPath)) {
        try {
          const content = await fs.readFile(indexPath, 'utf-8');
          const parsedConfig = parseConfigContent(content);
          // 如果配置中的别名匹配，或者文件夹名匹配，都返回该文件夹
          if (parsedConfig.aliasname === alias || dir === alias) {
            return dir;
          }
        } catch (err) {
          // 如果解析失败，检查文件夹名是否匹配
          if (dir === alias) {
            return dir;
          }
        }
      } else {
        // 如果没有 index.ts，但文件夹名匹配，也返回
        if (dir === alias) {
          return dir;
        }
      }
    }
  }
  
  return null;
}

// 在目录中查找 keystore 文件（支持非别名命名）
async function findKeystoreFile(brandDir, alias) {
  // 首先尝试使用别名命名的 keystore
  const aliasKeystorePath = path.join(brandDir, `${alias}.keystore`);
  if (await fs.pathExists(aliasKeystorePath)) {
    return aliasKeystorePath;
  }
  
  // 如果不存在，查找目录中的所有 .keystore 文件
  try {
    const files = await fs.readdir(brandDir);
    for (const file of files) {
      if (file.endsWith('.keystore')) {
        return path.join(brandDir, file);
      }
    }
  } catch (err) {
    console.error('查找 keystore 文件失败:', err);
  }
  
  return null;
}

// 查找 bundletool-all.jar 文件路径
// 优先从 appConfig 目录查找，如果找不到则返回 null（静默处理）
async function findBundletoolPath() {
  const appConfigDir = getAppConfigDir();
  const appConfigBundletoolPath = path.join(appConfigDir, 'bundletool-all.jar');
  
  // 优先从 appConfig 目录查找
  if (await fs.pathExists(appConfigBundletoolPath)) {
    return appConfigBundletoolPath;
  }
  
  // 如果 appConfig 目录不存在，尝试从 lib 目录查找（向后兼容）
  const libBundletoolPath = path.join(__dirname, 'bundletool-all.jar');
  if (await fs.pathExists(libBundletoolPath)) {
    return libBundletoolPath;
  }
  
  // 都找不到，返回 null（静默处理，不报错）
  return null;
}

// 根据包名查找所有匹配的品牌配置
async function getConfigsForPackageName(packageName) {
  const appConfigDir = getAppConfigDir();
  const matchingBrands = [];
  
  if (!fs.existsSync(appConfigDir)) {
    return matchingBrands;
  }

  try {
    const dirs = await fs.readdir(appConfigDir);
    
    for (const dir of dirs) {
      const configPath = path.join(appConfigDir, dir);
      const stat = await fs.stat(configPath);
      
      if (stat.isDirectory()) {
        const indexPath = path.join(configPath, 'index.ts');
        if (await fs.pathExists(indexPath)) {
          try {
            const content = await fs.readFile(indexPath, 'utf-8');
            const parsedConfig = parseConfigContent(content);
            
            if (parsedConfig.packagename === packageName) {
              matchingBrands.push({
                alias: parsedConfig.aliasname || dir,
                folderName: dir,
                packagename: parsedConfig.packagename
              });
            }
          } catch (err) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    console.error('查找匹配品牌配置失败:', error);
  }
  
  return matchingBrands;
}

// 解析配置文件内容
function parseConfigContent(content) {
  const config = {};
  
  // 提取各个字段
  const patterns = {
    versionCode: /versionCode:\s*['"]([^'"]+)['"]/,
    iosVersionCode: /iosVersionCode:\s*['"]([^'"]+)['"]/,
    androidVersionCode: /androidVersionCode:\s*['"]([^'"]+)['"]/,
    versionName: /versionName:\s*['"]([^'"]+)['"]/,
    appName: /app_name:\s*['"]([^'"]+)['"]/,
    appEnName: /app_en_name:\s*['"]([^'"]+)['"]/,
    appDescription: /app_description:\s*['"]([^'"]*)['"]/,
    dcAppId: /dc_appId:\s*['"]([^'"]*)['"]/,
    packagename: /packagename:\s*['"]([^'"]+)['"]/,
    aliasname: /aliasname:\s*['"]([^'"]+)['"]/,
    iosAppId: /iosAppId:\s*['"]([^'"]+)['"]/,
    cfBundleName: /CFBundleName:\s*['"]([^'"]*)['"]/,
    teamId: /teamId:\s*['"]([^'"]*)['"]/,
    baseUrl: /VITE_BASE_URL:\s*['"]([^'"]+)['"]/,
    iosApplinksDomain: /ios_applinks_domain:\s*['"]([^'"]*)['"]/,
    appLinksuffix: /appLinksuffix:\s*['"]([^'"]+)['"]/,
    schemes: /schemes:\s*['"]([^'"]+)['"]/,
    urltypes: /urltypes:\s*['"]([^'"]+)['"]/,
    corporationId: /VITE_CORPORATIONID:\s*['"]([^'"]*)['"]/,
    extAppId: /VITE_MP_APP_PLUS_EXTAPPID:\s*['"]([^'"]*)['"]/,
    locale: /locale:\s*['"]([^'"]+)['"]/,
    iosDownloadUrl: /iosDownloadUrl:\s*['"]([^'"]*)['"]/,
    themeColor: /themeColor:\s*['"]([^'"]+)['"]/,
    reviewAccount: /['"]审核账号['"]:\s*['"]([^'"]*)['"]/,
    reviewPassword: /['"]审核密码['"]:\s*['"]([^'"]*)['"]/,
    password: /password:\s*['"]([^'"]+)['"]/,
    isSupportEnterprise: /isSupportEnterprise:\s*(true|false)/,
    isTest: /isTest:\s*(true|false)/,
    isSupportHotUpdate: /isSupportHotUpdate:\s*(true|false)/,
    isSupportAppSetting: /isSupportAppSetting:\s*(true|false)/
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      if (key === 'isSupportEnterprise' || key === 'isTest' || key === 'isSupportHotUpdate' || key === 'isSupportAppSetting') {
        config[key] = match[1] === 'true';
      } else {
        config[key] = match[1] || '';
      }
    }
  }

  // 根据 baseUrl 推断地区
  if (config.baseUrl) {
    if (config.baseUrl.includes('m.us.restosuite.ai')) {
      config.baseUrlRegion = 'us';
    } else if (config.baseUrl.includes('m.sea.restosuite.ai')) {
      config.baseUrlRegion = 'sea';
    } else if (config.baseUrl.includes('m.eu.restosuite.ai')) {
      config.baseUrlRegion = 'eu';
    } else if (config.baseUrl.includes('m.test.restosuite.cn')) {
      config.baseUrlRegion = 'test';
    }
  }

  return config;
}

// 获取指定品牌的配置内容
async function getConfigByAlias(req, res) {
  try {
    const { alias } = req.params;
    const appConfigDir = getAppConfigDir();
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '配置不存在' });
    }
    
    const indexPath = path.join(appConfigDir, folderName, 'index.ts');

    if (!(await fs.pathExists(indexPath))) {
      return res.status(404).json({ error: '配置不存在' });
    }

    const content = await fs.readFile(indexPath, 'utf-8');
    
    // 如果请求参数包含 parse=true，则返回解析后的结构化数据
    if (req.query.parse === 'true') {
      const config = parseConfigContent(content);
      config.alias = config.aliasname || alias;
      config.folderName = folderName;
      return res.json(config);
    }
    
    res.json({ alias, folderName, content });
  } catch (error) {
    console.error('获取配置错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 更新配置
async function updateConfig(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }
    
    const {
      appName,
      appEnName,
      appDescription,
      dcAppId,
      baseUrlRegion,
      iosApplinksDomain,
      packagename,
      iosAppId,
      versionName,
      versionCode,
      iosVersionCode,
      androidVersionCode,
      locale,
      teamId,
      corporationId,
      extAppId,
      iosDownloadUrl,
      themeColor,
      isSupportEnterprise = false,
      isTest = false,
      isSupportHotUpdate = false,
      isSupportAppSetting = false
    } = req.body;

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);

    // 检查目录是否存在
    if (!(await fs.pathExists(brandDir))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 生成配置数据
    const configData = {
      alias,
      appName: appName || '',
      appEnName: appEnName || '',
      appDescription: appDescription || '',
      dcAppId: dcAppId || '',
      packagename: packagename || `ai.restosuite.${alias}`,
      iosAppId: iosAppId || `ai.restosuite.${alias}`,
      cfBundleName: appEnName || '',
      teamId: teamId || '',
      baseUrl: generateBaseUrl(baseUrlRegion || 'test'),
      iosApplinksDomain: iosApplinksDomain || '',
      appLinksuffix: `Restosuite${toCamelCase(alias)}`,
      schemes: alias,
      urltypes: alias,
      corporationId: corporationId || '',
      extAppId: extAppId || '',
      versionName: versionName || '1.0.0',
      versionCode: versionCode || 1,
      iosVersionCode: iosVersionCode || 1,
      androidVersionCode: androidVersionCode || 1,
      locale: locale || 'zh_CN',
      iosDownloadUrl: iosDownloadUrl || '',
      themeColor: themeColor || '#52a1ff',
      isSupportEnterprise: isSupportEnterprise || false,
      isTest: isTest || false,
      isSupportHotUpdate: isSupportHotUpdate || false,
      isSupportAppSetting: isSupportAppSetting || false
    };

    // 只更新 index.ts，不生成 keystore
    await generateConfigFile(brandDir, configData);

    res.json({
      success: true,
      message: `品牌配置 ${alias} 更新成功`,
      path: brandDir
    });
  } catch (error) {
    console.error('更新配置错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 检查配置文件是否存在
async function checkConfigFiles(req, res) {
  try {
    const { alias } = req.params;
    const { platform } = req.query; // 可选：'android' 或 'ios'
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ 
        success: false,
        error: `配置不存在: ${alias}` 
      });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);
    
    if (!(await fs.pathExists(brandDir))) {
      return res.status(404).json({ 
        success: false,
        error: `配置不存在: ${alias}` 
      });
    }

    const missingFiles = [];
    
    // 检查 logo
    const logoPath = path.join(brandDir, 'logo.png');
    if (!(await fs.pathExists(logoPath))) {
      missingFiles.push('logo');
    }
    
    // 根据平台检查文件
    if (!platform || platform === 'android') {
      // 检查 keystore
      const keystorePath = await findKeystoreFile(brandDir, alias);
      if (!keystorePath || !(await fs.pathExists(keystorePath))) {
        missingFiles.push('keystore');
      }
    }
    
    if (!platform || platform === 'ios') {
      // 检查 p12
      const p12Path = path.join(brandDir, 'certificate', 'prod', 'app.p12');
      if (!(await fs.pathExists(p12Path))) {
        missingFiles.push('p12');
      }
      
      // 检查 mobileprovision
      const mobileprovisionPath = path.join(brandDir, 'certificate', 'prod', 'app.mobileprovision');
      if (!(await fs.pathExists(mobileprovisionPath))) {
        missingFiles.push('mobileprovision');
      }
    }

    res.json({
      success: true,
      missingFiles: missingFiles
    });
  } catch (error) {
    console.error('检查文件错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 检查云打包必填项
async function checkCloudBuildRequirements(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ 
        success: false,
        error: `配置不存在: ${alias}` 
      });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);
    const indexPath = path.join(brandDir, 'index.ts');
    
    if (!(await fs.pathExists(indexPath))) {
      return res.status(404).json({ 
        success: false,
        error: `配置文件不存在: ${alias}` 
      });
    }

    // 读取并解析配置文件
    const content = await fs.readFile(indexPath, 'utf-8');
    const config = parseConfigContent(content);
    
    const missingFields = [];
    const missingFiles = [];
    
    // 检查必填配置项
    // 基础信息
    if (!config.appName || config.appName.trim() === '') {
      missingFields.push('应用名称（app_name）');
    }
    if (!config.appEnName || config.appEnName.trim() === '') {
      missingFields.push('应用英文名（app_en_name）');
    }
    if (!config.packagename || config.packagename.trim() === '') {
      missingFields.push('Android 包名（packagename）');
    }
    if (!config.iosAppId || config.iosAppId.trim() === '') {
      missingFields.push('iOS Bundle ID（iosAppId）');
    }
    if (!config.dcAppId || config.dcAppId.trim() === '') {
      missingFields.push('DCloud App ID（dc_appId）');
    }
    
    // 版本信息
    if (!config.versionName || config.versionName.trim() === '') {
      missingFields.push('版本号（versionName）');
    }
    if ((!config.androidVersionCode || config.androidVersionCode.trim() === '') && 
        (!config.iosVersionCode || config.iosVersionCode.trim() === '')) {
      missingFields.push('构建号（androidVersionCode 或 iosVersionCode）');
    }
    
    // URL 配置
    if (!config.baseUrl || config.baseUrl.trim() === '') {
      missingFields.push('API 基础地址（VITE_BASE_URL）');
    }
    
    // iOS 相关配置
    if (!config.teamId || config.teamId.trim() === '') {
      missingFields.push('iOS Team ID（teamId）');
    }
    
    // 检查文件是否存在
    // Logo
    const logoPath = path.join(brandDir, 'logo.png');
    if (!(await fs.pathExists(logoPath))) {
      missingFiles.push('Logo 文件（logo.png）');
    }
    
    // Android 签名文件
    const keystorePath = await findKeystoreFile(brandDir, alias);
    if (!keystorePath || !(await fs.pathExists(keystorePath))) {
      missingFiles.push('Android 签名文件（.keystore）');
    }
    
    // iOS 证书文件
    const p12Path = path.join(brandDir, 'certificate', 'prod', 'app.p12');
    if (!(await fs.pathExists(p12Path))) {
      missingFiles.push('iOS 证书文件（app.p12）');
    }
    
    // iOS 描述文件
    const mobileprovisionPath = path.join(brandDir, 'certificate', 'prod', 'app.mobileprovision');
    if (!(await fs.pathExists(mobileprovisionPath))) {
      missingFiles.push('iOS 描述文件（app.mobileprovision）');
    }

    res.json({
      success: true,
      missingFields: missingFields,
      missingFiles: missingFiles,
      hasErrors: missingFields.length > 0 || missingFiles.length > 0
    });
  } catch (error) {
    console.error('检查云打包必填项错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 生成 keystore 文件
async function generateKeystore(req, res) {
  try {
    const { alias } = req.body;
    if (!alias) {
      return res.status(400).json({ error: '缺少 alias 参数' });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);

    if (!(await fs.pathExists(brandDir))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 使用配置文件中的别名来生成 keystore（如果存在）
    let keystoreAlias = alias;
    try {
      const indexPath = path.join(brandDir, 'index.ts');
      if (await fs.pathExists(indexPath)) {
        const content = await fs.readFile(indexPath, 'utf-8');
        const parsedConfig = parseConfigContent(content);
        if (parsedConfig.aliasname && parsedConfig.aliasname.trim() !== '') {
          keystoreAlias = parsedConfig.aliasname;
        }
      }
    } catch (err) {
      console.error('读取配置失败，使用默认别名:', err);
    }

    await generateKeystoreFile(brandDir, keystoreAlias);

    res.json({
      success: true,
      message: `keystore 文件生成成功`
    });
  } catch (error) {
    console.error('生成 keystore 错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 查看 keystore 信息
async function getKeystoreInfo(req, res) {
  try {
    const { alias } = req.params;
    if (!alias) {
      return res.status(400).json({ error: '缺少 alias 参数' });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ 
        success: false,
        error: '配置不存在' 
      });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);
    
    // 获取配置文件中的别名（用于查找 keystore）
    let configAlias = alias;
    try {
      const indexPath = path.join(brandDir, 'index.ts');
      if (await fs.pathExists(indexPath)) {
        const content = await fs.readFile(indexPath, 'utf-8');
        const parsedConfig = parseConfigContent(content);
        if (parsedConfig.aliasname && parsedConfig.aliasname.trim() !== '') {
          configAlias = parsedConfig.aliasname;
        }
      }
    } catch (err) {
      console.error('读取配置失败:', err);
    }

    // 查找 keystore 文件（支持非别名命名）
    const keystorePath = await findKeystoreFile(brandDir, configAlias);

    console.log('查看 keystore 信息 - 调试信息:');
    console.log('  当前工作目录:', process.cwd());
    console.log('  appConfig 目录:', appConfigDir);
    console.log('  品牌目录:', brandDir);
    console.log('  配置别名:', configAlias);
    console.log('  keystore 路径:', keystorePath);
    console.log('  keystore 文件是否存在:', keystorePath !== null);

    if (!keystorePath) {
      // 检查品牌目录是否存在
      const brandDirExists = await fs.pathExists(brandDir);
      const appConfigDirExists = await fs.pathExists(appConfigDir);
      
      let errorMsg = 'keystore 文件不存在，请先创建配置或生成 keystore 文件';
      if (!appConfigDirExists) {
        errorMsg += `\nappConfig 目录不存在: ${appConfigDir}`;
      } else if (!brandDirExists) {
        errorMsg += `\n品牌目录不存在: ${brandDir}`;
      } else {
        errorMsg += `\n在目录 ${brandDir} 中未找到 .keystore 文件`;
      }
      
      return res.status(404).json({ 
        success: false,
        error: errorMsg,
        debug: {
          cwd: process.cwd(),
          appConfigDir,
          brandDir,
          configAlias,
          appConfigDirExists,
          brandDirExists
        }
      });
    }

    try {
      // 使用 keytool 查看 keystore 信息
      // keytool -list -v -keystore {keystorePath} -storepass 123456
      const { execSync } = require('child_process');
      const command = `keytool -list -v -keystore "${keystorePath}" -storepass 123456`;
      const output = execSync(command, { encoding: 'utf-8' });
      
      // 解析输出，提取关键信息
      const info = {
        raw: output,
        sha1: extractHash(output, 'SHA1'),
        sha256: extractHash(output, 'SHA256'),
        md5: extractHash(output, 'MD5'),
        alias: extractValue(output, '别名') || extractValue(output, 'Alias name'),
        validFrom: extractValue(output, 'Valid from') || extractValue(output, '创建日期'),
        validUntil: extractValue(output, 'Valid until') || extractValue(output, '有效期限'),
        owner: extractValue(output, '所有者') || extractValue(output, 'Owner'),
        issuer: extractValue(output, '颁发者') || extractValue(output, 'Issuer')
      };

      console.log('解析后的 keystore 信息:', info);

      res.json({
        success: true,
        info
      });
    } catch (error) {
      // 如果 keytool 命令执行失败
      console.error('keytool 命令执行失败:', error);
      res.status(500).json({ 
        success: false,
        error: '无法读取 keystore 信息，请确保已安装 Java 和 keytool',
        details: error.message 
      });
    }
  } catch (error) {
    console.error('查看 keystore 信息错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 辅助函数：从 keytool 输出中提取 hash 值
function extractHash(output, algorithm) {
  // 匹配 SHA1: XX:XX:XX... 或 SHA1指纹: XX:XX:XX... 或 SHA1 Fingerprint: XX:XX:XX...
  const regex = new RegExp(`${algorithm}(?:\\s+指纹|\\s+Fingerprint)?[：:]\\s*([A-F0-9:]+)`, 'i');
  const match = output.match(regex);
  return match ? match[1].trim() : null;
}

// 辅助函数：从 keytool 输出中提取值
function extractValue(output, key) {
  // 匹配中英文标签，支持冒号和中文冒号
  const regex = new RegExp(`${key}[：:]\\s*(.+?)(?:\\n|$)`, 'i');
  const match = output.match(regex);
  return match ? match[1].trim() : null;
}

// 导入配置文件
async function importConfig(req, res) {
  try {
    const { content, alias } = req.body;
    
    if (!content || !alias) {
      return res.status(400).json({ error: '缺少必填字段: content, alias' });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, alias);

    // 检查目录是否已存在
    if (await fs.pathExists(brandDir)) {
      return res.status(400).json({ error: `品牌配置 ${alias} 已存在` });
    }

    // 创建目录结构
    await fs.mkdirp(brandDir);
    await fs.mkdirp(path.join(brandDir, 'certificate', 'prod'));

    // 生成证书目录 README
    const readmeContent = `# 证书文件说明

请将以下文件放置在此目录：

1. **app.p12** - iOS 发布证书
2. **app.mobileprovision** - iOS 描述文件

## 获取证书步骤

1. 登录 [Apple Developer](https://developer.apple.com/)
2. 创建 App ID 和证书
3. 下载证书和描述文件
4. 将文件重命名为上述名称并放置在此目录

详细文档: https://developer.apple.com/documentation/xcode/managing-your-team-s-signing-assets
`;

    await fs.writeFile(
      path.join(brandDir, 'certificate', 'prod', 'README.md'),
      readmeContent
    );

    // 保存配置文件
    const indexPath = path.join(brandDir, 'index.ts');
    await fs.writeFile(indexPath, content, 'utf-8');

    res.json({
      success: true,
      message: `品牌配置 ${alias} 导入成功`,
      path: brandDir
    });
  } catch (error) {
    console.error('导入配置错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 上传 Logo
async function uploadLogo(req, res) {
  try {
    const { alias } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    // 验证文件类型
    if (file.mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Logo 必须是 PNG 格式' });
    }

    // 验证图片尺寸
    let metadata;
    try {
      const sharp = require('sharp');
      metadata = await sharp(file.buffer).metadata();
    } catch (sharpError) {
      // 如果 sharp 未安装，使用简单的验证（仅验证文件大小和类型）
      // 前端已经验证了尺寸，这里只做基本检查
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Logo 文件过大，请确保文件小于 5MB' });
      }
      // 如果 sharp 未安装，跳过尺寸验证（前端已验证）
      metadata = { width: 1024, height: 1024 }; // 假设通过
    }
    
    if (metadata && (metadata.width !== 1024 || metadata.height !== 1024)) {
      return res.status(400).json({ 
        error: `Logo 尺寸必须是 1024x1024，当前尺寸：${metadata.width}x${metadata.height}` 
      });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);
    const logoPath = path.join(brandDir, 'logo.png');

    // 检查品牌目录是否存在
    if (!(await fs.pathExists(brandDir))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 如果已存在 logo，先删除
    if (await fs.pathExists(logoPath)) {
      await fs.remove(logoPath);
    }

    // 保存新 logo
    await fs.writeFile(logoPath, file.buffer);

    res.json({
      success: true,
      message: 'Logo 上传成功',
      url: `/appConfig/${folderName}/logo.png`
    });
  } catch (error) {
    console.error('上传 Logo 错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 删除 Logo
async function deleteLogo(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }
    
    const appConfigDir = getAppConfigDir();
    const logoPath = path.join(appConfigDir, folderName, 'logo.png');

    if (await fs.pathExists(logoPath)) {
      await fs.remove(logoPath);
      res.json({
        success: true,
        message: 'Logo 删除成功'
      });
    } else {
      res.json({
        success: true,
        message: 'Logo 不存在'
      });
    }
  } catch (error) {
    console.error('删除 Logo 错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 获取 Logo URL
async function getLogo(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.json({ exists: false, url: null });
    }
    
    const appConfigDir = getAppConfigDir();
    const logoPath = path.join(appConfigDir, folderName, 'logo.png');

    if (await fs.pathExists(logoPath)) {
      res.json({
        exists: true,
        url: `/appConfig/${folderName}/logo.png`
      });
    } else {
      res.json({
        exists: false,
        url: null
      });
    }
  } catch (error) {
    console.error('获取 Logo 错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 上传 P12 证书
async function uploadP12(req, res) {
  try {
    const { alias } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的 .p12 文件' });
    }

    // 验证文件类型
    if (!file.originalname.toLowerCase().endsWith('.p12')) {
      return res.status(400).json({ error: '文件必须是 .p12 格式' });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    const appConfigDir = getAppConfigDir();
    const certDir = path.join(appConfigDir, folderName, 'certificate', 'prod');
    const p12Path = path.join(certDir, 'app.p12');

    // 检查品牌目录是否存在
    if (!(await fs.pathExists(path.join(appConfigDir, folderName)))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 确保证书目录存在
    await fs.mkdirp(certDir);

    // 如果已存在，先删除
    if (await fs.pathExists(p12Path)) {
      await fs.remove(p12Path);
    }

    // 保存新文件（重命名为 app.p12）
    await fs.writeFile(p12Path, file.buffer);

    res.json({
      success: true,
      message: 'P12 证书上传成功',
      filename: 'app.p12'
    });
  } catch (error) {
    console.error('上传 P12 证书错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 删除 P12 证书
async function deleteP12(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }
    
    const appConfigDir = getAppConfigDir();
    const p12Path = path.join(appConfigDir, folderName, 'certificate', 'prod', 'app.p12');

    if (await fs.pathExists(p12Path)) {
      await fs.remove(p12Path);
      res.json({
        success: true,
        message: 'P12 证书删除成功'
      });
    } else {
      res.json({
        success: true,
        message: 'P12 证书不存在'
      });
    }
  } catch (error) {
    console.error('删除 P12 证书错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 获取 P12 证书信息
async function getP12(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.json({ exists: false, filename: null });
    }
    
    const appConfigDir = getAppConfigDir();
    const p12Path = path.join(appConfigDir, folderName, 'certificate', 'prod', 'app.p12');

    if (await fs.pathExists(p12Path)) {
      const stats = await fs.stat(p12Path);
      res.json({
        exists: true,
        filename: 'app.p12',
        size: stats.size,
        uploadedAt: stats.mtime
      });
    } else {
      res.json({
        exists: false,
        filename: null
      });
    }
  } catch (error) {
    console.error('获取 P12 证书错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 上传 Mobileprovision 文件
async function uploadMobileprovision(req, res) {
  try {
    const { alias } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的 .mobileprovision 文件' });
    }

    // 验证文件类型
    if (!file.originalname.toLowerCase().endsWith('.mobileprovision')) {
      return res.status(400).json({ error: '文件必须是 .mobileprovision 格式' });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    const appConfigDir = getAppConfigDir();
    const certDir = path.join(appConfigDir, folderName, 'certificate', 'prod');
    const mobileprovisionPath = path.join(certDir, 'app.mobileprovision');

    // 检查品牌目录是否存在
    if (!(await fs.pathExists(path.join(appConfigDir, folderName)))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 确保证书目录存在
    await fs.mkdirp(certDir);

    // 如果已存在，先删除
    if (await fs.pathExists(mobileprovisionPath)) {
      await fs.remove(mobileprovisionPath);
    }

    // 保存新文件（重命名为 app.mobileprovision）
    await fs.writeFile(mobileprovisionPath, file.buffer);

    res.json({
      success: true,
      message: 'Mobileprovision 文件上传成功',
      filename: 'app.mobileprovision'
    });
  } catch (error) {
    console.error('上传 Mobileprovision 文件错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 删除 Mobileprovision 文件
async function deleteMobileprovision(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }
    
    const appConfigDir = getAppConfigDir();
    const mobileprovisionPath = path.join(appConfigDir, folderName, 'certificate', 'prod', 'app.mobileprovision');

    if (await fs.pathExists(mobileprovisionPath)) {
      await fs.remove(mobileprovisionPath);
      res.json({
        success: true,
        message: 'Mobileprovision 文件删除成功'
      });
    } else {
      res.json({
        success: true,
        message: 'Mobileprovision 文件不存在'
      });
    }
  } catch (error) {
    console.error('删除 Mobileprovision 文件错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 获取 Mobileprovision 文件信息
async function getMobileprovision(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.json({ exists: false, filename: null });
    }
    
    const appConfigDir = getAppConfigDir();
    const mobileprovisionPath = path.join(appConfigDir, folderName, 'certificate', 'prod', 'app.mobileprovision');

    if (await fs.pathExists(mobileprovisionPath)) {
      const stats = await fs.stat(mobileprovisionPath);
      res.json({
        exists: true,
        filename: 'app.mobileprovision',
        size: stats.size,
        uploadedAt: stats.mtime
      });
    } else {
      res.json({
        exists: false,
        filename: null
      });
    }
  } catch (error) {
    console.error('获取 Mobileprovision 文件错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 上传 Other 文件（支持多个文件）
async function uploadOtherFile(req, res) {
  try {
    const { alias } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    const appConfigDir = getAppConfigDir();
    const otherDir = path.join(appConfigDir, folderName, 'other');

    // 检查品牌目录是否存在
    if (!(await fs.pathExists(path.join(appConfigDir, folderName)))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 确保 other 目录存在
    await fs.mkdirp(otherDir);

    // 处理中文文件名：将中文转换为拼音，避免编码问题
    // 先解码可能的 URL 编码，然后转换为拼音
    const decodedFilename = decodeFilename(file.originalname);
    const finalFilename = convertChineseToPinyin(decodedFilename);

    // 保存文件（使用转换后的拼音文件名）
    const filePath = path.join(otherDir, finalFilename);
    await fs.writeFile(filePath, file.buffer);

    res.json({
      success: true,
      message: '文件上传成功',
      filename: finalFilename
    });
  } catch (error) {
    console.error('上传 Other 文件错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 删除 Other 文件
async function deleteOtherFile(req, res) {
  try {
    const { alias, filename } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }
    
    // 解码文件名（处理中文文件名）
    const decodedFilename = decodeFilename(filename);
    
    const appConfigDir = getAppConfigDir();
    const filePath = path.join(appConfigDir, folderName, 'other', decodedFilename);

    // 安全检查：确保文件在 other 目录内
    const otherDir = path.join(appConfigDir, folderName, 'other');
    const resolvedFilePath = path.resolve(filePath);
    const resolvedOtherDir = path.resolve(otherDir);
    
    if (!resolvedFilePath.startsWith(resolvedOtherDir)) {
      return res.status(400).json({ error: '无效的文件路径' });
    }

    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      res.json({
        success: true,
        message: '文件删除成功'
      });
    } else {
      res.json({
        success: true,
        message: '文件不存在'
      });
    }
  } catch (error) {
    console.error('删除 Other 文件错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 获取 Other 文件列表
async function getOtherFiles(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.json({ files: [] });
    }
    
    const appConfigDir = getAppConfigDir();
    const otherDir = path.join(appConfigDir, folderName, 'other');

    if (!(await fs.pathExists(otherDir))) {
      return res.json({ files: [] });
    }

    const files = await fs.readdir(otherDir);
    const fileList = [];

    for (const file of files) {
      const filePath = path.join(otherDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        fileList.push({
          filename: file,
          size: stats.size,
          uploadedAt: stats.mtime
        });
      }
    }

    // 按文件名排序
    fileList.sort((a, b) => a.filename.localeCompare(b.filename));

    res.json({ files: fileList });
  } catch (error) {
    console.error('获取 Other 文件列表错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 删除下载的 APK 文件
async function deleteDownloadedAPK(req, res) {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: '缺少文件名参数' });
    }

    const downloadsDir = path.join(__dirname, '../downloads');
    const filePath = path.join(downloadsDir, filename);

    // 安全检查：确保文件在 downloads 目录内
    const resolvedFilePath = path.resolve(filePath);
    const resolvedDownloadsDir = path.resolve(downloadsDir);
    
    if (!resolvedFilePath.startsWith(resolvedDownloadsDir)) {
      return res.status(400).json({ error: '无效的文件路径' });
    }

    // 只允许删除 .apk 文件
    if (!filename.toLowerCase().endsWith('.apk')) {
      return res.status(400).json({ error: '只能删除 APK 文件' });
    }

    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      res.json({
        success: true,
        message: 'APK 文件删除成功'
      });
    } else {
      res.json({
        success: true,
        message: 'APK 文件不存在'
      });
    }
  } catch (error) {
    console.error('删除 APK 文件错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 删除品牌配置
async function deleteConfig(req, res) {
  try {
    const { alias } = req.params;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }
    
    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);

    // 检查目录是否存在
    if (!(await fs.pathExists(brandDir))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 删除整个品牌目录
    await fs.remove(brandDir);

    // 更新 appConfig/index.ts
    await updateAppConfigIndex();

    res.json({
      success: true,
      message: `品牌配置 ${alias} 删除成功`
    });
  } catch (error) {
    console.error('删除配置错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 存储正在运行的打包进程
const runningBuilds = new Map();

// 取消云打包
async function cancelCloudBuild(req, res) {
  try {
    const { alias } = req.params;
    const buildKey = `build_${alias}`;
    const childProcess = runningBuilds.get(buildKey);
    
    if (childProcess) {
      // 终止进程
      childProcess.kill('SIGTERM');
      runningBuilds.delete(buildKey);
      res.json({ success: true, message: '打包已取消' });
    } else {
      res.status(404).json({ success: false, error: '未找到正在运行的打包任务' });
    }
  } catch (error) {
    console.error('取消打包错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// 更新版本号
async function updateVersion(req, res) {
  try {
    const { alias } = req.params;
    const { versionName, androidVersionCode, iosVersionCode } = req.body;
    
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ 
        success: false,
        error: `配置不存在: ${alias}` 
      });
    }

    const appConfigDir = getAppConfigDir();
    const indexPath = path.join(appConfigDir, folderName, 'index.ts');
    
    if (!(await fs.pathExists(indexPath))) {
      return res.status(404).json({ 
        success: false,
        error: `配置不存在: ${alias}` 
      });
    }

    let content = await fs.readFile(indexPath, 'utf-8');
    
    // 更新版本号
    if (versionName) {
      content = content.replace(
        /versionName:\s*['"]([^'"]+)['"]/,
        `versionName: '${versionName}'`
      );
    }
    
    // 更新 Android 构建号
    if (androidVersionCode !== undefined && androidVersionCode !== null) {
      content = content.replace(
        /androidVersionCode:\s*['"]?(\d+)['"]?/,
        `androidVersionCode: '${androidVersionCode}'`
      );
    }
    
    // 更新 iOS 构建号
    if (iosVersionCode !== undefined && iosVersionCode !== null) {
      content = content.replace(
        /iosVersionCode:\s*['"]?(\d+)['"]?/,
        `iosVersionCode: '${iosVersionCode}'`
      );
    }
    
    // 同时更新通用 versionCode（使用平台对应的构建号）
    const platform = req.body.platform || 'android';
    const newVersionCode = platform === 'ios' ? iosVersionCode : androidVersionCode;
    if (newVersionCode !== undefined && newVersionCode !== null) {
      content = content.replace(
        /versionCode:\s*['"]?(\d+)['"]?/,
        `versionCode: '${newVersionCode}'`
      );
    }
    
    await fs.writeFile(indexPath, content, 'utf-8');
    
    res.json({
      success: true,
      message: '版本号更新成功'
    });
  } catch (error) {
    console.error('更新版本号错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 云打包
async function cloudBuild(req, res) {
  let childProcess = null;
  const buildKey = `build_${req.params.alias}`;
  
  try {
    const { alias } = req.params;
    const { platform, operation, userVersionDesc, versionName, androidVersionCode, iosVersionCode, branch } = req.body;
    
    if (!platform) {
      return res.status(400).json({ 
        success: false,
        error: '缺少必填参数: platform' 
      });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ 
        success: false,
        error: `配置不存在: ${alias}` 
      });
    }

    // 读取配置文件，获取品牌信息（用于验证环境）
    const appConfigDir = getAppConfigDir();
    const indexPath = path.join(appConfigDir, folderName, 'index.ts');
    
    if (!(await fs.pathExists(indexPath))) {
      return res.status(404).json({ 
        success: false,
        error: `配置不存在: ${alias}` 
      });
    }

    const content = await fs.readFile(indexPath, 'utf-8');
    const config = parseConfigContent(content);
    
    // 根据 baseUrlRegion 自动判断环境
    let environment = 'production';
    if (config.baseUrlRegion === 'test' || config.isTest) {
      environment = 'test';
    }
    
    // 验证环境与品牌配置是否匹配
    if (environment === 'test' && !config.isTest) {
      return res.status(400).json({ 
        success: false,
        error: `品牌 "${alias}" 不是测试品牌（isTest: true），不能使用测试环境打包` 
      });
    }
    
    if (environment === 'production' && config.isTest) {
      return res.status(400).json({ 
        success: false,
        error: `品牌 "${alias}" 是测试品牌（isTest: true），不能使用生产环境打包` 
      });
    }

    const projectPath = getProjectPath();
    
    // 检查项目目录是否存在
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ 
        success: false,
        error: `项目目录不存在: ${projectPath}。请设置环境变量 MP_EATWELL_PATH 或在项目目录下执行命令。` 
      });
    }

    // 检查项目目录是否包含 package.json（确认是有效的项目目录）
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return res.status(404).json({ 
        success: false,
        error: `项目目录无效: ${projectPath}。目录中未找到 package.json 文件。` 
      });
    }

    // 如果指定了分支，先切换分支并执行 git pull 和 pnpm i（在更新版本号之前）
    if (branch) {
      const { execSync } = require('child_process');
      try {
        // 先获取远程分支信息
        console.log('获取远程分支信息...');
        execSync('git fetch origin', { 
          encoding: 'utf-8',
          cwd: projectPath,
          stdio: 'pipe'
        });

        // 获取当前分支
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
          encoding: 'utf-8',
          cwd: projectPath,
          stdio: 'pipe'
        }).trim();

        // 如果当前分支和目标分支不同，切换分支
        if (currentBranch !== branch) {
          console.log(`切换分支: ${currentBranch} -> ${branch}`);
          
          // 检查是否有本地修改，如果有则先 stash
          try {
            const statusOutput = execSync('git status --porcelain', { 
              encoding: 'utf-8',
              cwd: projectPath,
              stdio: 'pipe'
            }).trim();
            
            if (statusOutput) {
              console.log('检测到本地修改，先执行 git stash...');
              execSync('git stash push -m "Auto stash before branch switch for cloud build"', { 
                encoding: 'utf-8',
                cwd: projectPath,
                stdio: 'pipe'
              });
              console.log('本地修改已暂存');
            }
          } catch (stashError) {
            console.warn('检查或暂存本地修改时出错:', stashError.message);
            // 继续执行，不中断流程
          }
          
          // 检查本地是否有该分支
          let localBranchExists = false;
          try {
            execSync(`git rev-parse --verify ${branch}`, { 
              encoding: 'utf-8',
              cwd: projectPath,
              stdio: 'pipe'
            });
            localBranchExists = true;
          } catch (e) {
            // 本地分支不存在
            localBranchExists = false;
          }

          if (localBranchExists) {
            // 本地分支存在，直接切换
            execSync(`git checkout ${branch}`, { 
              encoding: 'utf-8',
              cwd: projectPath,
              stdio: 'pipe'
            });
          } else {
            // 本地分支不存在，检查远程是否有该分支
            let remoteBranchExists = false;
            try {
              execSync(`git rev-parse --verify origin/${branch}`, { 
                encoding: 'utf-8',
                cwd: projectPath,
                stdio: 'pipe'
              });
              remoteBranchExists = true;
            } catch (e) {
              // 远程分支也不存在
              remoteBranchExists = false;
            }

            if (remoteBranchExists) {
              // 远程分支存在，创建本地分支并跟踪远程分支
              execSync(`git checkout -b ${branch} origin/${branch}`, { 
                encoding: 'utf-8',
                cwd: projectPath,
                stdio: 'pipe'
              });
            } else {
              return res.status(400).json({ 
                success: false,
                error: `分支 "${branch}" 不存在（本地和远程都不存在）` 
              });
            }
          }
        }

        // 执行 git pull
        console.log(`执行 git pull...`);
        execSync('git pull', { 
          encoding: 'utf-8',
          cwd: projectPath,
          stdio: 'pipe'
        });

        // 执行 pnpm i
        console.log(`执行 pnpm i...`);
        execSync('pnpm i', { 
          encoding: 'utf-8',
          cwd: projectPath,
          stdio: 'pipe'
        });
      } catch (error) {
        console.error('切换分支或更新依赖失败:', error);
        return res.status(500).json({ 
          success: false,
          error: `切换分支或更新依赖失败: ${error.message}` 
        });
      }
    }

    // 切换分支后再更新版本号（避免切换分支时因为本地修改而失败）
    if (versionName || androidVersionCode !== undefined || iosVersionCode !== undefined) {
      const folderNameForUpdate = await findFolderByAlias(alias);
      if (folderNameForUpdate) {
        const appConfigDirForUpdate = getAppConfigDir();
        const indexPathForUpdate = path.join(appConfigDirForUpdate, folderNameForUpdate, 'index.ts');
        
        if (await fs.pathExists(indexPathForUpdate)) {
          let contentForUpdate = await fs.readFile(indexPathForUpdate, 'utf-8');
          
          // 更新版本号
          if (versionName) {
            contentForUpdate = contentForUpdate.replace(
              /versionName:\s*['"]([^'"]+)['"]/,
              `versionName: '${versionName}'`
            );
          }
          
          // 更新 Android 构建号
          if (androidVersionCode !== undefined && androidVersionCode !== null) {
            contentForUpdate = contentForUpdate.replace(
              /androidVersionCode:\s*['"]?(\d+)['"]?/,
              `androidVersionCode: '${androidVersionCode}'`
            );
          }
          
          // 更新 iOS 构建号
          if (iosVersionCode !== undefined && iosVersionCode !== null) {
            contentForUpdate = contentForUpdate.replace(
              /iosVersionCode:\s*['"]?(\d+)['"]?/,
              `iosVersionCode: '${iosVersionCode}'`
            );
          }
          
          // 同时更新通用 versionCode（使用平台对应的构建号）
          const newVersionCode = platform === 'ios' ? iosVersionCode : androidVersionCode;
          if (newVersionCode !== undefined && newVersionCode !== null) {
            contentForUpdate = contentForUpdate.replace(
              /versionCode:\s*['"]?(\d+)['"]?/,
              `versionCode: '${newVersionCode}'`
            );
          }
          
          await fs.writeFile(indexPathForUpdate, contentForUpdate, 'utf-8');
        }
      }
    }

    // 构建命令参数
    const { spawn } = require('child_process');
    
    // 设置环境变量和参数（默认增加版本号）
    const env = {
      ...process.env,
      SKIP_CONFIRM: 'true',
      BRAND: folderName, // 使用文件夹名作为品牌名
      OPERATION: operation || 'wgt',
      USER_VERSION_DESC: userVersionDesc || ''
    };

    console.log(`开始执行云打包，品牌: ${folderName}，平台: ${platform}，环境: ${environment}`);
    console.log(`操作类型: ${operation || 'wgt'}`);
    console.log(`项目路径: ${projectPath}`);
    if (branch) {
      console.log(`分支: ${branch}`);
    }

    // 使用 spawn 异步执行命令，实时返回输出
    childProcess = spawn('npm', ['run', `cloud:build:${platform}:${environment}`], {
      cwd: projectPath,
      env: env,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 保存进程引用，以便可以中断
    runningBuilds.set(buildKey, childProcess);

    let output = '';
    let errorOutput = '';

    // 返回流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

    const sendMessage = (type, data) => {
      try {
        res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
      } catch (e) {
        // 客户端可能已断开连接
        console.error('发送消息失败:', e.message);
      }
    };

    // 监听客户端断开连接
    req.on('close', () => {
      if (childProcess && !childProcess.killed) {
        console.log('客户端断开连接，终止打包进程');
        childProcess.kill('SIGTERM');
        runningBuilds.delete(buildKey);
      }
    });

    childProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text);
      // 实时发送输出
      sendMessage('output', { text });
    });

    childProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text);
      // 实时发送错误输出
      sendMessage('output', { text });
    });

    childProcess.on('close', (code, signal) => {
      runningBuilds.delete(buildKey);
      if (signal === 'SIGTERM') {
        sendMessage('cancelled', { message: '打包已取消', output, errorOutput });
      } else if (code === 0) {
        sendMessage('success', { message: '云打包完成', output, errorOutput });
      } else {
        sendMessage('error', { message: '云打包失败', output, errorOutput, code });
      }
      res.end();
    });

    childProcess.on('error', (error) => {
      runningBuilds.delete(buildKey);
      sendMessage('error', { message: '执行命令失败', error: error.message });
      res.end();
    });

  } catch (error) {
    if (childProcess) {
      runningBuilds.delete(buildKey);
    }
    console.error('云打包错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 生成 unipush 云函数（全局操作）
async function generateUnipushCloudFunction(req, res) {
  try {
    const { execSync } = require('child_process');
    const projectPath = getProjectPath();
    
    // 检查项目目录是否存在
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ 
        success: false,
        error: `项目目录不存在: ${projectPath}。请设置环境变量 MP_EATWELL_PATH 或在项目目录下执行命令。` 
      });
    }

    // 检查项目目录是否包含 package.json（确认是有效的项目目录）
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return res.status(404).json({ 
        success: false,
        error: `项目目录无效: ${projectPath}。目录中未找到 package.json 文件。` 
      });
    }

    console.log(`开始执行 generate:uni-push 命令，项目路径: ${projectPath}`);
    
    // 在项目目录下执行 npm run generate:uni-push
    const output = execSync('npm run generate:uni-push', { 
      encoding: 'utf-8',
      cwd: projectPath,
      stdio: 'pipe',
      shell: true
    });

    console.log('generate:uni-push 执行成功');
    console.log('输出:', output);

    res.json({
      success: true,
      message: '云函数生成成功',
      output: output
    });
  } catch (error) {
    console.error('生成云函数错误:', error);
    const errorMessage = error.message || '执行命令失败';
    const errorOutput = error.stdout || error.stderr || '';
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      output: errorOutput
    });
  }
}

// 执行命令并设置超时
function execWithTimeout(command, options, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const child = exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });

    // 设置超时
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`命令执行超时: ${command}`));
    }, timeout);

    child.on('exit', () => {
      clearTimeout(timer);
    });
  });
}

// 获取 Git 分支列表
async function getGitBranches(req, res) {
  try {
    const projectPath = getProjectPath();
    
    // 检查项目目录是否存在
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ 
        success: false,
        error: `项目目录不存在: ${projectPath}` 
      });
    }

    // 检查是否是 git 仓库
    const gitDir = path.join(projectPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return res.status(400).json({ 
        success: false,
        error: `项目目录不是 Git 仓库: ${projectPath}` 
      });
    }

    // 先检查是否有远程仓库配置
    let hasRemote = false;
    try {
      const remoteOutput = await execWithTimeout('git remote', { 
        encoding: 'utf-8',
        cwd: projectPath
      }, 3000); // 3秒超时
      hasRemote = remoteOutput.trim().length > 0;
    } catch (error) {
      console.warn('检查远程仓库配置失败:', error.message);
    }

    // 如果有远程仓库，尝试获取远程分支信息（设置超时，避免卡死）
    if (hasRemote) {
      try {
        await execWithTimeout('git fetch origin --prune', { 
          encoding: 'utf-8',
          cwd: projectPath
        }, 8000); // 8秒超时
      } catch (error) {
        // 如果 fetch 失败，继续尝试获取本地分支
        console.warn('获取远程分支信息失败（可能网络问题）:', error.message);
      }
    }
    
    // 获取所有分支（本地和远程）
    let localBranches = [];
    try {
      const localBranchesOutput = await execWithTimeout('git branch', { 
        encoding: 'utf-8',
        cwd: projectPath
      }, 5000); // 5秒超时
      localBranches = localBranchesOutput.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('*'))
        .map(line => line.replace(/^\*\s*/, ''));
    } catch (error) {
      console.error('获取本地分支失败:', error.message);
      return res.status(500).json({ 
        success: false,
        error: `获取本地分支失败: ${error.message}` 
      });
    }

    let remoteBranches = [];
    try {
      const remoteBranchesOutput = await execWithTimeout('git branch -r', { 
        encoding: 'utf-8',
        cwd: projectPath
      }, 5000); // 5秒超时
      remoteBranches = remoteBranchesOutput.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.includes('HEAD'))
        .map(line => line.replace(/^origin\//, ''));
    } catch (error) {
      console.warn('获取远程分支列表失败:', error.message);
      // 远程分支获取失败不影响，继续使用本地分支
    }

    // 合并并去重
    const allBranches = [...new Set([...localBranches, ...remoteBranches])].sort();

    // 获取当前分支
    let currentBranch = '';
    try {
      currentBranch = (await execWithTimeout('git rev-parse --abbrev-ref HEAD', { 
        encoding: 'utf-8',
        cwd: projectPath
      }, 5000)).trim(); // 5秒超时
    } catch (error) {
      console.error('获取当前分支失败:', error.message);
      // 获取当前分支失败不影响，继续返回分支列表
    }

    res.json({
      success: true,
      branches: allBranches,
      currentBranch: currentBranch
    });
  } catch (error) {
    console.error('获取分支列表错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || '获取分支列表失败' 
    });
  }
}

// 生成 applinks（全局操作）
async function generateAppLinks(req, res) {
  try {
    const { execSync } = require('child_process');
    const projectPath = getProjectPath();
    
    // 检查项目目录是否存在
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ 
        success: false,
        error: `项目目录不存在: ${projectPath}。请设置环境变量 MP_EATWELL_PATH 或在项目目录下执行命令。` 
      });
    }

    // 检查项目目录是否包含 package.json（确认是有效的项目目录）
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return res.status(404).json({ 
        success: false,
        error: `项目目录无效: ${projectPath}。目录中未找到 package.json 文件。` 
      });
    }

    console.log(`开始执行 generate:apps-json 命令，项目路径: ${projectPath}`);
    
    // 在项目目录下执行 npm run generate:apps-json
    const output = execSync('npm run generate:apps-json', { 
      encoding: 'utf-8',
      cwd: projectPath,
      stdio: 'pipe',
      shell: true
    });

    console.log('generate:apps-json 执行成功');
    console.log('输出:', output);

    res.json({
      success: true,
      message: 'applinks 生成成功',
      output: output
    });
  } catch (error) {
    console.error('生成 applinks 错误:', error);
    const errorMessage = error.message || '执行命令失败';
    const errorOutput = error.stdout || error.stderr || '';
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      output: errorOutput
    });
  }
}

// AAB 转 APK（内部函数，不通过 HTTP 请求）
async function convertAABToAPKInternal(file, alias) {
  try {
    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      throw new Error('品牌配置不存在');
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);
    const indexPath = path.join(brandDir, 'index.ts');
    
    if (!(await fs.pathExists(indexPath))) {
      throw new Error('配置文件不存在');
    }

    // 读取配置文件，获取品牌信息
    const content = await fs.readFile(indexPath, 'utf-8');
    const config = parseConfigContent(content);

    // 验证是否有 Android 配置（packagename）
    if (!config.packagename || config.packagename.trim() === '') {
      throw new Error('该品牌未配置 Android 包名（packagename），无法进行 AAB 转 APK 操作');
    }

    // 查找 keystore 文件
    const keystorePath = await findKeystoreFile(brandDir, config.aliasname || alias);
    if (!keystorePath || !(await fs.pathExists(keystorePath))) {
      throw new Error('未找到 Android 签名文件（.keystore），请先上传或生成 keystore 文件');
    }

    // 查找 bundletool-all.jar 文件（优先从 appConfig 目录查找）
    const bundletoolPath = await findBundletoolPath();
    if (!bundletoolPath) {
      throw new Error('bundletool-all.jar 文件不存在，请确保文件位于 appConfig 目录');
    }

    // 创建临时目录保存上传的 AAB 文件
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdirp(tempDir);
    const tempAabPath = path.join(tempDir, `temp_${Date.now()}.aab`);
    await fs.writeFile(tempAabPath, file.buffer);

    // 从 AAB 文件中提取包名，验证是否与选择的品牌匹配
    try {
      const { execSync } = require('child_process');
      
      // 使用 bundletool 提取 AAB 文件中的包名
      const dumpCommand = `java -jar "${bundletoolPath}" dump manifest --bundle="${tempAabPath}"`;
      console.log(`提取 AAB 包名: ${dumpCommand}`);
      const manifestOutput = execSync(dumpCommand, { encoding: 'utf-8', stdio: 'pipe' });
      
      // 从 manifest 中提取 package 属性
      const packageMatch = manifestOutput.match(/package=['"]([^'"]+)['"]/);
      if (packageMatch && packageMatch[1]) {
        const aabPackageName = packageMatch[1];
        console.log(`AAB 文件中的包名: ${aabPackageName}`);
        console.log(`品牌配置中的包名: ${config.packagename}`);
        
        // 验证包名是否匹配
        if (aabPackageName !== config.packagename) {
          await fs.remove(tempAabPath);
          throw new Error(`AAB 文件中的包名（${aabPackageName}）与选择的品牌（${alias}）的包名（${config.packagename}）不匹配`);
        }
      } else {
        console.warn('无法从 AAB 文件中提取包名，跳过验证');
      }
    } catch (extractError) {
      console.warn('提取 AAB 包名失败，跳过验证:', extractError.message);
      // 如果提取失败，继续执行（可能是 bundletool 版本问题或其他原因）
    }

    // 创建 downloads 目录（如果不存在）
    const downloadsDir = path.join(__dirname, '../downloads');
    await fs.mkdirp(downloadsDir);

    // 使用原始 AAB 文件名（去掉 .aab 后缀，加上 .apk）
    const originalFileName = file.originalname.replace(/\.aab$/i, '');
    const apkFileName = `${originalFileName}.apk`;
    
    // 生成输出文件名
    const versionName = config.versionName || '1.0.0';
    const versionCode = config.androidVersionCode || config.versionCode || '1';
    const apksPath = path.join(downloadsDir, `${originalFileName}.apks`);
    const outputDir = path.dirname(apksPath);

    const { execSync } = require('child_process');

    // 使用 bundletool 生成 apks
    const aliasname = config.aliasname || alias;
    const password = config.password || '123456';
    const bundletoolCommand = `java -jar "${bundletoolPath}" build-apks --output="${apksPath}" --mode=universal --ks="${keystorePath}" --ks-key-alias="${aliasname}" --key-pass=pass:${password} --bundle="${tempAabPath}" --ks-pass=pass:${password}`;
    
    console.log(`执行命令: ${bundletoolCommand}`);
    execSync(bundletoolCommand, { stdio: 'pipe' });
    console.log('✅ APKS 文件生成成功');

    // 解压 apks 文件
    const unzipCommand = `unzip "${apksPath}" -d "${outputDir}"`;
    console.log(`执行命令: ${unzipCommand}`);
    execSync(unzipCommand, { stdio: 'pipe' });

    // 查找生成的 APK 文件
    const files = await fs.readdir(outputDir);
    const apkFiles = files.filter(f => f === 'universal.apk');

    if (apkFiles.length === 0) {
      // 清理临时文件
      await fs.remove(tempAabPath);
      if (await fs.pathExists(apksPath)) {
        await fs.remove(apksPath);
      }
      throw new Error('未找到生成的 APK 文件');
    }

    // 重命名 APK 文件（使用原始文件名）
    const sourceApk = path.join(outputDir, apkFiles[0]);
    const targetApk = path.join(downloadsDir, apkFileName);
    await fs.copyFile(sourceApk, targetApk);

    // 清理临时文件
    try {
      await fs.remove(tempAabPath);
      if (await fs.pathExists(apksPath)) {
        await fs.remove(apksPath);
      }
      await fs.remove(sourceApk);
      const tocPath = path.join(outputDir, 'toc.pb');
      if (await fs.pathExists(tocPath)) {
        await fs.remove(tocPath);
      }
    } catch (cleanupError) {
      console.warn('清理临时文件时出错:', cleanupError.message);
    }

    // 返回转换后的 APK 文件路径
    return targetApk;
  } catch (error) {
    console.error('AAB 转 APK 内部函数错误:', error);
    throw error;
  }
}

// AAB 转 APK（HTTP 接口）
async function convertAABToAPK(req, res) {
  try {
    const { alias } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请选择要转换的 AAB 文件' });
    }

    // 验证文件类型
    if (!file.originalname.toLowerCase().endsWith('.aab')) {
      return res.status(400).json({ error: '文件必须是 .aab 格式' });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, folderName);
    const indexPath = path.join(brandDir, 'index.ts');
    
    if (!(await fs.pathExists(indexPath))) {
      return res.status(404).json({ error: '配置文件不存在' });
    }

    // 读取配置文件，获取品牌信息
    const content = await fs.readFile(indexPath, 'utf-8');
    const config = parseConfigContent(content);

    // 验证是否有 Android 配置（packagename）
    if (!config.packagename || config.packagename.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: '该品牌未配置 Android 包名（packagename），无法进行 AAB 转 APK 操作' 
      });
    }

    // 查找 keystore 文件
    const keystorePath = await findKeystoreFile(brandDir, config.aliasname || alias);
    if (!keystorePath || !(await fs.pathExists(keystorePath))) {
      return res.status(404).json({ 
        success: false,
        error: '未找到 Android 签名文件（.keystore），请先上传或生成 keystore 文件' 
      });
    }

    // 查找 bundletool-all.jar 文件（优先从 appConfig 目录查找）
    const bundletoolPath = await findBundletoolPath();
    if (!bundletoolPath) {
      return res.status(404).json({ 
        success: false,
        error: 'bundletool-all.jar 文件不存在，请确保文件位于 appConfig 目录' 
      });
    }

    // 创建临时目录保存上传的 AAB 文件
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdirp(tempDir);
    const tempAabPath = path.join(tempDir, `temp_${Date.now()}.aab`);
    await fs.writeFile(tempAabPath, file.buffer);

    // 从 AAB 文件中提取包名，验证是否与选择的品牌匹配
    try {
      const { execSync } = require('child_process');
      
      // 使用 bundletool 提取 AAB 文件中的包名
      const dumpCommand = `java -jar "${bundletoolPath}" dump manifest --bundle="${tempAabPath}"`;
      console.log(`提取 AAB 包名: ${dumpCommand}`);
      const manifestOutput = execSync(dumpCommand, { encoding: 'utf-8', stdio: 'pipe' });
      
      // 从 manifest 中提取 package 属性
      const packageMatch = manifestOutput.match(/package=['"]([^'"]+)['"]/);
      if (packageMatch && packageMatch[1]) {
        const aabPackageName = packageMatch[1];
        console.log(`AAB 文件中的包名: ${aabPackageName}`);
        console.log(`品牌配置中的包名: ${config.packagename}`);
        
        // 验证包名是否匹配
        if (aabPackageName !== config.packagename) {
          // 清理临时文件
          await fs.remove(tempAabPath);
          
          // 尝试根据包名自动查找匹配的品牌
          const allConfigs = await getConfigsForPackageName(aabPackageName);
          let errorMessage = `AAB 文件中的包名（${aabPackageName}）与选择的品牌（${alias}）的包名（${config.packagename}）不匹配。`;
          
          if (allConfigs.length > 0) {
            errorMessage += `\n\n检测到以下品牌配置的包名与 AAB 文件匹配：\n`;
            allConfigs.forEach(brand => {
              errorMessage += `  - ${brand.alias} (${brand.folderName})\n`;
            });
            errorMessage += `\n请选择正确的品牌进行转换。`;
          } else {
            errorMessage += `\n\n未找到包名为 ${aabPackageName} 的品牌配置。请确认 AAB 文件是否正确，或先创建对应的品牌配置。`;
          }
          
          return res.status(400).json({ 
            success: false,
            error: errorMessage
          });
        }
      } else {
        console.warn('无法从 AAB 文件中提取包名，跳过验证');
      }
    } catch (extractError) {
      console.warn('提取 AAB 包名失败，跳过验证:', extractError.message);
      // 如果提取失败，继续执行（可能是 bundletool 版本问题或其他原因）
    }

    // 创建 downloads 目录（如果不存在）
    const downloadsDir = path.join(__dirname, '../downloads');
    await fs.mkdirp(downloadsDir);

    // 使用原始 AAB 文件名（去掉 .aab 后缀，加上 .apk）
    const originalFileName = file.originalname.replace(/\.aab$/i, '');
    const apkFileName = `${originalFileName}.apk`;
    
    // 生成输出文件名
    const versionName = config.versionName || '1.0.0';
    const versionCode = config.androidVersionCode || config.versionCode || '1';
    const apksPath = path.join(downloadsDir, `${originalFileName}.apks`);
    const outputDir = path.dirname(apksPath);

    try {
      const { execSync } = require('child_process');

      // 使用 bundletool 生成 apks
      const aliasname = config.aliasname || alias;
      const password = config.password || '123456';
      const bundletoolCommand = `java -jar "${bundletoolPath}" build-apks --output="${apksPath}" --mode=universal --ks="${keystorePath}" --ks-key-alias="${aliasname}" --key-pass=pass:${password} --bundle="${tempAabPath}" --ks-pass=pass:${password}`;
      
      console.log(`执行命令: ${bundletoolCommand}`);
      execSync(bundletoolCommand, { stdio: 'pipe' });
      console.log('✅ APKS 文件生成成功');

      // 解压 apks 文件
      const unzipCommand = `unzip "${apksPath}" -d "${outputDir}"`;
      console.log(`执行命令: ${unzipCommand}`);
      execSync(unzipCommand, { stdio: 'pipe' });

      // 查找生成的 APK 文件
      const files = await fs.readdir(outputDir);
      const apkFiles = files.filter(file => file === 'universal.apk');

      if (apkFiles.length === 0) {
        // 清理临时文件
        await fs.remove(tempAabPath);
        if (await fs.pathExists(apksPath)) {
          await fs.remove(apksPath);
        }
        return res.status(500).json({ 
          success: false,
          error: '未找到生成的 APK 文件' 
        });
      }

      // 重命名 APK 文件（使用原始文件名）
      const sourceApk = path.join(outputDir, apkFiles[0]);
      const targetApk = path.join(downloadsDir, apkFileName);
      await fs.copyFile(sourceApk, targetApk);

      // 清理临时文件
      try {
        await fs.remove(tempAabPath);
        if (await fs.pathExists(apksPath)) {
          await fs.remove(apksPath);
        }
        await fs.remove(sourceApk);
        const tocPath = path.join(outputDir, 'toc.pb');
        if (await fs.pathExists(tocPath)) {
          await fs.remove(tocPath);
        }
      } catch (cleanupError) {
        console.warn('清理临时文件时出错:', cleanupError.message);
      }

      const stats = await fs.stat(targetApk);
      
      // 生成下载链接（相对于静态文件服务）
      const downloadFileName = path.basename(targetApk);
      const downloadUrl = `/downloads/${downloadFileName}`;
      
      res.json({
        success: true,
        message: 'AAB 转 APK 成功',
        apkPath: targetApk,
        apkFileName: downloadFileName,
        apkSize: stats.size,
        apkSizeMB: (stats.size / 1024 / 1024).toFixed(2),
        downloadUrl: downloadUrl
      });
    } catch (error) {
      // 清理临时文件
      try {
        await fs.remove(tempAabPath);
      } catch (e) {
        // 忽略清理错误
      }

      console.error('AAB 转 APK 失败:', error);
      const errorMessage = error.message || '转换失败';
      const errorOutput = error.stdout || error.stderr || '';
      
      return res.status(500).json({ 
        success: false,
        error: errorMessage,
        details: errorOutput
      });
    }
  } catch (error) {
    console.error('AAB 转 APK 错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 上传到蒲公英
async function uploadToPGYER(req, res) {
  try {
    const file = req.file;
    const installType = parseInt(req.body.installType) || 1;
    const password = req.body.password || '';
    const updateDescription = req.body.updateDescription || '';
    const customApiKey = req.body.apiKey ? req.body.apiKey.trim() : '';

    if (!file) {
      return res.status(400).json({ 
        success: false,
        error: '请选择要上传的文件' 
      });
    }

    // 验证文件类型
    const fileName = file.originalname.toLowerCase();
    const isAAB = fileName.endsWith('.aab');
    if (!fileName.endsWith('.apk') && !fileName.endsWith('.ipa') && !isAAB) {
      return res.status(400).json({ 
        success: false,
        error: '文件必须是 .apk、.ipa 或 .aab 格式' 
      });
    }

    // 如果是 AAB 文件，需要先转换为 APK
    let finalFilePath = null;
    if (isAAB) {
      const brandAlias = req.body.brandAlias;
      if (!brandAlias) {
        return res.status(400).json({ 
          success: false,
          error: 'AAB 文件需要指定品牌别名（brandAlias）' 
        });
      }

      try {
        // 调用内部 AAB 转 APK 函数
        const convertedApkPath = await convertAABToAPKInternal(file, brandAlias);
        if (!convertedApkPath) {
          return res.status(500).json({ 
            success: false,
            error: 'AAB 转 APK 失败' 
          });
        }
        finalFilePath = convertedApkPath;
        console.log(`AAB 转 APK 成功: ${finalFilePath}`);
      } catch (convertError) {
        console.error('AAB 转 APK 错误:', convertError);
        return res.status(500).json({ 
          success: false,
          error: `AAB 转 APK 失败: ${convertError.message}` 
        });
      }
    }

    // 蒲公英 API Key：优先使用自定义的，否则使用默认值
    const defaultApiKey = 'bfb4258d51ec656443252180367e20ff';
    const pgyerApiKey = customApiKey || defaultApiKey;
    
    if (customApiKey) {
      console.log('使用自定义 API Key');
    } else {
      console.log('使用默认 API Key');
    }

    // 创建临时目录保存上传的文件
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdirp(tempDir);
    
    // 如果已经转换了 AAB 文件，使用转换后的 APK 文件
    let tempFilePath;
    if (finalFilePath) {
      tempFilePath = finalFilePath;
    } else {
      tempFilePath = path.join(tempDir, `pgyer_${Date.now()}_${file.originalname}`);
      await fs.writeFile(tempFilePath, file.buffer);
    }

    try {
      const PGYERAppUploader = require('./PGYERAppUploader');
      const uploader = new PGYERAppUploader(pgyerApiKey);

      const uploadOptions = {
        filePath: tempFilePath,
        log: false,
        buildInstallType: installType,
        buildPassword: password,
        buildUpdateDescription: updateDescription
      };

      console.log(`开始上传到蒲公英: ${file.originalname}`);
      const result = await uploader.upload(uploadOptions);

      if (result && result.success) {
        // 上传成功后清理临时文件
        try {
          if (await fs.pathExists(tempFilePath)) {
            await fs.remove(tempFilePath);
            console.log(`已删除临时文件: ${tempFilePath}`);
          }
          // 如果是 AAB 转换的，也清理转换过程中产生的临时文件
          if (isAAB && finalFilePath) {
            const downloadsDir = path.join(__dirname, '../downloads');
            const apkFileName = path.basename(finalFilePath);
            const downloadApkPath = path.join(downloadsDir, apkFileName);
            if (await fs.pathExists(downloadApkPath) && downloadApkPath !== tempFilePath) {
              await fs.remove(downloadApkPath);
              console.log(`已删除转换后的 APK 文件: ${downloadApkPath}`);
            }
          }
        } catch (cleanupError) {
          console.warn('清理临时文件时出错:', cleanupError.message);
        }

        const downloadUrl = `https://www.pgyer.com/${result.buildShortcutUrl}`;
        res.json({
          success: true,
          message: '上传到蒲公英成功',
          buildName: result.buildName,
          buildVersion: result.buildVersion,
          buildVersionNo: result.buildVersionNo,
          downloadUrl: downloadUrl,
          qrCodeUrl: result.buildQRCodeURL
        });
      } else {
        // 上传失败时也清理临时文件
        try {
          if (await fs.pathExists(tempFilePath)) {
            await fs.remove(tempFilePath);
          }
        } catch (cleanupError) {
          console.warn('清理临时文件时出错:', cleanupError.message);
        }

        res.status(500).json({ 
          success: false,
          error: '上传失败：未返回成功状态' 
        });
      }
    } catch (error) {
      // 清理临时文件
      try {
        await fs.remove(tempFilePath);
      } catch (e) {
        // 忽略清理错误
      }

      console.error('蒲公英上传失败:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || '上传失败' 
      });
    }
  } catch (error) {
    console.error('上传到蒲公英错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// 测试消息推送
async function testPushNotification(req, res) {
  try {
    const { alias } = req.params;
    const { title, content, cid, page } = req.body;

    // 验证必填字段
    if (!title || !content || !cid) {
      return res.status(400).json({ 
        success: false,
        error: '缺少必填字段：title、content、cid' 
      });
    }

    // 先尝试通过别名查找文件夹
    const folderName = await findFolderByAlias(alias);
    if (!folderName) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    const appConfigDir = getAppConfigDir();
    const indexPath = path.join(appConfigDir, folderName, 'index.ts');
    
    if (!(await fs.pathExists(indexPath))) {
      return res.status(404).json({ error: '配置文件不存在' });
    }

    // 读取配置文件，获取 DCloud App ID
    const configContent = await fs.readFile(indexPath, 'utf-8');
    const config = parseConfigContent(configContent);

    if (!config.dcAppId || config.dcAppId.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: '品牌配置中缺少 DCloud App ID（dcAppId），无法发送推送' 
      });
    }

    // 生成随机 request_id (UUID 格式)
    const { randomUUID } = require('crypto');
    const requestId = randomUUID();

    // 构建推送 URL（使用 DCloud App ID）
    const pushUrl = `https://tcb-7wzhyxm37yebmba-9cj051c3b56a.service.tcloudbase.com/${config.dcAppId}`;

    // 构建请求体
    const requestBody = {
      cid: cid,
      title: title,
      content: content,
      data: {
        page: page || '/subPackages/order/detail/index?orderId=1990968933033046098'
      },
      request_id: requestId
    };

    // 发送 HTTP 请求
    const axios = require('axios');
    try {
      const response = await axios.post(pushUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
        },
        timeout: 30000, // 30秒超时
        proxy: false // 禁用代理，直接连接
      });

      res.json({
        success: true,
        message: '推送发送成功',
        data: {
          url: pushUrl,
          requestId: requestId,
          response: response.data
        }
      });
    } catch (axiosError) {
      console.error('推送请求失败:', axiosError.message);
      if (axiosError.response) {
        // 服务器返回了错误响应
        res.status(axiosError.response.status).json({
          success: false,
          error: `推送失败: ${axiosError.response.status} ${axiosError.response.statusText}`,
          details: axiosError.response.data
        });
      } else if (axiosError.request) {
        // 请求已发送但没有收到响应
        res.status(500).json({
          success: false,
          error: '推送请求超时或网络错误',
          details: axiosError.message
        });
      } else {
        // 其他错误
        res.status(500).json({
          success: false,
          error: '推送请求失败',
          details: axiosError.message
        });
      }
    }
  } catch (error) {
    console.error('测试推送错误:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

module.exports = {
  getConfigs,
  createConfig,
  getConfigByAlias,
  checkConfigFiles,
  checkCloudBuildRequirements,
  generateKeystore,
  getKeystoreInfo,
  importConfig,
  updateConfig,
  deleteConfig,
  uploadLogo,
  deleteLogo,
  getLogo,
  uploadP12,
  deleteP12,
  getP12,
  uploadMobileprovision,
  deleteMobileprovision,
  getMobileprovision,
  uploadOtherFile,
  deleteOtherFile,
  getOtherFiles,
  generateUnipushCloudFunction,
  generateAppLinks,
  getGitBranches,
  cloudBuild,
  cancelCloudBuild,
  updateVersion,
  convertAABToAPK,
  deleteDownloadedAPK,
  uploadToPGYER,
  testPushNotification
};


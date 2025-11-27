const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');
const { getAppConfigDir, toCamelCase, generateBaseUrl } = require('./utils');
const { generateConfigFile, generateKeystoreFile } = require('./generator');

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
          configs.push({
            alias: dir,
            path: configPath,
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
      isSupportHotUpdate = false
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
      isSupportHotUpdate: isSupportHotUpdate || false
    };

    // 生成 index.ts
    await generateConfigFile(brandDir, configData);

    // 生成 keystore
    await generateKeystoreFile(brandDir, alias);

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
    isSupportEnterprise: /isSupportEnterprise:\s*(true|false)/,
    isTest: /isTest:\s*(true|false)/,
    isSupportHotUpdate: /isSupportHotUpdate:\s*(true|false)/
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      if (key === 'isSupportEnterprise' || key === 'isTest' || key === 'isSupportHotUpdate') {
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
    const indexPath = path.join(appConfigDir, alias, 'index.ts');

    if (!(await fs.pathExists(indexPath))) {
      return res.status(404).json({ error: '配置不存在' });
    }

    const content = await fs.readFile(indexPath, 'utf-8');
    
    // 如果请求参数包含 parse=true，则返回解析后的结构化数据
    if (req.query.parse === 'true') {
      const config = parseConfigContent(content);
      config.alias = alias;
      return res.json(config);
    }
    
    res.json({ alias, content });
  } catch (error) {
    console.error('获取配置错误:', error);
    res.status(500).json({ error: error.message });
  }
}

// 更新配置
async function updateConfig(req, res) {
  try {
    const { alias } = req.params;
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
      isSupportHotUpdate = false
    } = req.body;

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, alias);

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
      isSupportHotUpdate: isSupportHotUpdate || false
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

// 生成 keystore 文件
async function generateKeystore(req, res) {
  try {
    const { alias } = req.body;
    if (!alias) {
      return res.status(400).json({ error: '缺少 alias 参数' });
    }

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, alias);

    if (!(await fs.pathExists(brandDir))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    await generateKeystoreFile(brandDir, alias);

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

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, alias);
    const keystorePath = path.join(brandDir, `${alias}.keystore`);

    if (!(await fs.pathExists(keystorePath))) {
      return res.status(404).json({ 
        success: false,
        error: 'keystore 文件不存在，请先创建配置或生成 keystore 文件' 
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

    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, alias);
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
      url: `/appConfig/${alias}/logo.png`
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
    const appConfigDir = getAppConfigDir();
    const logoPath = path.join(appConfigDir, alias, 'logo.png');

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
    const appConfigDir = getAppConfigDir();
    const logoPath = path.join(appConfigDir, alias, 'logo.png');

    if (await fs.pathExists(logoPath)) {
      res.json({
        exists: true,
        url: `/appConfig/${alias}/logo.png`
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

    const appConfigDir = getAppConfigDir();
    const certDir = path.join(appConfigDir, alias, 'certificate', 'prod');
    const p12Path = path.join(certDir, 'app.p12');

    // 检查品牌目录是否存在
    if (!(await fs.pathExists(path.join(appConfigDir, alias)))) {
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
    const appConfigDir = getAppConfigDir();
    const p12Path = path.join(appConfigDir, alias, 'certificate', 'prod', 'app.p12');

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
    const appConfigDir = getAppConfigDir();
    const p12Path = path.join(appConfigDir, alias, 'certificate', 'prod', 'app.p12');

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

    const appConfigDir = getAppConfigDir();
    const certDir = path.join(appConfigDir, alias, 'certificate', 'prod');
    const mobileprovisionPath = path.join(certDir, 'app.mobileprovision');

    // 检查品牌目录是否存在
    if (!(await fs.pathExists(path.join(appConfigDir, alias)))) {
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
    const appConfigDir = getAppConfigDir();
    const mobileprovisionPath = path.join(appConfigDir, alias, 'certificate', 'prod', 'app.mobileprovision');

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
    const appConfigDir = getAppConfigDir();
    const mobileprovisionPath = path.join(appConfigDir, alias, 'certificate', 'prod', 'app.mobileprovision');

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

// 删除品牌配置
async function deleteConfig(req, res) {
  try {
    const { alias } = req.params;
    const appConfigDir = getAppConfigDir();
    const brandDir = path.join(appConfigDir, alias);

    // 检查目录是否存在
    if (!(await fs.pathExists(brandDir))) {
      return res.status(404).json({ error: '品牌配置不存在' });
    }

    // 删除整个品牌目录
    await fs.remove(brandDir);

    res.json({
      success: true,
      message: `品牌配置 ${alias} 删除成功`
    });
  } catch (error) {
    console.error('删除配置错误:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getConfigs,
  createConfig,
  getConfigByAlias,
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
  getMobileprovision
};


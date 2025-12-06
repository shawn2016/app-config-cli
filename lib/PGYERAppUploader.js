const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');
const querystring = require('querystring');
const FormData = require('form-data');

class PGYERAppUploader {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  upload(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!options || typeof options.filePath !== 'string') {
      const error = new Error('filePath must be provided');
      if (callback) {
        callback(error);
      }
      return Promise.reject(error);
    }

    const run = () => new Promise((resolve, reject) => {
      const uploadOptions = {
        buildInstallType: 1,
        buildPassword: '',
        log: true,
        ...options,
      };

      const log = uploadOptions.log !== false;

      const fail = (err) => {
        if (callback) {
          callback(err);
        }
        reject(err);
      };

      const succeed = (result) => {
        if (callback) {
          callback(null, result);
        }
        resolve(result);
      };

      if (!fs.existsSync(uploadOptions.filePath)) {
        return fail(new Error(`filePath not found: ${uploadOptions.filePath}`));
      }

      const tokenPayload = querystring.stringify({
        _api_key: this.apiKey,
        buildType: uploadOptions.filePath.split('.').pop(),
        buildInstallType: uploadOptions.buildInstallType,
        buildPassword: uploadOptions.buildPassword || '',
        buildUpdateDescription: uploadOptions.buildUpdateDescription || '',
      });

      log && console.log('[PGYER] 获取上传凭证...');

      const tokenReq = https.request(
        {
          hostname: 'api.pgyer.com',
          path: '/apiv2/app/getCOSToken',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': tokenPayload.length,
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            return fail(new Error(`[PGYER] getCOSToken failed with status ${res.statusCode}`));
          }

          let buf = '';
          res.on('data', (chunk) => {
            buf += chunk;
          });

          res.on('end', () => {
            try {
              const tokenResult = JSON.parse(buf);
              if (tokenResult.code) {
                return fail(new Error(`[PGYER] getCOSToken error ${tokenResult.code}: ${tokenResult.message}`));
              }
              this.#uploadToCOS(uploadOptions, tokenResult, log)
                .then(() => this.#pollResult(uploadOptions, tokenResult, log))
                .then(succeed)
                .catch(fail);
            } catch (err) {
              fail(new Error(`[PGYER] parse getCOSToken response failed: ${err.message}`));
            }
          });
        },
      );

      tokenReq.on('error', (err) => fail(err));
      tokenReq.write(tokenPayload);
      tokenReq.end();
    });

    return run();
  }

  async #uploadToCOS(uploadOptions, tokenResult, log) {
    log && console.log('[PGYER] 准备上传 APK 到 COS...');

    const stat = fs.statSync(uploadOptions.filePath);
    if (!stat || !stat.isFile()) {
      throw new Error(`[PGYER] filePath is not a file: ${uploadOptions.filePath}`);
    }

    const form = new FormData();
    form.append('key', tokenResult.data.params.key);
    form.append('signature', tokenResult.data.params.signature);
    form.append('x-cos-security-token', tokenResult.data.params['x-cos-security-token']);
    form.append('x-cos-meta-file-name', uploadOptions.filePath.replace(/^.*[\\\/]/, ''));
    form.append('file', fs.createReadStream(uploadOptions.filePath));

    log && console.log('[PGYER] 上传中，没有进度条，请耐心等待...');

    return new Promise((resolve, reject) => {
      form.submit(tokenResult.data.endpoint, (err, res) => {
        if (err) {
          return reject(err);
        }
        if (res.statusCode === 204) {
          log && console.log('[PGYER] 已上传，等待处理...');
          resolve();
        } else {
          reject(new Error(`[PGYER] COS upload failed with status ${res.statusCode}`));
        }
      });
    });
  }

  async #pollResult(uploadOptions, tokenResult, log) {
    const query = querystring.stringify({
      _api_key: this.apiKey,
      buildKey: tokenResult.data.key,
    });

    const poll = () => new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.pgyer.com',
          path: `/apiv2/app/buildInfo?${query}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': 0,
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`[PGYER] buildInfo failed with status ${res.statusCode}`));
          }

          let buf = '';
          res.on('data', (chunk) => {
            buf += chunk;
          });

          res.on('end', () => {
            try {
              const info = JSON.parse(buf);
              if (info.code === 1247) {
                log && console.log('[PGYER] 解析处理中，稍候重试...');
                setTimeout(() => poll().then(resolve).catch(reject), 1000);
                return;
              }
              if (info.code) {
                return reject(new Error(`[PGYER] buildInfo error ${info.code}: ${info.message}`));
              }

              const result = {
                success: true,
                buildKey: info.data.buildKey,
                buildName: info.data.buildName,
                buildVersion: info.data.buildVersion,
                buildVersionNo: info.data.buildVersionNo,
                buildShortcutUrl: info.data.buildShortcutUrl,
                buildQRCodeURL: info.data.buildQRCodeURL,
                buildFileSize: info.data.buildFileSize,
                buildCreated: info.data.buildCreated,
                buildUpdated: info.data.buildUpdated,
              };

              log && console.log('✅ 蒲公英上传成功!');
              log && console.log(`📱 应用名称: ${result.buildName}`);
              log && console.log(`📋 版本号: ${result.buildVersion} (${result.buildVersionNo})`);
              log && console.log(`🔗 下载链接: https://www.pgyer.com/${result.buildShortcutUrl}`);
              log && console.log(`📱 二维码链接: ${result.buildQRCodeURL}`);

              if (result.buildQRCodeURL) {
                this.#openUrl(result.buildQRCodeURL, log);
              }

              resolve(result);
            } catch (err) {
              reject(new Error(`[PGYER] parse buildInfo failed: ${err.message}`));
            }
          });
        },
      );

      req.on('error', reject);
      req.end();
    });

    return poll();
  }

  #openUrl(url, log) {
    try {
      const platform = process.platform;
      if (platform === 'darwin') {
        spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      } else if (platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
      }
      log && console.log('🌐 已尝试在浏览器中打开二维码链接');
    } catch (err) {
      log && console.log(`⚠️ 自动打开浏览器失败: ${err.message}`);
    }
  }
}

module.exports = PGYERAppUploader;

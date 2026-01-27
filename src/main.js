/**
 * Bob Qwen TTS Plugin
 * 使用阿里云 Qwen3-TTS-Flash 模型进行语音合成
 */

var lang = require('./lang.js');

// API 地域配置
var API_ENDPOINTS = {
    'cn': 'https://dashscope.aliyuncs.com',
    'intl': 'https://dashscope-intl.aliyuncs.com'
};

var API_PATH = '/api/v1/services/aigc/multimodal-generation/generation';

/**
 * 返回支持的语言列表
 * @returns {string[]} Bob 语言代码数组
 */
function supportLanguages() {
    return lang.supportLanguages.map(function (item) {
        return item[0];
    });
}

/**
 * 语音合成主函数
 * @param {Object} query - 包含 text 和 lang 属性
 * @param {Function} completion - 回调函数
 */
function tts(query, completion) {
    // 检查语言支持
    if (!lang.langMap.has(query.lang)) {
        completion({
            error: {
                type: 'unsupportLanguage',
                message: '不支持的语言: ' + query.lang
            }
        });
        return;
    }

    // 获取配置
    var apiKey = $option.apiKey;
    var region = $option.region || 'cn';
    var model = $option.model || 'qwen3-tts-flash';
    var voice = $option.voice || 'Ethan';

    // 检查 API Key
    if (!apiKey) {
        completion({
            error: {
                type: 'secretKey',
                message: '配置错误 - 请在插件配置中填入 DashScope API Key',
                troubleshootingLink: 'https://dashscope.console.aliyun.com/'
            }
        });
        return;
    }

    // 构建请求 URL
    var baseUrl = API_ENDPOINTS[region] || API_ENDPOINTS['cn'];
    var url = baseUrl + API_PATH;

    // 获取语言类型
    var languageType = lang.getQwenLangType(query.lang);

    // 构建请求体 
    var requestBody = {
        model: model,
        input: {
            text: query.text,
            voice: voice
        }
    };

    // 调试日志
    $log.info('Qwen TTS Request URL: ' + url);
    $log.info('Qwen TTS Request Body: ' + JSON.stringify(requestBody));
    $log.info('Selected Voice: ' + voice + ', Model: ' + model);

    // 发送请求
    $http.request({
        method: 'POST',
        url: url,
        header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        },
        body: requestBody,
        handler: function (resp) {
            // 调试日志 - 记录响应
            $log.info('Qwen TTS Response: ' + JSON.stringify(resp.data));

            if (resp.error) {
                var statusCode = resp.response ? resp.response.statusCode : 0;
                var errorType = (statusCode >= 400 && statusCode < 500) ? 'param' : 'api';

                completion({
                    error: {
                        type: errorType,
                        message: '接口请求错误 - HTTP ' + statusCode,
                        addition: JSON.stringify(resp.error)
                    }
                });
                return;
            }

            var data = resp.data;

            // 检查响应状态
            if (data.code && data.code !== '200' && data.code !== 200) {
                completion({
                    error: {
                        type: 'api',
                        message: 'API 错误: ' + (data.message || data.code),
                        addition: JSON.stringify(data)
                    }
                });
                return;
            }

            // 提取音频 URL
            var audioUrl = null;

            if (data.output && data.output.audio && data.output.audio.url) {
                audioUrl = data.output.audio.url;
            } else if (data.output && data.output.url) {
                audioUrl = data.output.url;
            }

            if (!audioUrl) {
                completion({
                    error: {
                        type: 'api',
                        message: '无法获取音频 URL',
                        addition: JSON.stringify(data)
                    }
                });
                return;
            }

            // 返回成功结果
            completion({
                result: {
                    type: 'url',
                    value: audioUrl,
                    raw: data
                }
            });
        }
    });
}

/**
 * 自定义超时时间
 * @returns {number} 超时时间(秒)
 */
function pluginTimeoutInterval() {
    var timeout = parseInt($option.timeout);
    if (isNaN(timeout) || timeout < 30) {
        return 60;
    }
    if (timeout > 300) {
        return 300;
    }
    return timeout;
}

/**
 * 验证配置
 * @param {Function} completion - 回调函数
 */
function pluginValidate(completion) {
    var apiKey = $option.apiKey;

    if (!apiKey) {
        completion({
            result: false,
            error: {
                type: 'secretKey',
                message: '请填写 API Key',
                troubleshootingLink: 'https://dashscope.console.aliyun.com/'
            }
        });
        return;
    }

    // 发送测试请求
    var region = $option.region || 'cn';
    var model = $option.model || 'qwen3-tts-flash';
    var baseUrl = API_ENDPOINTS[region] || API_ENDPOINTS['cn'];
    var url = baseUrl + API_PATH;

    $http.request({
        method: 'POST',
        url: url,
        header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        },
        body: {
            model: model,
            input: {
                text: 'test',
                voice: 'Ethan'
            }
        },
        handler: function (resp) {
            if (resp.error) {
                var statusCode = resp.response ? resp.response.statusCode : 0;

                if (statusCode === 401 || statusCode === 403) {
                    completion({
                        result: false,
                        error: {
                            type: 'secretKey',
                            message: 'API Key 无效或已过期',
                            troubleshootingLink: 'https://dashscope.console.aliyun.com/'
                        }
                    });
                } else {
                    completion({
                        result: false,
                        error: {
                            type: 'api',
                            message: '验证失败 - HTTP ' + statusCode
                        }
                    });
                }
                return;
            }

            var data = resp.data;
            if (data.code && data.code !== '200' && data.code !== 200) {
                completion({
                    result: false,
                    error: {
                        type: 'api',
                        message: 'API 错误: ' + (data.message || data.code)
                    }
                });
                return;
            }

            completion({ result: true });
        }
    });
}

exports.supportLanguages = supportLanguages;
exports.tts = tts;
exports.pluginTimeoutInterval = pluginTimeoutInterval;
exports.pluginValidate = pluginValidate;

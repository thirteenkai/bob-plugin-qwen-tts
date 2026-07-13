/**
 * Bob Qwen TTS Plugin
 * 使用阿里云 Qwen3-TTS-Flash 模型进行语音合成
 */

var lang = require('./lang.js');

var PLUGIN_BUILD_ID = '1.5.6-compatibility-hardening-20260713';

// API 地域配置
var API_ENDPOINTS = {
    'cn': 'https://dashscope.aliyuncs.com',
    'intl': 'https://dashscope-intl.aliyuncs.com'
};

var QWEN_API_PATH = '/api/v1/services/aigc/multimodal-generation/generation';

/**
 * 返回支持的语言列表
 * @returns {string[]} Bob 语言代码数组
 */
function supportLanguages() {
    return lang.supportLanguages.map(function (item) {
        return item[0];
    });
}

// 错误信息映射表
var ERROR_MESSAGES = {
    'InvalidApiKey': 'API Key 无效或已过期，请检查配置',
    'Arrearage': '阿里云账户余额不足，请充值',
    'Throttling': '请求频率过高触发限流，请稍后再试',
    'AccessDenied': '访问被拒绝，请检查权限',
    'BadRequest': '请求参数错误',
    'InternalError': '阿里云服务内部错误'
};

function getFriendlyApiError(data) {
    var message = data && data.message ? data.message : '';

    if (message.indexOf('input.voice') !== -1) {
        return '当前模型不支持所选音色，请改用 Qwen3-TTS-Flash 或更换音色';
    }
    if (message.indexOf('language') !== -1 || message.indexOf('language_type') !== -1) {
        return '当前音色不支持该语言，请更换音色或语言';
    }
    return ERROR_MESSAGES[data.code] || message || data.code;
}

var NON_REALTIME_SUPPORTED_VOICES = [
    'Cherry', 'Serena', 'Ethan', 'Chelsie', 'Momo', 'Vivian', 'Moon', 'Maia',
    'Kai', 'Nofish', 'Bella', 'Jennifer', 'Ryan', 'Katerina', 'Aiden',
    'Eldric Sage', 'Mia', 'Mochi', 'Bellona', 'Vincent', 'Bunny', 'Neil',
    'Elias', 'Arthur', 'Nini', 'Seren', 'Pip', 'Stella', 'Bodega', 'Sonrisa',
    'Alek', 'Dolce', 'Sohee', 'Ono Anna', 'Lenn', 'Emilien', 'Andre',
    'Radio Gol', 'Jada', 'Dylan', 'Li', 'Marcus', 'Roy', 'Peter', 'Sunny',
    'Eric', 'Rocky', 'Kiki'
];

// The qwen-tts alias currently rejects dialect voices even though versioned
// legacy models list wider support. Keep this list tied to observed API errors.
var QWEN_TTS_SUPPORTED_VOICES = [
    'Cherry', 'Serena', 'Ethan', 'Chelsie'
];

var DIALECT_VOICES = [
    'Dylan', 'Jada', 'Sunny', 'Eric', 'Marcus', 'Li', 'Peter', 'Roy', 'Kiki',
    'Rocky'
];

var INSTRUCT_SUPPORTED_VOICES = [
    'Cherry', 'Serena', 'Ethan', 'Chelsie', 'Momo', 'Vivian', 'Moon', 'Maia',
    'Kai', 'Nofish', 'Bella', 'Eldric Sage', 'Mia', 'Mochi', 'Bellona',
    'Vincent', 'Bunny', 'Neil', 'Elias', 'Arthur', 'Nini', 'Seren', 'Pip',
    'Stella'
];

function isNonRealtimeSupportedVoice(voice) {
    return NON_REALTIME_SUPPORTED_VOICES.indexOf(voice) !== -1;
}

function isQwenTtsSupportedVoice(voice) {
    return QWEN_TTS_SUPPORTED_VOICES.indexOf(voice) !== -1;
}

function isDialectVoice(voice) {
    return DIALECT_VOICES.indexOf(voice) !== -1;
}

function isInstructSupportedVoice(voice) {
    return INSTRUCT_SUPPORTED_VOICES.indexOf(voice) !== -1;
}

function getLanguageTypeForVoice(bobLang, voice) {
    if (isDialectVoice(voice) && (bobLang === 'zh-Hans' || bobLang === 'zh-Hant')) {
        return 'Auto';
    }
    return lang.getQwenLangType(bobLang);
}

function parseSpeechRateValue(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    var rawValue = String(value).trim();

    if (!/^\d+(\.\d+)?$/.test(rawValue)) {
        return null;
    }
    var rate = parseFloat(rawValue);
    if (rate < 0.5 || rate > 2.0) {
        return null;
    }
    return rate;
}

function getSpeechRateResult() {
    var customRate = $option.customSpeechRate && $option.customSpeechRate.trim();
    var rawRate = customRate ? customRate : $option.speechRate;
    var rate = parseSpeechRateValue(rawRate);

    if (customRate && rate === null) {
        return {
            error: '自定义语速必须是 0.5-2.0 之间的数字'
        };
    }
    if (!customRate && rawRate && rate === null) {
        return {
            error: '语速必须是 0.5-2.0 之间的数字'
        };
    }
    return {
        rate: rate
    };
}

function getQwenSpeedInstruction(rate) {
    if (!rate || rate === 1.0) {
        return '';
    }

    if (rate <= 0.6) {
        return '请用很慢的语速朗读，保持自然停顿。';
    }
    if (rate < 1.0) {
        return '请用较慢的语速朗读，保持自然停顿。';
    }
    if (rate <= 1.3) {
        return '请用略快的语速朗读，保持吐字清晰。';
    }
    if (rate < 1.8) {
        return '请用较快的语速朗读，保持吐字清晰。';
    }
    return '请用很快的语速朗读，但保持吐字清晰、不要吞字。';
}

function resolveModelForVoiceAndSpeed(model, voice, speechRate, region) {
    var resolvedModel = model || 'qwen3-tts-flash';
    var speedInstruction = getQwenSpeedInstruction(speechRate);

    if (!isNonRealtimeSupportedVoice(voice)) {
        return {
            error: {
                message: '当前音色不在官方非实时接口支持列表',
                addition: '请改用插件菜单中的其他音色'
            }
        };
    }

    if (speedInstruction && !isInstructSupportedVoice(voice)) {
        return {
            error: {
                message: '当前音色不支持 Qwen 语速倾向控制',
                addition: '请改用支持 Instruct 的音色，或将语速倾向保持为 1.0x'
            }
        };
    }

    if (resolvedModel === 'qwen-tts' && region === 'intl') {
        $log.info('Auto-switching model to qwen3-tts-flash because qwen-tts is unavailable in the international region');
        resolvedModel = 'qwen3-tts-flash';
    }

    if (resolvedModel === 'qwen-tts' && !isQwenTtsSupportedVoice(voice)) {
        $log.info('Auto-switching model to qwen3-tts-flash because qwen-tts does not support voice: ' + voice);
        resolvedModel = 'qwen3-tts-flash';
    }

    if (resolvedModel === 'qwen3-tts-instruct-flash' && !isInstructSupportedVoice(voice)) {
        $log.info('Auto-switching model to qwen3-tts-flash because instruct model does not support voice: ' + voice);
        resolvedModel = 'qwen3-tts-flash';
    }

    if (speedInstruction && resolvedModel !== 'qwen3-tts-instruct-flash') {
        $log.info('Auto-switching model to qwen3-tts-instruct-flash for speech rate tendency control');
        resolvedModel = 'qwen3-tts-instruct-flash';
    }

    return {
        model: resolvedModel,
        speedInstruction: speedInstruction
    };
}

/**
 * 语音合成主函数
 * @param {Object} query - 包含 text 和 lang 属性
 * @param {Function} completion - 回调函数
 */
function tts(query, completion) {
    var text = query.text || '';

    // 1. 文本长度保护 (DashScope 建议单次不超过 600 字符)
    if (text.length > 600) {
        completion({
            error: {
                type: 'param',
                message: '文本过长(' + text.length + '字符)，建议单次不超过 600 字符',
                addition: '请尝试分段朗读'
            }
        });
        return;
    }

    // 检查语言支持
    if (!lang.langMap.has(query.lang)) {
        completion({
            error: {
                type: 'unsupportedLanguage',
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
    var speechRateResult = getSpeechRateResult();
    var speechRate = speechRateResult.rate;

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

    if (speechRateResult.error) {
        completion({
            error: {
                type: 'param',
                message: speechRateResult.error,
                addition: '请填写 0.5-2.0，例如 0.8、1.0、1.3'
            }
        });
        return;
    }

    // 构建请求
    var baseUrl = API_ENDPOINTS[region] || API_ENDPOINTS['cn'];
    var url = baseUrl + QWEN_API_PATH;
    var requestBody = null;

    if (voice.indexOf('_separator_') === 0) {
        completion({
            error: {
                type: 'param',
                message: '请选择具体的语音角色',
                addition: '当前选中的是分组标题，不是可用音色'
            }
        });
        return;
    }

    var modelResolution = resolveModelForVoiceAndSpeed(model, voice, speechRate, region);
    if (modelResolution.error) {
        completion({
            error: {
                type: 'param',
                message: modelResolution.error.message,
                addition: modelResolution.error.addition
            }
        });
        return;
    }

    model = modelResolution.model;

    requestBody = {
        model: model,
        input: {
            text: text,
            voice: voice,
            language_type: getLanguageTypeForVoice(query.lang, voice)
        }
    };

    if (modelResolution.speedInstruction) {
        requestBody.input.instructions = modelResolution.speedInstruction;
        requestBody.input.optimize_instructions = true;
    }

    $log.info('Qwen TTS build=' + PLUGIN_BUILD_ID + ', request model=' + requestBody.model + ', voice=' + requestBody.input.voice + ', language_type=' + requestBody.input.language_type + ', has_instructions=' + Boolean(requestBody.input.instructions));

    // 2. 发送请求 (包含重试逻辑)
    sendRequest(url, apiKey, requestBody, 0, completion);
}

/**
 * 发送 HTTP 请求 (带重试)
 */
function getResponseData(resp) {
    if (!resp || !resp.data || typeof resp.data !== 'object') {
        return null;
    }
    return resp.data;
}

function getAudioUrl(data) {
    if (data && data.output && data.output.audio && data.output.audio.url) {
        return data.output.audio.url;
    }
    if (data && data.output && data.output.url) {
        return data.output.url;
    }
    return null;
}

function isApiError(data) {
    var codeFailed = data.code && data.code !== '200' && data.code !== 200;
    var statusFailed = data.status_code && data.status_code !== '200' && data.status_code !== 200;
    return Boolean(codeFailed || statusFailed);
}

function isAuthenticationApiError(data) {
    return Boolean(data && (
        data.code === 'InvalidApiKey' ||
        data.status_code === 401 || data.status_code === '401' ||
        data.status_code === 403 || data.status_code === '403'
    ));
}

function getApiErrorIdentifier(data) {
    return data.code || data.status_code || 'unknown';
}

function getNetworkErrorAddition(error) {
    if (!error) {
        return '';
    }
    if (typeof error === 'string') {
        return error;
    }
    return error.message || error.localizedDescription || error.debugMessage || '';
}

function completeHttpError(statusCode, error, completion, validationMode) {
    if (statusCode === 401 || statusCode === 403) {
        var authResult = {
            error: {
                type: 'secretKey',
                message: 'API Key 无效、已过期或与所选地域不匹配',
                troubleshootingLink: 'https://dashscope.console.aliyun.com/'
            }
        };
        if (validationMode) {
            authResult.result = false;
        }
        completion(authResult);
        return;
    }

    var message = statusCode === 429
        ? '请求频率过高触发限流，请稍后再试'
        : (validationMode ? '验证请求失败' : '接口请求失败');

    if (statusCode) {
        message += ' - HTTP ' + statusCode;
    } else {
        message += ' - 网络异常';
    }

    var networkResult = {
        error: {
            type: 'network',
            message: message,
            addition: getNetworkErrorAddition(error)
        }
    };
    if (validationMode) {
        networkResult.result = false;
    }
    completion(networkResult);
}

function sendRequest(url, apiKey, body, retryCount, completion) {
    var MAX_RETRIES = 1; // 最大自动重试次数

    $http.request({
        method: 'POST',
        url: url,
        header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        },
        body: body,
        handler: function (resp) {
            // 网络错误处理 (自动重试)
            if (resp && resp.error) {
                var statusCode = resp.response ? resp.response.statusCode : 0;
                var errorData = getResponseData(resp);

                if (isAuthenticationApiError(errorData)) {
                    completeHttpError(401, resp.error, completion, false);
                    return;
                }

                // 如果是网络超时或 5xx 错误，且未达到最大重试次数，则重试
                if ((statusCode === 0 || statusCode >= 500) && retryCount < MAX_RETRIES) {
                    $log.info('Network error (' + statusCode + '), retrying... (' + (retryCount + 1) + '/' + MAX_RETRIES + ')');
                    sendRequest(url, apiKey, body, retryCount + 1, completion);
                    return;
                }

                completeHttpError(statusCode, resp.error, completion, false);
                return;
            }

            var data = getResponseData(resp);

            if (!data) {
                completion({
                    error: {
                        type: 'api',
                        message: '接口返回了无效响应',
                        addition: '响应中没有可解析的 JSON 数据'
                    }
                });
                return;
            }

            // API 错误处理
            if (isAuthenticationApiError(data)) {
                completeHttpError(401, null, completion, false);
                return;
            }

            if (isApiError(data)) {
                // 尝试映射为中文错误信息
                var friendlyMsg = getFriendlyApiError(data);

                completion({
                    error: {
                        type: 'api',
                        message: friendlyMsg,
                        addition: '错误代码: ' + getApiErrorIdentifier(data)
                    }
                });
                return;
            }

            // 提取音频
            var audioUrl = getAudioUrl(data);

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
    var url = baseUrl + QWEN_API_PATH;
    var voice = $option.voice || 'Ethan';
    var speechRateResult = getSpeechRateResult();
    var speechRate = speechRateResult.rate;

    if (speechRateResult.error) {
        completion({
            result: false,
            error: {
                type: 'param',
                message: speechRateResult.error
            }
        });
        return;
    }

    if (voice.indexOf('_separator_') === 0) {
        completion({
            result: false,
            error: {
                type: 'param',
                message: '请选择具体的语音角色'
            }
        });
        return;
    }

    var modelResolution = resolveModelForVoiceAndSpeed(model, voice, speechRate, region);
    if (modelResolution.error) {
        completion({
            result: false,
            error: {
                type: 'param',
                message: modelResolution.error.message
            }
        });
        return;
    }

    model = modelResolution.model;

    var validateBody = {
        model: model,
        input: {
            text: '支持语言',
            voice: voice,
            language_type: getLanguageTypeForVoice('zh-Hans', voice)
        }
    };

    if (modelResolution.speedInstruction) {
        validateBody.input.instructions = modelResolution.speedInstruction;
        validateBody.input.optimize_instructions = true;
    }

    $log.info('Qwen TTS build=' + PLUGIN_BUILD_ID + ', validate model=' + validateBody.model + ', voice=' + validateBody.input.voice + ', language_type=' + validateBody.input.language_type + ', has_instructions=' + Boolean(validateBody.input.instructions));

    $http.request({
        method: 'POST',
        url: url,
        header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        },
        body: validateBody,
        handler: function (resp) {
            if (resp && resp.error) {
                var statusCode = resp.response ? resp.response.statusCode : 0;
                var errorData = getResponseData(resp);
                if (isAuthenticationApiError(errorData)) {
                    completeHttpError(401, resp.error, completion, true);
                    return;
                }
                completeHttpError(statusCode, resp.error, completion, true);
                return;
            }

            var data = getResponseData(resp);
            if (!data) {
                completion({
                    result: false,
                    error: {
                        type: 'api',
                        message: '验证失败：接口返回了无效响应'
                    }
                });
                return;
            }

            if (isAuthenticationApiError(data)) {
                completeHttpError(401, null, completion, true);
                return;
            }

            if (isApiError(data)) {
                var friendlyMsg = getFriendlyApiError(data);

                completion({
                    result: false,
                    error: {
                        type: 'api',
                        message: friendlyMsg,
                        addition: '错误代码: ' + getApiErrorIdentifier(data)
                    }
                });
                return;
            }

            if (!getAudioUrl(data)) {
                completion({
                    result: false,
                    error: {
                        type: 'api',
                        message: '验证失败：响应中没有音频 URL'
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

var assert = require('assert');
var path = require('path');

var pluginPath = path.join(__dirname, '..', 'src', 'main.js');

function createPlugin(options, responseFactory) {
    var request = null;

    global.$option = options;
    global.$log = { info: function () {} };
    global.$http = {
        request: function (config) {
            request = config;
            if (responseFactory) {
                config.handler(responseFactory(config));
            }
        }
    };

    delete require.cache[require.resolve(pluginPath)];
    return {
        plugin: require(pluginPath),
        getRequest: function () { return request; }
    };
}

function defaultOptions(overrides) {
    var options = {
        apiKey: 'test-key',
        region: 'cn',
        model: 'qwen3-tts-flash',
        voice: 'Ethan',
        speechRate: '1.0',
        customSpeechRate: '',
        timeout: '60'
    };

    Object.keys(overrides || {}).forEach(function (key) {
        options[key] = overrides[key];
    });
    return options;
}

function runTts(options, response) {
    var completion = null;
    var runtime = createPlugin(options, response ? function () { return response; } : null);
    runtime.plugin.tts({ text: 'hello', lang: 'en' }, function (value) {
        completion = value;
    });
    return { completion: completion, request: runtime.getRequest() };
}

function runValidation(options, response) {
    var completion = null;
    var runtime = createPlugin(options, function () { return response; });
    runtime.plugin.pluginValidate(function (value) {
        completion = value;
    });
    return { completion: completion, request: runtime.getRequest() };
}

var intlLegacy = runTts(defaultOptions({
    region: 'intl',
    model: 'qwen-tts'
}));
assert.strictEqual(intlLegacy.request.body.model, 'qwen3-tts-flash');
assert.strictEqual(intlLegacy.request.url.indexOf('dashscope-intl.aliyuncs.com') !== -1, true);

var unsupportedLanguage = null;
var unsupportedRuntime = createPlugin(defaultOptions());
unsupportedRuntime.plugin.tts({ text: 'hello', lang: 'xx' }, function (value) {
    unsupportedLanguage = value;
});
assert.strictEqual(unsupportedLanguage.error.type, 'unsupportedLanguage');

var unauthorized = runTts(defaultOptions(), {
    error: { message: 'unauthorized' },
    response: { statusCode: 401 }
});
assert.strictEqual(unauthorized.completion.error.type, 'secretKey');
assert.strictEqual(Object.prototype.hasOwnProperty.call(unauthorized.completion, 'result'), false);

var throttled = runTts(defaultOptions(), {
    error: { message: 'too many requests' },
    response: { statusCode: 429 }
});
assert.strictEqual(throttled.completion.error.type, 'network');

var emptyResponse = runTts(defaultOptions(), {
    response: { statusCode: 204 }
});
assert.strictEqual(emptyResponse.completion.error.type, 'api');

var missingCompletion = null;
var missingRuntime = createPlugin(defaultOptions(), function () { return undefined; });
missingRuntime.plugin.tts({ text: 'hello', lang: 'en' }, function (value) {
    missingCompletion = value;
});
assert.strictEqual(missingCompletion.error.type, 'api');

var emptyValidation = runValidation(defaultOptions(), {
    data: {},
    response: { statusCode: 200 }
});
assert.strictEqual(emptyValidation.completion.result, false);
assert.strictEqual(emptyValidation.completion.error.type, 'api');

var validValidation = runValidation(defaultOptions(), {
    data: {
        status_code: 200,
        code: '',
        output: { audio: { url: 'https://example.com/audio.wav' } }
    },
    response: { statusCode: 200 }
});
assert.deepStrictEqual(validValidation.completion, { result: true });

var bodyAuthenticationError = runTts(defaultOptions(), {
    data: {
        status_code: 401,
        code: 'InvalidApiKey',
        message: 'Invalid API key'
    },
    response: { statusCode: 401 }
});
assert.strictEqual(bodyAuthenticationError.completion.error.type, 'secretKey');

console.log('main.test.js: all assertions passed');

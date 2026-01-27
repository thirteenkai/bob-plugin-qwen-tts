/**
 * Bob 语言代码到 Qwen TTS 语言类型的映射
 * Qwen3-TTS-Flash 支持: Chinese, English, German, Italian, Portuguese, Spanish, Japanese, Korean, French, Russian
 */

// [Bob语言代码, Qwen语言类型]
var supportLanguages = [
    ['zh-Hans', 'Chinese'],
    ['zh-Hant', 'Chinese'],
    ['en', 'English'],
    ['ja', 'Japanese'],
    ['ko', 'Korean'],
    ['fr', 'French'],
    ['de', 'German'],
    ['es', 'Spanish'],
    ['it', 'Italian'],
    ['pt', 'Portuguese'],
    ['ru', 'Russian']
];

// 创建映射表
var langMap = new Map(supportLanguages);

// 根据 Bob 语言代码获取 Qwen 语言类型
function getQwenLangType(bobLang) {
    return langMap.get(bobLang) || 'Auto';
}

exports.supportLanguages = supportLanguages;
exports.langMap = langMap;
exports.getQwenLangType = getQwenLangType;

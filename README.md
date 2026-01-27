# Bob Qwen TTS 插件

使用阿里云 Qwen3-TTS-Flash 模型进行语音合成的 Bob 插件。

## ✨ 功能特点

- 🎯 **高质量语音合成**: 使用 Qwen3-TTS-Flash 模型
- 🌍 **多语言支持**: 中文、英文、日语、韩语等 10+ 种语言
- 🎭 **25+ 种语音角色**: 普通话/方言/粤语/英语/日语/韩语
- 🌐 **双地域支持**: 国内(北京) / 国际(新加坡)

## 📦 安装方法

### 方式一：直接下载安装（推荐）
1. 前往 [Releases](../../releases) 页面
2. 下载最新版本的 `qwen-tts.bobplugin` 文件
3. 双击该文件，Bob 会自动安装插件

### 方式二：手动安装
1. 将 `src` 文件夹内的所有文件打包为 ZIP
2. 将 ZIP 文件扩展名改为 `.bobplugin`
3. 双击安装

## ⚙️ 配置说明

### 1. 获取 API Key
1. 访问 [阿里云百炼控制台](https://dashscope.console.aliyun.com/)
2. 注册/登录后创建 API Key
3. 将 API Key 填入插件配置

### 2. 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| API Key | DashScope API Key（必填） | - |
| API 地域 | 北京(国内) / 新加坡(国际) | 北京 |
| 模型 | qwen3-tts-flash / qwen-tts | qwen3-tts-flash |
| 语音角色 | 25+ 种音色可选 | Ethan |

### 3. 语音角色

| 分类 | 角色 |
|------|------|
| 普通话男声 | Ethan(晨煦)、Ryan(甜茶)、Elias(墨讲师)、Neil(尼尔) |
| 普通话女声 | Cherry(芊悦)、Serena(苏瑶)、Chelsie(千雪)、Maia(四月)、Katerina(卡捷琳娜)、Jennifer(詹妮弗)、Nofish(不吃鱼) |
| 方言男声 | Dylan(北京话)、Marcus(陕西话)、Roy(闽南话)、li(南京话) |
| 方言女声 | Jada(上海话)、Sunny(四川话) |
| 粤语 | Lisa(女)、Brandon(男) |
| 英语 | Emily/James(美式)、Olivia/William(英式) |
| 日语 | Yuki(女)、Takeshi(男) |
| 韩语 | Jihye(女)、Minjun(男) |

## 🚀 使用方法

1. 在 Bob 中进行翻译或 OCR 识别
2. 点击翻译结果旁的发音按钮 🔊
3. 即可听到 Qwen TTS 的语音朗读

## ⚠️ 注意事项

- 需要有效的 DashScope API Key
- 音频 URL 有效期为 24 小时
- 单次请求最大文本长度: 600 字符

## 📝 更新日志

### v1.4.0
- ✨ 新增 25+ 种语音角色
- 🐛 修复语音角色选择不生效的问题

### v1.0.0
- 🎉 首次发布

## 📄 许可证

MIT License

# GitHub 发布指南

本文档详细说明如何将 Bob Qwen TTS 插件发布到 GitHub，并启用自动更新功能。

---

## 📋 发布前准备

### 1. 确定你的 GitHub 用户名

假设你的 GitHub 用户名是 `thirteenkai`，需要替换以下文件中的 `YOUR_USERNAME`：

**文件 1：`src/info.json`**
```json
"author": "thirteenkai",
"homepage": "https://github.com/thirteenkai/bob-plugin-qwen-tts",
"appcast": "https://raw.githubusercontent.com/thirteenkai/bob-plugin-qwen-tts/main/appcast.json",
```

**文件 2：`appcast.json`**
```json
"url": "https://github.com/thirteenkai/bob-plugin-qwen-tts/releases/download/v1.4.0/qwen-tts.bobplugin"
```

### 2. 重新打包插件

替换完用户名后，需要重新生成 `.bobplugin` 文件：

```bash
cd bob-plugin-qwen-tts
rm qwen-tts.bobplugin
cd src && zip -r ../qwen-tts.bobplugin . && cd ..
```

### 3. 生成 SHA256 校验码（可选但推荐）

```bash
shasum -a 256 qwen-tts.bobplugin
```

将输出的校验码填入 `appcast.json` 的 `sha256` 字段。

---

## 🚀 GitHub 发布步骤

### 第一步：创建 GitHub 仓库

1. 打开 https://github.com/new
2. 仓库名称填写：`bob-plugin-qwen-tts`
3. 选择 **Public**（公开）
4. **不要**勾选 "Add a README file"（我们已有 README）
5. 点击 "Create repository"

### 第二步：上传代码

在终端中执行：

```bash
cd /Users/macbookpro/Desktop/Code\ File/bob-plugin-qwen-tts

# 初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial release v1.4.0"

# 添加远程仓库（替换 thirteenkai）
git remote add origin https://github.com/thirteenkai/bob-plugin-qwen-tts.git

# 推送到 main 分支
git branch -M main
git push -u origin main
```

### 第三步：创建 Release 发布版本

1. 在仓库页面点击右侧 **Releases**
2. 点击 **Create a new release**
3. 填写：
   - **Tag version**: `v1.4.0`
   - **Release title**: `v1.4.0`
   - **Description**:
     ```
     ## 更新内容
     - ✨ 新增 25+ 种语音角色
     - 🐛 修复语音角色选择不生效的问题
     ```
4. 点击 **Attach binaries**，上传 `qwen-tts.bobplugin` 文件
5. 点击 **Publish release**

---

## 🔄 后续更新流程

当你需要发布新版本时：

### 1. 修改版本号

在 `src/info.json` 中更新版本号：
```json
"version": "1.5.0",
```

### 2. 更新 appcast.json

在 `appcast` 数组**最前面**添加新版本信息：
```json
{
    "version": "1.5.0",
    "desc": "v1.5.0 更新内容：\n• 新功能描述",
    "sha256": "",
    "url": "https://github.com/myusername/bob-plugin-qwen-tts/releases/download/v1.5.0/qwen-tts.bobplugin",
    "minBobVersion": "1.6.0"
}
```

### 3. 重新打包并发布

```bash
cd src && zip -r ../qwen-tts.bobplugin . && cd ..
git add .
git commit -m "Release v1.5.0"
git push
```

然后在 GitHub 创建新的 Release，上传新的 `.bobplugin` 文件。

---

## ✅ 完成后验证

1. **检查仓库页面**：确认 README 正常显示
2. **检查 Release**：确认 `.bobplugin` 文件可下载
3. **测试 appcast**：访问 `https://raw.githubusercontent.com/myusername/bob-plugin-qwen-tts/main/appcast.json` 确认能访问
4. **测试安装**：下载 Release 中的 `.bobplugin` 双击安装测试

---

## 🔒 隐私安全说明

**你的代码不包含任何隐私信息**：

- ✅ API Key 由用户在 Bob 中填写，存储在用户本地
- ✅ 代码中的 `$option.apiKey` 只是变量引用，不是实际密钥
- ✅ 所有敏感配置都通过 Bob 的安全输入框获取

---

## ❓ 常见问题

**Q: 用户如何收到更新通知？**
A: Bob 会定期检查 `appcast.json` 文件，发现新版本后自动提示用户更新。

**Q: 我需要付费吗？**
A: GitHub 公开仓库完全免费。

**Q: 我不会用命令行怎么办？**
A: 可以使用 GitHub Desktop 客户端，提供图形界面操作。

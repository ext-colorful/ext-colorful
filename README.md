# 多彩背景扩展 (Colorful Background Extension)

欢迎使用多彩背景扩展！这个插件旨在帮助用户轻松地为他们喜欢的网站更改背景颜色。无论是为了美化网页，还是为了提升可读性，我们都希望为您提供一个更个性化的浏览体验。

## 扩展预览

以下是多彩背景扩展的界面和功能预览：

<img width="2560" height="1600" alt="chatgpt" src="https://github.com/user-attachments/assets/4fffb3ab-ef00-489f-ad9a-edc81d470e38" />

<details>
<summary>点击这里查看其他界面和功能预览</summary>

<img width="2560" height="1600" alt="twitter" src="https://github.com/user-attachments/assets/e2cb701d-a497-4b37-99ce-f1a34242d785" />
<img width="2560" height="1600" alt="reddit" src="https://github.com/user-attachments/assets/98c34f41-5936-494d-9b39-b7eb359174d8" />
<img width="2558" height="1598" alt="duckai" src="https://github.com/user-attachments/assets/afb45279-d9fc-474a-ae4a-6b9cc602168e" />
<img width="2560" height="1600" alt="deepseek" src="https://github.com/user-attachments/assets/e08027b5-3f0d-4551-9f6e-83946d36697e" />

</details>

## 功能

- **简单易用**：在弹出窗口中选择颜色即可应用到当前网站。
- **每站点记忆**：每个站点的颜色单独保存，下次访问会自动应用。
- **多种颜色选择**：提供多种预设颜色，并支持自定义十六进制颜色。
- **重置**：一键清除当前站点的设置并移除注入样式。

## 本地加载（开发／调试）

Chrome / Edge 中以“加载已解压的扩展程序”的方式安装：

- 前置条件：已安装 Node.js 18+ 和 npm。
- 安装依赖：`npm install`
- 方案一（推荐，热重载）：
  1. 运行 `npm run dev`
  2. 浏览器打开扩展管理（chrome://extensions 或 edge://extensions），开启“开发者模式”。
  3. 点击“加载已解压的扩展程序”，选择项目根目录下生成的 `extension/` 目录。
- 方案二（打包构建）：
  1. 运行 `npm run build`
  2. 在扩展管理中“加载已解压的扩展程序”，选择 `dist/chrome-mv3/` 目录。

可选：运行 `npm run zip` 生成可上传商店的 zip 包。

## 使用方法

1. 打开任意网站，点击扩展图标打开弹窗。
2. 从预设色块中选择颜色，或输入自定义十六进制颜色（如 #AABBCC）。
3. 打开开关以启用当前站点的背景颜色。颜色会立即生效并保存。
4. 点击“Reset”可清除该站点的设置并移除页面样式。
5. 再次访问该站点时，保存的颜色会自动应用。

## 反馈与支持

如果您在使用过程中遇到任何问题或有建议，请随时在 [issues](https://github.com/ext-colorful/ext-colorful/issues) 中留言。我们会尽快回复并进行改进。

感谢您的支持与使用！让我们一起为网络增添更多色彩！

---

Development (WXT)

Prerequisites:
- Node.js 18+ and npm

Setup:
- npm install

Common commands:
- npm run dev: Start WXT in development mode with live-reload
- npm run build: Build the production extension into dist/
- npm run zip: Create a ZIP archive of the build output

Project layout:
- src/background.ts: MV3 service worker (module)
- src/content/colorizer.ts: Content script that applies the background color and listens to storage/messages
- src/popup/index.html and src/popup/main.ts: Popup UI with palette, custom color, toggle, and reset per-site
- src/options/index.html and src/options/main.ts: Options page
- src/lib: Shared helpers (storage abstraction using chrome.storage.sync/local)
- public/icons: Extension icons copied as-is into the build

WXT manifest is configured in wxt.config.ts and uses MV3。

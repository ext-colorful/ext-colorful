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

- **简单易用**：只需将您想要更改颜色的网站链接粘贴到评论区，我们将逐步适配。
- **多种颜色选择**：提供多种颜色选项，满足不同用户的需求。
- **持续更新**：我们会根据用户反馈不断改进和更新插件。

## 安装

您可以通过以下链接安装多彩背景扩展：

- [Chrome 应用商店](https://chromewebstore.google.com/detail/%E5%A4%9A%E5%BD%A9%E8%83%8C%E6%99%AF/kjdglnecpmkeokdeboehpaajdddhommg)
- [Microsoft Edge 应用商店](https://microsoftedge.microsoft.com/addons/detail/pndeoniljijhiemfdogejkhmbggpognj)

## 使用方法

1. 安装插件后，打开您想要更改背景颜色的网站。
2. 在评论区粘贴网站链接。
3. 等待适配完成，享受您个性化的浏览体验！

## 反馈与支持

如果您在使用过程中遇到任何问题或有建议，请随时在[issues](https://github.com/ext-colorful/ext-colorful/issues)中留言。我们会尽快回复并进行改进。

感谢您的支持与使用！让我们一起为网络增添更多色彩！

---

Development (MV3 + TypeScript Skeleton)

Prerequisites:
- Node.js 18+ and npm

Setup:
- npm install

Build:
- npm run build

Load in Chrome/Edge:
1. 打开 chrome://extensions 或 edge://extensions
2. 打开“开发者模式”
3. 选择“加载已解压的扩展程序”，选择项目中的 dist 目录
4. 点击扩展图标，弹出的 Popup 将显示 “Hello, world”，并且：
   - 背景页（Service Worker）会在控制台打印启动日志
   - 内容脚本在任意页面控制台打印注入日志

开发模式（自动构建/拷贝，适合边改边看）：
- npm run dev

质量工具：
- npm run lint：ESLint 校验（零警告）
- npm run format：Prettier 统一格式
- npm run typecheck：仅类型检查（不产出文件）

项目结构（核心文件）：
- public/manifest.json：MV3 清单（最小化配置）
- src/background.ts：MV3 Service Worker（TypeScript）
- src/content.ts：内容脚本（简单日志用于验证注入）
- src/popup/popup.html, src/popup/popup.ts：Popup（Hello World）
- assets/icons/*：扩展图标

构建产物：
- dist/：可直接作为“已解压的扩展程序”目录进行加载

# 词光 · Android 完整离线版

基于 [designfuchen/word-atlas（Word Atlas / 词光）](https://github.com/designfuchen/word-atlas) 二次开发的 Android 背单词应用。原项目由 [designfuchen](https://github.com/designfuchen) 与 Word Atlas contributors 开发，本仓库由 [shawncai](https://github.com/shawncai) 维护 Android 封装、手机与折叠屏适配。

开发基线为上游提交 [`c70d57d2`](https://github.com/designfuchen/word-atlas/commit/c70d57d2b697f4de6ad512c62ba9495c4e5dc61c)。这是独立衍生版本，不代表原作者官方 Android 发行版；原有词库、插画、录音与学习算法来自上游，保留原作者和内容署名。

[English](README.en.md) · [Android 构建与安装](docs/android.md) · [依赖版本与审查](docs/android-dependencies.md) · [词库格式](docs/dataset.md)

## 功能

- 7,298 个词条，覆盖 CEFR A1–C2 和 19 个话题；包含插画、中英释义、例句、搭配与用法提示。
- FSRS 间隔复习、每日学习、看义选词、看图补句、听音辨词与拼写测验。
- 图鉴搜索、收藏、词汇星图、打字练习、学习统计和设置。
- 无需账号、后端或 API Key，进度保存在设备本地；支持 JSON 备份导出与恢复。

## 本仓库的改动

- 使用官方 Capacitor 封装 Android 应用，应用名「词光」，包名 `com.zhangcuncai.wordatlas`。
- 将词库、插画、已有录音、字体及音效打包进 APK，安装后首次启动也可离线使用；原生版不启用网页 Service Worker。
- 适配安全区、触控热区、软键盘、Android 返回键、后台保存和声音暂停。
- 接入系统文件选择与分享面板，沿用上游 v2 进度和备份格式。
- 手机学习页纵向阅读；展开窗口使用侧边导航、多列图鉴及图文并排词卡，调整窗口时保留学习和输入状态。
- 固定品牌顶部栏仅在首页显示；收紧页面留白，减少大圆角、冗余描述、嵌套卡框与阴影。
- 周统计柱和学习进度条使用 `transform` 动画，保留原有颜色与缓动。

不包含账号系统、云同步、应用商店发布或新增词库。缺少现成录音的内容会尝试设备语音，设备语音不可用时明确提示。

## 本地运行

使用 **Node.js 22.22.3** 和 **pnpm 8.15.8**，不使用 npm/yarn，不自动升级已有依赖。

```bash
git clone https://github.com/shawncai/words.git
cd words
source "$HOME/.nvm/nvm.sh"
nvm install
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

打开 <http://localhost:5188>。仓库包含完整媒体，首次克隆需要下载数百 MB 文件。开发结束后关闭预览进程；macOS 上生成文件后执行 `dot_clean ./`。

技术栈：React 19、TypeScript、Vite、ts-fsrs、WebGL2、Capacitor 8。

## Android 构建与安装

需要 JDK 21、Android SDK 36 和 Android 构建工具。macOS 环境路径及 ExFAT 外盘缓存处理详见 [Android 文档](docs/android.md)。首次安装依赖和构建需要联网，安装后的应用独立运行。

```bash
pnpm android:build
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.zhangcuncai.wordatlas/.MainActivity
```

完整离线资源约 665 MB，当前 debug APK 约 671 MB。APK、签名密钥、本机 SDK 配置及个人学习数据不纳入源码仓库，安装包需自行构建。

更新时保留相同包名与签名，使用 `adb install -r`。debug 签名默认由本机 Android 工具生成，换电脑构建前需自行妥善保留签名。不要通过卸载解决签名冲突，以免丢失本地进度；换设备前请导出备份。

## 验证

```bash
pnpm test
pnpm check:atlas
pnpm check:splash
pnpm build
```

以下浏览器检查使用本机 Chrome，需先在另一个终端运行 `pnpm dev`：

```bash
pnpm check:mobile
pnpm check:interface
pnpm check:foldable
pnpm check:motion
```

已在 SM-N9760 / Android 12 上验证安装、离线媒体、学习、备份与返回键等流程。折叠屏适配已完成浏览器尺寸与连续切换测试；Galaxy Z Fold8 Ultra 尚未进行真机折叠验证，模拟测试不等于目标设备验收。

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/` | React 界面、学习逻辑与原生适配 |
| `android/` | Android 工程与 Gradle wrapper |
| `public/` | 包内词库、图片、录音与音效 |
| `data/` | 上游 JSON / CSV 词库 |
| `scripts/` | 构建、校验和上游内容生成脚本 |
| `docs/` | Android、数据结构、记忆模型与内容流程说明 |

`scripts/atlas/` 保留上游内容生成工具，其外部服务配置不用于日常使用或构建现有离线应用。不要把任何服务凭据写入源码。

## 来源与许可证

- **上游项目与原作者**：[designfuchen/word-atlas](https://github.com/designfuchen/word-atlas)。感谢原作者开放源码、词库、插画与录音。
- **代码与界面**：[MIT License](LICENSE)，保留 `Word Atlas contributors` 版权声明。
- **词库、插画、词条录音**：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，署名 **Word Atlas contributors**，具体范围见 [CONTENT_LICENSE.md](CONTENT_LICENSE.md)。本仓库未修改上游学习内容，改动集中于应用封装、界面和运行行为。
- **第三方依赖与字体**：遵循各自许可证，Fraunces 字体采用 SIL Open Font License 1.1。

上游内容使用生成式 AI 和合成语音制作，经过自动校验但未逐条人工审校，可能存在释义、例句、插画或发音错误。这不是官方雅思词表，也不代表雅思考试主办方。

本衍生版本的问题请提交到 [shawncai/words Issues](https://github.com/shawncai/words/issues)，附词条 ID、设备信息和复现步骤。不要在 Issue 或提交中附账号密码、令牌、签名文件或私人备份。

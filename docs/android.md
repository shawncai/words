# 词光 Android 完整离线版

本项目基于 [Word Atlas](https://github.com/designfuchen/word-atlas) 提交 `c70d57d2b697f4de6ad512c62ba9495c4e5dc61c`，复用原有 React 页面、词库和 FSRS 学习逻辑，以 Capacitor 8.6.0 打包为个人使用的 Android debug APK。

应用名为「词光」，包名为 `com.zhangcuncai.wordatlas`。已在三星 SM-N9760、Android 12 上完成真机验证。包含个人设备信息和测试过程的本地验收清单不随源码公开。

## 离线内容与功能

- 包内包含 7,298 个词条、完整插画、缩略图、字体、界面音效和环境声音。
- 词条录音共 22,905 段：每个词条各有英音、美音及第一条例句录音，另有 1,011 条第二条例句录音。
- 已有录音从 APK 内读取；缺少录音时仅尝试设备可用的本地语音，没有本地语音则明确提示不可播放。
- 保留每日学习、四类测验、图鉴、星图、练习、收藏、统计、设置及本地备份。首版不包含云同步、换画风或循环播放。
- 完整资源约 665 MB；最终 APK 大小以实际构建产物为准。安装后学习不依赖电脑、预览服务器或网站。关于页中的外部链接仍需网络。

原生版本不注册网页 Service Worker，资源随 APK 一起更新；网页版仍保留原离线缓存机制。学习进度和设置存储在当前设备，保持原有 JSON v2 备份格式。

## 构建环境

| 工具 | 本项目使用的版本或位置 |
| --- | --- |
| Node.js | 22.22.3，通过 nvm 切换，见 `.nvmrc` |
| pnpm | 8.15.8，使用 `pnpm-lock.yaml` |
| Java | Android Studio 自带 JBR 21 |
| Android SDK | `$HOME/Library/Android/sdk`，平台 36 |
| Android Gradle Plugin | 8.13.0 |
| Gradle Wrapper | 8.14.3，由工程固定 |

在项目根目录准备环境：

```bash
source "$HOME/.nvm/nvm.sh"
nvm use
node --version
pnpm --version
export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"
pnpm install --frozen-lockfile
dot_clean ./
```

确认 Node 和 pnpm 版本与上表一致后再继续。只使用 pnpm；上游 `package-lock.json` 保留为版本来源，不用于安装，不重新解析或自动升级已有依赖。新增依赖审查记录见 [android-dependencies.md](android-dependencies.md)。

验证并构建：

```bash
pnpm test
pnpm check:atlas
pnpm check:splash
pnpm android:build
```

`android:build` 会执行生产构建、`cap sync android` 和 `assembleDebug --no-daemon`，并在生成资源后执行 `dot_clean ./`。首次构建需要联网获取尚未缓存的依赖和 Gradle 工具；后续 App 运行不需要这些服务。

当前源码位于 ExFAT 外盘，全局 `~/.gradle` 也指向该外盘。ExFAT 的 AppleDouble 元数据文件（例如 `._*.class`）会被 Gradle 的字节码扫描器误读，导致构建失败。因此构建脚本只为本任务设置以下内盘位置：

- Gradle 用户缓存：`$HOME/Library/Caches/word-atlas/gradle`。
- 编译产物：`$HOME/Library/Caches/word-atlas/android-build`。
- 项目缓存：上述编译目录中的 `project-cache`。

脚本通过 `GRADLE_USER_HOME`、`WORD_ATLAS_BUILD_ROOT` 和 `--project-cache-dir` 使用这些目录，最后将 APK 复制回项目中的交付路径。无需移动源码，也不修改全局 Gradle 环境、符号链接或其他项目的缓存。若自定义 `WORD_ATLAS_GRADLE_HOME` 或 `WORD_ATLAS_BUILD_ROOT`，同样应使用 Mac 内盘目录。

APK 路径：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

需要检查 Android 工程时可运行 `pnpm android:open`；本机生成 APK 使用 `pnpm android:build`，以应用上述内盘缓存配置。仅调试网页时使用 `pnpm dev`，退出调试后关闭该进程。

## USB 安装与更新

手机开启 USB 调试，连接电脑并在手机上允许授权。以下命令假定只连接一台目标设备：

```bash
adb devices -l
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.zhangcuncai.wordatlas/.MainActivity
```

设备显示 `unauthorized` 时，在手机上完成授权后重试。多台设备同时连接时，用 `adb devices -l` 中对应的设备标识为命令增加 `-s` 参数。

更新使用相同包名和相同 debug 签名执行 `adb install -r`，以保留应用数据。默认 debug 签名位于 `$HOME/.android/debug.keystore`；换电脑构建前需要妥善保留同一签名文件，不将其提交到仓库。签名不匹配或安装失败时，先排查原因，不自动卸载应用。

**卸载、清除应用数据或丢失设备都会丢失本地进度。** 更新前可先导出备份。当前 APK 用于个人设备安装，不是应用商店发布包，不需要发布账号或 API Key。

## 备份、恢复与分享

在「我的 → 数据 → 导出备份」中打开 Android 系统分享面板，再由用户选择保存位置或接收应用。应用缓存中的导出文件只是交接文件，只有保存到所选目标后才是可独立使用的备份；关闭分享面板不会显示虚假的保存成功提示。

恢复时在「导入备份」选择 JSON 文件。应用先检查文件大小、版本和词库，再询问是否替换当前词库的学习记录与设置。确认前建议先导出当前进度。取消确认不修改数据；网页与 Android 版本使用同一 v2 格式。

词卡、学习成绩卡和星图分享同样打开系统分享面板。发送目标和最终发送操作由用户选择。应用不申请全盘存储、联系人、定位、相机或麦克风权限。

## 验收与结束清理

验收覆盖 360px、412px、真机尺寸、横屏和放大字体；完整学习与测验；断网冷启动和音频；切后台及关闭重开后的进度；软键盘、系统返回、备份恢复和分享取消。恢复测试使用测试数据，避免覆盖真实进度。

记录完成后关闭本任务启动的预览、浏览器与 Android Studio 窗口，并清理本任务的后台服务：

```bash
adb kill-server
(cd android && GRADLE_USER_HOME="$HOME/Library/Caches/word-atlas/gradle" ./gradlew --stop)
dot_clean ./
```

不要停止其他任务正在使用的服务。本地保留 APK 与验收清单；源码仓库不提交个人测试记录，后续继续使用同一包名与签名覆盖安装。

## 当前界面约束与回归检查

2026-11-11 的界面修订统一采用小圆角和平面分区，移除非必要描述文案、嵌套卡框及普通投影。学习正文和必要状态信息保留。后续开发遵循根目录 [AGENTS.md](../AGENTS.md)。

浏览器验收先在一个终端运行 `pnpm dev`，另一个终端运行 `pnpm check:interface` 和 `pnpm check:mobile`；完成后退出预览进程。`check:interface` 包括图鉴标签文字边界、窄屏与横屏、放大字体、筛选首尾可达性和小圆角约束。

## 首页顶部栏与折叠屏展开

固定品牌顶部栏仅在「今日」显示，其余页面直接呈现内容标题。窗口宽度不足 600px 使用底部导航，600px 起使用侧边导航；展开后的图鉴增加列数，今日、练习和设置按可用空间分栏。学习与词卡在内容容器达到 580px 后采用插画、正文并排布局，插画始终完整显示。

用户目标机型为三星 Galaxy Z Fold8 Ultra。[三星官方规格](https://www.samsungmobilepress.com/articles/galaxy-z-fold8-ultra-fold8-flip8-perfected-every-way-living)列出外屏 1080×2520、内屏 2256×2504 物理像素。回归测试包含保持这些比例的 360×840、752×835、835×752 CSS 窗口，以及 540–900px 的其他窗口；实际 CSS 尺寸取决于设备密度、显示缩放及分屏状态，因此未硬编码机型分辨率。

预览运行时执行 `pnpm check:foldable`。测试连续切换外屏、内屏和横屏，检查搜索、筛选、词卡、学习会话、未提交拼写、输入焦点和答题反馈保持；软键盘单独按不旋转屏幕的窗口收缩模拟。Android Activity 允许调整大小，并处理配置变化，避免折叠时重建页面。

当前 USB 设备为 SM-N9760（Android 12）。该设备用于覆盖安装与数据保留验证；Fold8 Ultra 的实际折叠、系统键盘与分屏行为仍需目标设备接入后验证，浏览器模拟结果不作为该机型真机验收。

## 进度动画与星图位置

周统计柱使用底部对齐的 `scaleY`，通过反向补偿纵向圆角保持柱形；学习与打字练习共用进度条使用固定宽度填充层的 `translateX`，保留原有 10px 最低显示、渐变和圆角。两处均沿用 0.6 秒缓动，并遵循系统减少动画偏好，不再逐帧改变布局高度或宽度。

图鉴星图视图收紧标题、搜索、切换栏之间的留白：手机窄屏上移 32px，展开宽屏上移 22px，不隐藏操作控件。预览运行时执行 `pnpm check:motion`，覆盖动画中间态、零值/半值/满值、固定布局尺寸、学习推进及四种窗口的星图位置。

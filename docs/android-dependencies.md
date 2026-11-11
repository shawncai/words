# Android 依赖审查

2026-11-11，基于 registry 包元数据和 Capacitor 官方文档核对。

| 包 | 固定版本 | 用途 |
| --- | --- | --- |
| @capacitor/core | 8.6.0 | 原生桥接及系统栏 |
| @capacitor/android | 8.6.0 | Android WebView 容器 |
| @capacitor/cli | 8.6.0 | 本地同步和构建工具 |
| @capacitor/app | 8.1.2 | 前后台事件、系统返回 |
| @capacitor/filesystem | 8.1.5 | 备份和图片临时文件 |
| @capacitor/share | 8.0.3 | 系统分享面板 |

以上均来自 Ionic/Capacitor 官方仓库，MIT 许可，无安装阶段 lifecycle 脚本。Filesystem 的官方传递依赖包括 @capacitor/synapse；CLI 包含文件操作、终端和原生运行工具。传递版本与完整性摘要由 pnpm-lock.yaml 固定。

只使用应用私有缓存保存导出文件，不申请全盘存储、通讯录、定位、相机或麦克风权限。分享目标由用户在系统面板选择。无运行时远程代码、遥测、账号或 API Key。

上游 package-lock.json 保留作版本来源，通过 pnpm import 转换；安装和执行仅使用 pnpm。已有直接依赖保持上游锁定版本。安装后执行 pnpm audit，不使用 audit fix 或自动升级来消除告警。

## 审查结果

2026-11-11，本次锁定依赖安装后的 `pnpm audit` 结果为：**共审计 255 个依赖，已知漏洞 0 项**。未使用 `audit fix`，未为消除告警自动升级依赖。该结果对应本次锁文件和执行时的漏洞数据库，不代表对所有运行行为的安全保证。

原有直接依赖的精确版本已与上游锁文件核对，包括 React / React DOM 19.3.1、Vite 6.4.5、TypeScript 5.9.3 和 Playwright 1.64.1。清单从版本范围改为原锁文件中的精确值，保持原有解析版本。

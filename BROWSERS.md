# 栖页 Qiye 浏览器支持

面向桌面浏览器，使用对应扩展包；普通网页只展示演示数据，不能读取真实浏览器标签。每个浏览器及用户资料单独保存收藏，跨浏览器迁移可使用导入 / 导出，或用户自行配置的 WebDAV / Gist。

| 浏览器 | 版本与构建目录 | 标签 / 多窗口 / 会话 | 原生书签 | 原生标签组 | 休眠 |
| --- | --- | --- | --- | --- | --- |
| Chrome、Edge、Brave、Opera、Vivaldi | Chromium 内核 120+，`dist/` | 已适配 | 已适配 | 浏览器提供相应接口时可用 | 浏览器提供相应接口时可用 |
| Firefox | 140+，`dist-firefox/` | 已适配 | 已适配，保护内置目录、忽略分隔线 | 已适配 | 已适配 |
| Safari（macOS） | 建议 Safari 18+，`dist-safari/` 转换源 | 已提供适配与降级，需打包验证 | 浏览器未提供接口 | 浏览器未提供接口 | 浏览器未提供接口 |

“已适配”表示本项目代码与自动检查已覆盖该接口；不代表已在上述每个浏览器中安装实测。当前验证包括 Chromium 网页交互、Firefox Promise 接口模拟、后台初始化、多窗口、原生书签保护、缺少接口时的正常启动，以及各构建清单和入口。Safari 尚未生成或验证已签名应用。移动浏览器不在本次支持范围。

原生接口不可用时，工作台仍可读取已打开标签、管理会话和暂存；相应按钮会禁用并说明原因。不会将模拟数据冒充为真实书签，也不会用关闭标签来模拟休眠。已保存但未打开的浏览器工具栏标签组不属于可完整读取的范围。

## 安装与构建

- Chromium 通用包：`qiye-workspace-chromium-v1.5.0.zip`，先解压，再在扩展管理页加载包含 `manifest.json` 的文件夹。
- Firefox 专用包：`qiye-workspace-firefox-v1.5.0.zip`，解压后通过 `about:debugging#/runtime/this-firefox` 的“临时载入附加组件”选择 `manifest.json`。未签名构建仅供临时测试，重启浏览器后需要重新加载；长期分发需要 Mozilla 签名。
- Safari 转换源包：`qiye-workspace-safari-source-v1.5.0.zip`，不能直接安装为 Safari 扩展。完整源码项目中运行 `npm run safari:project`，需要 macOS 和完整 Xcode。脚本优先使用新版 `safari-web-extension-packager`，兼容旧版 `safari-web-extension-converter`，生成独立的 `safari-project/`，不覆盖已有项目。之后在 Xcode 选择自己的签名团队并构建；分发需完成 Apple 的签名与发布流程。

`npm run build` 同时生成三个构建目录，`npm run package` 同时生成三个 ZIP。也可用 `npm run build:firefox`、`npm run package:firefox` 单独处理 Firefox。保留原有 `dist/` 作为 Chromium 加载路径，更新时不改变旧扩展的数据位置。

Firefox 的基础功能仅在本机工作。远端同步默认关闭；保存同步配置时才申请目标站点权限及 Firefox 的可选数据传输同意。用户撤销同意后，手动、测试和后台同步都会停止发送数据，已有本地收藏保留。

## 参考资料

- [跨浏览器后台脚本（MDN）](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
- [原生标签组兼容性（MDN）](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups)
- [书签兼容性（MDN）](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks)
- [标签休眠兼容性（MDN）](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/discard)
- [Firefox 数据传输同意](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
- [Safari 扩展打包（Apple）](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)
- [Edge 与 Chromium 扩展（Microsoft）](https://learn.microsoft.com/en-us/microsoft-edge/extensions/)

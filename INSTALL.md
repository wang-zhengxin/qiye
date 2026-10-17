# 栖页 Qiye 安装说明

## Chrome / Edge / Brave / Opera / Vivaldi

1. 解压 Chromium 通用 ZIP 安装包。
2. 找到直接包含 `manifest.json`、`index.html` 和 `background.js` 的文件夹。
3. 打开对应浏览器的扩展管理页，开启“开发者模式”，点击“加载已解压的扩展程序”，选择上述文件夹。

| 浏览器 | 扩展管理页 |
| --- | --- |
| Chrome | `chrome://extensions` |
| Edge | `edge://extensions` |
| Brave | `brave://extensions` |
| Opera | `opera://extensions` |
| Vivaldi | `vivaldi://extensions` |

也可以直接加载源码项目生成的 `dist` 文件夹。不要在文件夹选择器中选择 ZIP 文件、项目目录或 `artifacts` 目录。

## Firefox 140 及以上

1. 解压 Firefox 专用 ZIP 安装包，或在源码项目使用 `dist-firefox/`。
2. 打开 `about:debugging#/runtime/this-firefox`。
3. 点击“临时载入附加组件”，选择该文件夹中的 `manifest.json`。

当前提供的 Firefox 包未经过 Mozilla 签名，适用于临时加载测试。重启 Firefox 后需重新载入。普通 Firefox 的长期安装需要已签名的扩展包，不能将未签名 ZIP 当作正式附加组件直接安装。

## Safari（macOS）

Safari 源包不能直接安装。需要完整 Xcode，通过 Apple 的 Safari Web Extension 打包工具生成应用。在完整源码项目运行 `npm run safari:project`；或解压 Safari 源包后，使用 Xcode 的 `safari-web-extension-packager`（旧名 `safari-web-extension-converter`）转换。选定自己的签名团队后构建并运行应用，再在 Safari 设置中启用扩展。

Safari 暂不开放原生书签、标签组和休眠接口；这些操作会停用，标签管理、会话保存和暂存仍可使用。当前只提供转换源，尚无已签名 Safari 应用。

## 更新

Chromium 浏览器：在原加载目录中更新文件，然后到扩展管理页点击栖页 Qiye 卡片上的刷新按钮。保持相同的加载目录，避免浏览器将它识别为另一个扩展。Firefox 临时附加组件可在调试页重新载入。

保留加载目录，避免移动或删除后扩展无法继续加载。跨浏览器安装不会自动迁移本地数据，可先导出收藏再导入。完整兼容范围见同包中的 `BROWSERS.md`。

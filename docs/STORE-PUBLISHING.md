# 栖页 Qiye 商店发布准备清单

核对日期：2026-10-19。基于当前 v1.5.0 仓库、用户确认及各平台官方文档整理。账号、身份核验和费用以提交时的平台后台为准；“待确认”表示尚未提供确认信息或未实际验证。

## 当前已有

- [x] 项目名称与品牌图标。
- [x] 中文、英文 README，以及安装、浏览器兼容和配置说明。
- [x] Chromium、Firefox、Safari 转换源三个独立构建目标。
- [x] v1.5.0 GitHub Release、三个 ZIP 和 SHA-256 校验文件。
- [x] GitHub 自动测试、打包、版本标签触发的 Release 发布；上次验证 110 项测试通过。
- [x] Chrome、Edge、Firefox 三个商店账号已注册（用户确认）。
- [x] Chrome 账号认证已通过（用户确认）。
- [x] 发布基本信息已确认：个人发布，公开支持邮箱为 wangzhengxin007@gmail.com，首版免费。
- [ ] 各后台尚需完成的发布设置、双重验证或额外核验：提交前检查；Edge、Firefox 的额外核验状态未单独确认。
- [x] 中英文隐私政策及 Edge 专用版本已按实现生成，文件见 docs/store/generated/；公开链接的发布验证见 docs/store/verification.md。
- [x] 三家商店中英文文案、十张 1280×800 截图、四种尺寸图标和中英文宣传图已生成，见 docs/store/。
- [ ] 各目标浏览器真实安装、升级与同步验收：尚未全部完成。
- [ ] Firefox 正式签名、Safari App Store 可分发构建：尚未完成。

现有 GitHub 流程发布的是 GitHub Release，尚未配置向浏览器商店提交或发布。

## 1. 你需要提供或确认

- [x] 发布主体：个人（用户确认）。
- [x] 对外开发者署名沿用各商店账号现有显示名称（用户确认），无需再次手写。
- [x] 公开支持邮箱：wangzhengxin007@gmail.com（用户确认）。
- [ ] 审核通知联系人及接收通知的后台配置：提交前检查。
- [x] 收费方式：首版免费（用户确认）。
- [x] 栖页 Qiye 的中文和英文商店简介、详细功能说明已自动生成。
- [x] Chrome、Edge、Firefox 商店账号注册；Firefox 使用与 Chrome 相同的 Google 账号登录（用户确认）。
- [x] Chrome 账号认证通过（用户确认）。
- [ ] 提交前检查三个后台是否仍有发布设置、双重验证、付款或额外身份核验提示；不把账号注册等同于所有发布设置均已完成。
- [x] 政策使用“栖页 Qiye 个人开发者”作为事实性运营者称呼，生效日期 2026-10-19，联系邮箱 wangzhengxin007@gmail.com。
- [x] 用户确认代码与素材有发布授权；已有来源说明保留。
- [x] 用户选择 MIT 开源许可；已加入 LICENSE，并随构建与材料包分发。

账号密码、验证码和私人 Token 无需写进清单、仓库或普通聊天消息；日后自动上传只使用必要权限的 CI 凭据。

登录邮箱与公开支持邮箱分别管理。登录账号已保存在被 Git 忽略的本地发布记录 `artifacts/publishing-accounts.md`。用户已指定 wangzhengxin007@gmail.com 为公开支持邮箱，可用于商店资料、隐私政策和支持页面；对外开发者署名已确认沿用各商店账号现有显示名称。

## 2. 各商店分别准备

| 渠道 | 账号和准备项 | 当前项目还需完成 |
| --- | --- | --- |
| Chrome Web Store | 账号已注册、认证已通过；提交前检查剩余后台设置 | 文案素材、隐私披露、权限理由、Chromium ZIP 和安装实测 |
| Microsoft Edge Add-ons | 账号已注册；该扩展计划无注册费 | 检查后台是否还有核验提示；Edge 实测，准备面向 Edge 的文案、截图、隐私说明与 Chromium ZIP |
| Firefox Add-ons / AMO | 账号已注册，使用与 Chrome 相同的 Google 账号登录 | Firefox ZIP、商店资料、隐私政策、审核说明与必要的源码构建资料；完成 AMO 校验、数据传输同意流程实测、签名及正式扩展 ID 确认 |
| Safari / App Store | Apple Developer Program（99 USD/年或当地价格）、App Store Connect、应用标识、商店素材、隐私资料、打包与签名 | 先完成 macOS Safari 打包、安装及功能降级验证；当前 source ZIP 不是可直接安装的应用 |
| Opera Add-ons（可选） | Opera 开发者资料、商店文案、素材与符合其要求的扩展包，提交独立审核 | 在 Opera 中验证原生分组、休眠、书签等实际能力后再提交 |

账号与提交流程依据：[Chrome 注册](https://developer.chrome.com/docs/webstore/register/)、[Chrome 双重验证](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)、[Edge 开发者登记](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)、[Firefox 提交说明](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)、[Apple 会员](https://developer.apple.com/programs/)、[Safari 分发](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)、[Opera 发布指南](https://help.opera.com/en/extensions/publishing-guidelines/)。

Brave 和 Vivaldi 可通过 Chrome Web Store 安装扩展，首阶段可共用 Chrome 商店链接，仍应分别实测兼容性。参考：[Brave](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave)、[Vivaldi](https://help.vivaldi.com/desktop/appearance-customization/extensions/)。

Safari 可选用 Apple 的 [App Store Connect 云端打包](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)，不一定需要本地 Mac / Xcode 来完成打包；会员资格、产品资料、测试和审核仍需完成。本项目现有脚本采用本地 Xcode 路径，目前未完成云端打包验证。

## 3. 通用商店资料与素材

- [x] 三家商店的中英文标题、简短介绍、详细说明及建议分类已生成；版本更新说明见 docs/releases/v1.5.0.md。
- [x] 核心用途与各项权限说明已从清单与代码生成，见 docs/store/generated/permissions.md。
- [x] 商店文案明确桌面浏览器、功能边界和已保存但未打开的工具栏组限制。
- [x] 已从现有 SVG 生成 128、300、512、1024 像素图标；Apple 正式应用图标仍应按最终目标平台制作。
- [x] 已生成中英文各五张 1280×800 截图：多窗口、会话、书签、展示配置、可选同步；使用隔离演示数据，并保留截图来源记录。
- [x] 已生成 440×280 与 1400×560 中英文宣传图，并保留可编辑 SVG。
- [ ] 产品介绍页、支持链接和公开可访问的 HTTPS 隐私政策地址。
- [x] 已准备中英文审核操作说明、源码重建步骤和同步测试方法，未嵌入私人测试凭据。

尺寸区别：Chrome 要求 128×128 图标、至少 1 张截图及 440×280 小宣传图，截图可用 1280×800 或 640×400，最多 5 张；Edge 图标推荐 300×300、最低 128×128，截图可选，最多 6 张，可用 1280×800 或 640×480。因此共用截图优先选 1280×800。参考：[Chrome 图片要求](https://developer.chrome.com/docs/webstore/images)、[Edge 发布资料](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)。Apple 素材应在确定 macOS / iOS 目标后按相应平台要求制作，首版当前只规划桌面。

原 README 竖图保留；商店截图已重新从界面截取为 1280×800，并非拉伸原图。

## 4. 隐私披露和权限说明

- [ ] 说明会读取、使用和本地保存哪些标签标题、网址、分组、书签、会话及偏好。
- [ ] 分开说明本地使用与用户主动开启的 WebDAV / GitHub Gist 同步；后者会把相应数据发送到用户指定服务，不能笼统填写“完全不联网、不传输任何数据”。
- [ ] 准确解释认证信息：凭据保存在本机、不会进入收藏导出或同步正文，但连接服务时会用于认证。不要声称已端到端加密或加密存储，除非实际实现并验证。
- [ ] 说明如何关闭同步、清除凭据、删除本地数据，以及如何删除远端备份；本地删除不等于远端副本自动删除。
- [ ] 检查隐私政策、商店问卷和实际行为完全一致。Firefox 需实测拒绝或撤销可选数据传输同意后，同步确实停止。
- [ ] 审查 HTTP WebDAV：当前地址校验与请求允许 HTTP，且可能携带认证信息和收藏正文。建议商店版本限制公网同步使用 HTTPS，必要的本地调试另行区分并验证。Edge 明确要求敏感数据通过安全通道传输，不能靠免责声明替代传输保护。
- [ ] 准备以下权限的逐项理由，并删除最终版本没有使用的权限。

| 当前权限 | 与功能对应的说明 |
| --- | --- |
| `tabs` | 读取当前标签信息，定位、移动、恢复、休眠或关闭标签 |
| `tabGroups` | 读取和操作浏览器当前已打开的原生标签组 |
| `bookmarks` | 读取、新增、编辑、移动、删除和恢复浏览器书签 |
| `storage` | 在本机保存会话、偏好、快照、回收站和连接配置 |
| `contextMenus` | 提供用户可配置的右键快捷操作 |
| `alarms` | 按用户设置调度可选自动同步 |
| 可选站点权限 | 只在配置同步服务时申请对应服务站点；任意 WebDAV 地址需要解释为何不能预先固定所有服务域名 |

隐私与权限要求参考：[Chrome 隐私字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)、[Edge 开发者政策](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)、[Firefox 数据传输同意](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)、[Apple 隐私资料](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)。

## 5. 提交前的安装验收

- [ ] 在独立浏览器用户资料中完成全新安装，并确认默认不连接同步服务。
- [ ] 多窗口展示完整；原生组成员不重复；当前窗口范围准确。
- [ ] 拖动排序、跨窗口移动、分组、休眠与关闭行为符合描述；正在使用的标签受到保护。
- [ ] 书签新增、编辑、嵌套移动、删除与恢复正常；系统和托管目录受到保护。
- [ ] 保存与恢复会话、锁定保护、回收站、导入导出和快照恢复正常。
- [ ] 设置保存、重启后的保留，以及中文、英文、深色主题显示正常。
- [ ] 使用测试服务验证真实同步读写、断网、认证失效、拒绝授权和撤销授权；不只依赖模拟接口测试。
- [ ] 从旧版本升级后数据保留；开发者模式版本迁移到商店版本时提供备份与导入指引，避免假定不同扩展 ID 的本地存储会自动迁移。
- [ ] Firefox 完成正式包校验和签名安装测试；Safari 完成实际应用安装和已降级功能检查。
- [ ] 确认包内无私人 Token、密码、测试账号和不应公开的演示内容。

## 6. 下载页面与发布后工作

- [ ] 下载页分别放置 Chrome、Edge、Firefox 等已上线商店入口；尚未上线的渠道明确标注。
- [ ] 单独提供开发者 ZIP、版本号、校验文件、更新记录及安装教程。Chromium ZIP 先解压加载，不能描述为普通用户点击 ZIP 即安装。
- [ ] Firefox 面向普通用户的直接下载使用已签名 XPI；当前 Release 中未签名 ZIP 继续标记为测试用途。参考：[Firefox 自分发](https://extensionworkshop.com/documentation/publish/self-distribution/)。
- [ ] 提供隐私政策、支持邮箱或问题反馈入口。
- [ ] 上线后记录各商店扩展 ID、页面地址、账号归属及审核通知渠道。
- [ ] 首版建议手动提交，待账号和扩展 ID 稳定后，再决定是否给 GitHub 工作流增加商店上传能力。自动上传不等于免审核，也不等于自动公开发布。

建议先准备 Chrome、Edge 和 Firefox，Opera 作为补充，Safari 在打包及实测完成后单独发布。这是结合当前项目状态的实施顺序建议，并非平台要求。

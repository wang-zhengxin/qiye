# 商店材料生成与验证记录

日期：2026-10-20 · 扩展版本：1.5.2

## 已自动完成

- 用户确认个人发布、公开支持邮箱、首版免费、署名沿用各商店现有显示名称。
- 用户确认代码与素材有发布授权，采用 MIT 许可；根目录和构建包附带 LICENSE。
- 从 manifest 与设置定义生成 Chrome、Edge、Firefox 中英文标题、摘要、详细说明、分类建议及联系字段；摘要和标题长度、说明长度已由生成器检查。
- 按当前数据处理实现生成中英文隐私政策、Edge 专用政策、权限理由、支持及删除数据说明；审核说明含源码构建步骤。
- 从品牌 SVG 生成四种尺寸图标及两种尺寸中英文宣传图。
- 使用独立 Chrome 155 预览上下文生成中英文各五张 1280×800 截图，没有读取个人资料或私人书签。assets/screenshots.json 记录了源文件和图片 SHA-256。
- 现有 121 项测试通过；它们覆盖业务逻辑及模拟扩展接口，不等同于三家浏览器全部安装实测。
- 六份中英文商店字段通过标题、摘要和详细说明长度、平台名称、联系邮箱与许可证检查。
- 三个 ZIP 的 CRC、根目录 manifest.json 与 LICENSE 已检查，各含 79 个文件。
- 材料预览所有图片可加载，文案复制可用，桌面与 390 像素窄屏布局通过检查；Edge 专用政策标题匹配。
- GitHub CI 已加入商店文本与政策自动生成步骤，并单独保留文本构建附件。

## 公开文档地址

以下文件已随提交 d43ee337acac108cd627e4285710b5486c38dc67 发布至既有公开 GitHub 项目。六份中英文政策与支持文件均通过无登录凭据的公开 API 读取检查，内容摘要与本地一致。

- 通用中文隐私政策：https://github.com/wang-zhengxin/qiye/blob/main/docs/store/generated/privacy.zh-CN.md
- 通用英文隐私政策：https://github.com/wang-zhengxin/qiye/blob/main/docs/store/generated/privacy.en.md
- Edge 中文隐私政策：https://github.com/wang-zhengxin/qiye/blob/main/docs/store/generated/privacy.edge.zh-CN.md
- Edge 英文隐私政策：https://github.com/wang-zhengxin/qiye/blob/main/docs/store/generated/privacy.edge.en.md
- 支持说明：https://github.com/wang-zhengxin/qiye/blob/main/docs/store/generated/support.zh-CN.md

材料预览 HTML 是可离线浏览的文档总览，并未部署为独立产品网站。GitHub 文档链接可用于读取政策；最终仍需通过目标商店的 URL 检查。

GitHub [Build and test #39227946431](https://github.com/wang-zhengxin/qiye/actions/runs/39227946431) 已成功完成，生成扩展包附件和独立商店文本附件。

## 材料包独立核验

- 四种尺寸图标、两种尺寸的中英文 RGB 宣传图和十张截图均通过尺寸与摘要校验。
- 材料 ZIP 的 CRC、文件路径、MIT 许可证与 SHA256SUMS 清单通过检查；不包含私人 Edge 登录邮箱、账号密码或真实 Token。
- 审核源码 ZIP 在独立临时目录中解压后，分别重建 Firefox 与 Chromium 包；生成结果与材料包内对应扩展 ZIP 的 SHA-256 完全一致。

## 工程与平台验收状态

以下是工程或平台流程事项，不是要求用户重新手写材料：

1. 已完成 HTTPS 限制：移除 HTTP 可选访问范围，新配置和旧配置均在请求边界检查，HTTP 不会发出请求或凭据。本机 HTTPS 集成测试和回归测试完成；真实用户所选服务仍需各自验证。
2. 用户已明确同意补齐 Firefox 可选声明 browsingActivity / authenticationInfo / bookmarksInfo / technicalAndInteraction / searchTerms。同步按功能请求，关闭偏好同步时不请求设置数据，搜索词单独授权。拒绝/撤销回归已验证；AMO 正式审核及签名仍待平台完成。
3. 需要在实际目标浏览器中完成原生分组、休眠、书签、权限撤销和升级迁移的安装验收，以及真实 WebDAV / Gist 测试。演示截图不能替代它们。
4. Firefox 正式签名与商店审核尚未执行；商店 ID、商店页面和最终审核结果由平台返回后自动补入 profile.json，当前不编造。
5. 商店后台如果要求实名、地址、付款或验证码，只能由账号本人在后台完成；无需把这些私人信息写进项目。此前账号注册和 Chrome 认证状态采用用户确认信息。

## 材料包与版本关系

本材料包对应当前 v1.5.2 源码及本地构建，附带 MIT 许可证。本次未创建新的公开 GitHub Release，也未覆盖既有 v1.5.0 附件；当前包以本次 SHA256SUMS 为准。

## v1.5.1 界面修复验收

- 独立 Chrome 155 演示上下文显示 150 个标签、3 个窗口，右侧及主列表可滚动到最后一个标签；勾选后保留滚动位置。
- 导航栏和标签栏宽度、导航及内容区高度、暂存与打开标签卡片高度可拖动调整；刷新保留，双击恢复单项，顶部按钮恢复全部，方向键可微调。
- 打开标签自定义显示名可保存、刷新保留、留空恢复原标题；保存为会话后保留当时的显示名。未添加网页注入或其他浏览器权限。
- 已保存标签及原生分组重命名通过演示界面验证；原生分组更新与跨工作台名称刷新另以 Firefox Promise 接口模拟验证。
- 390、620、850、900、1000 像素宽度下无页面横向溢出；480 和 600 像素高度下可访问完整右侧卡片。设置长页面可滚动，英文入口可用。
- 新截图由当前代码重新生成。这些隔离演示与模拟接口检查不替代上方所列真实浏览器安装验收。

## v1.5.2 发布前校验

- 121 项测试通过；覆盖旧 HTTP 配置不发出请求、凭据不外发、分项数据授权及撤销。
- 隔离界面验证搜索词授权拒绝时不跳转，同意后只发送当前查询；外部标题以文本显示。
- 本机临时 HTTPS WebDAV 服务完成真实 TLS 读写、固定测试凭据认证、拉取和恢复快照；没有使用用户服务或私人凭据。测试客户端仅信任该临时证书，正式实现由浏览器正常验证 TLS。
- Mozilla web-ext 10.8.0 校验结果：0 errors、0 notices、23 warnings，原始报告见 lint-firefox-v1.5.2.json。
- 16 项 UNSUPPORTED_API 提示指向本项目 BrowserAdapter 对象的 capabilities 字段，属于同名 browser 标识被误识别为原生接口；6 项 innerHTML 提示需人工审阅，外部标题/网址/错误消息使用 esc 转义，未加载远端执行代码。
- Android 最低版本提示保留：本项目仅面向桌面 Firefox，未声明 gecko_android，商店不选择 Android。桌面最低 140 支持数据传输授权；该提示不作为 Android 兼容验收。
- 商店提交状态必须以平台返回为准，生成材料和通过本地校验均不等于已提交或已上线。

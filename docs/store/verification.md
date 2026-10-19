# 商店材料生成与验证记录

日期：2026-10-19 · 扩展版本：1.5.1

## 已自动完成

- 用户确认个人发布、公开支持邮箱、首版免费、署名沿用各商店现有显示名称。
- 用户确认代码与素材有发布授权，采用 MIT 许可；根目录和构建包附带 LICENSE。
- 从 manifest 与设置定义生成 Chrome、Edge、Firefox 中英文标题、摘要、详细说明、分类建议及联系字段；摘要和标题长度、说明长度已由生成器检查。
- 按当前数据处理实现生成中英文隐私政策、Edge 专用政策、权限理由、支持及删除数据说明；审核说明含源码构建步骤。
- 从品牌 SVG 生成四种尺寸图标及两种尺寸中英文宣传图。
- 使用独立 Chrome 155 预览上下文生成中英文各五张 1280×800 截图，没有读取个人资料或私人书签。assets/screenshots.json 记录了源文件和图片 SHA-256。
- 现有 118 项测试通过；它们覆盖业务逻辑及模拟扩展接口，不等同于三家浏览器全部安装实测。
- 六份中英文商店字段通过标题、摘要和详细说明长度、平台名称、联系邮箱与许可证检查。
- 三个 ZIP 的 CRC、根目录 manifest.json 与 LICENSE 已检查，各含 78 个文件。
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

## 尚未完成的工程与平台验收

以下是工程或平台流程事项，不是要求用户重新手写材料：

1. 当前 HTTP WebDAV 支持可能使认证信息与收藏正文通过未加密连接传输。正文如实披露；正式提交前仍需解决公网 HTTPS 限制及兼容规则，文案不能替代实现修正。
2. Firefox 当前数据传输声明为 optional browsingActivity / authenticationInfo；需结合 AMO 实际校验，复核同步偏好及可选开始页搜索等其他数据分类与授权路径。
3. 需要在实际目标浏览器中完成原生分组、休眠、书签、权限撤销和升级迁移的安装验收，以及真实 WebDAV / Gist 测试。演示截图不能替代它们。
4. Firefox 正式签名与商店审核尚未执行；商店 ID、商店页面和最终审核结果由平台返回后自动补入 profile.json，当前不编造。
5. 商店后台如果要求实名、地址、付款或验证码，只能由账号本人在后台完成；无需把这些私人信息写进项目。此前账号注册和 Chrome 认证状态采用用户确认信息。

## 材料包与版本关系

本材料包对应当前 v1.5.1 源码及本地构建，附带 MIT 许可证。本次未创建新的公开 GitHub Release，也未覆盖既有 v1.5.0 附件；当前包以本次 SHA256SUMS 为准。

## v1.5.1 界面修复验收

- 独立 Chrome 155 演示上下文显示 150 个标签、3 个窗口，右侧及主列表可滚动到最后一个标签；勾选后保留滚动位置。
- 导航栏和标签栏宽度、导航及内容区高度、暂存与打开标签卡片高度可拖动调整；刷新保留，双击恢复单项，顶部按钮恢复全部，方向键可微调。
- 打开标签自定义显示名可保存、刷新保留、留空恢复原标题；保存为会话后保留当时的显示名。未添加网页注入或其他浏览器权限。
- 已保存标签及原生分组重命名通过演示界面验证；原生分组更新与跨工作台名称刷新另以 Firefox Promise 接口模拟验证。
- 390、620、850、900、1000 像素宽度下无页面横向溢出；480 和 600 像素高度下可访问完整右侧卡片。设置长页面可滚动，英文入口可用。
- 新截图由当前代码重新生成。这些隔离演示与模拟接口检查不替代上方所列真实浏览器安装验收。

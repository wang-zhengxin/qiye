# 栖页 Qiye 商店提交材料

适用版本：1.5.0。个人发布，首版免费，公开支持邮箱 wangzhengxin007@gmail.com。

本目录尽量从 manifest、设置定义和真实实现生成资料。商店账号密码、Edge 登录邮箱及私人 Token 不进入本材料目录。商店扩展 ID 和上线地址由首次提交后的平台结果确定，不使用虚构链接。

## 文件用途

| 材料 | 文件 | 使用方式 |
| --- | --- | --- |
| 三家商店中英文文案 | generated/chrome.*、edge.*、firefox.* | Markdown 供阅读，JSON 按字段复制；每家都写明各自浏览器，不用通用文案冒充平台能力 |
| 隐私政策 | generated/privacy.zh-CN.md、privacy.en.md | 可部署为静态文档；字段 JSON 已生成对应 GitHub 文档链接，发布状态见 verification.md |
| Edge 专用隐私政策 | generated/privacy.edge.* | 面向 Microsoft Edge 的独立版本 |
| 权限和隐私字段依据 | generated/permissions.md | 包括单一用途、每项权限、站点访问、远程代码及数据类别 |
| 支持与删除数据说明 | generated/support.* | 支持页正文、反馈渠道、安装和数据控制步骤 |
| 审核操作说明 | reviewer-notes.zh-CN.md、reviewer-notes.en.md | 可填商店审核备注；不虚构测试账号或真实浏览器验收结果 |
| 图标和宣传图 | assets/ | PNG 成品与可编辑 SVG；128、300、512、1024 图标，小图 440×280、大图 1400×560 |
| 中英文截图 | assets/zh-CN/、assets/en/ | 各 5 张 1280×800，来自工作台代码的隔离演示环境，不包含个人浏览器数据 |
| 截图来源记录 | assets/screenshots.json | 源文件摘要、浏览器、尺寸、演示模式及图片校验值 |
| 生成参数 | profile.json | 只含已允许公开的信息；未确定项为 null，而非伪造值 |
| 工程核对与待办 | verification.md | 区分已执行检查、待完成工程验收与真正需要用户确认的信息 |

材料预览会生成至 preview.html，可直接打开或通过项目本地预览访问。政策与支持 Markdown 已发布至既有公开 GitHub 项目，并以匿名读取验证；公开 URL 可从文案 JSON 直接复制。本目录尚未自动提交商店。

## 自动更新

仅生成文本与政策，使用 Node.js 内置模块，无需安装依赖：

```bash
npm run store:materials
```

GitHub 的 Build and test 也会执行这一步，并生成独立的商店文本附件。图像素材按截图来源记录核对，不把旧截图自动当作新版本安装验收。

图标、宣传图和截图另用 scripts/store-assets.mjs。需要 sharp、playwright、可运行的 Chromium，以及启动中的本地预览；在本次桌面环境中使用已有工作区工具，没有给扩展添加运行依赖。可通过 QIYE_STORE_NODE_MODULES 指向已安装的工具模块目录，QIYE_STORE_CHROME 指向隔离启动的浏览器程序，QIYE_STORE_PREVIEW 指向本地服务。

```bash
node scripts/store-assets.mjs --screenshots
```

使用同一工具模块目录执行 `node scripts/store-preview.mjs` 可更新离线 HTML 预览，执行 `node scripts/store-bundle.mjs` 可生成 `artifacts/qiye-store-materials-v1.5.0.zip` 与审核源码包。材料包包含配套 Chromium / Firefox ZIP、所有文案、图片、政策、审核说明及 SHA256SUMS。

截图在独立临时浏览器上下文中生成；中英文数据来自示例内容，不读取现有用户资料、书签或已登录页面。宣传图是现有品牌 SVG 的代码化排版，没有重绘工作台 UI 或伪造原生浏览器效果。

## 已由你确认的信息

以下信息已经由用户确认，无需再次填写：

1. 对外开发者署名沿用各商店账号现有显示名称。正文使用事实性称呼“栖页 Qiye 个人开发者”，没有猜测真实姓名；后台已有姓名不再作为待填写材料。
2. 代码与素材具有发布授权，采用 MIT 开源许可。根目录 LICENSE 和材料包使用同一许可证，构建包也随附许可证。

现有 Release 附件未被替换。本次生成的同版本商店准备包补入 MIT 许可证，与材料包内审核源码配套；请使用材料包的 SHA256SUMS 核对，不要沿用旧 Release 附件的校验值。

账号额外实名、付款、双重验证或平台验证码如有要求，由本人在对应后台完成，无需提供给生成脚本。截图、文案、权限理由、构建说明、隐私与支持正文不再要求你手写。

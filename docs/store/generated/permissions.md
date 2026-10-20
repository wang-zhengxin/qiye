# 权限与商店隐私字段 / Permissions and privacy fields

版本 1.5.2。从扩展清单与实现生成；提交时核对平台字段定义。

## 单一用途 / Single purpose

在一个本地优先的工作台整理浏览器标签、会话与书签。

Organize browser tabs, saved sessions and bookmarks in one local-first workspace.

## 权限理由 / Permission justifications

| 权限 | 中文理由 | English justification |
| --- | --- | --- |
| `tabs` | 读取当前浏览器资料中的标签标题、网址与状态，在工作台展示多个窗口，并提供定位、移动、保存、休眠与关闭操作。 | Read titles, URLs and status of tabs in the current browser profile to show multiple windows and support switching, moving, saving, sleeping and closing tabs. |
| `tabGroups` | 读取和管理当前打开的浏览器原生标签组，支持创建、加入、保存、解除分组与按组操作；不读取已保存但未打开的工具栏分组。 | Read and manage currently open native tab groups: create, join, save and ungroup them, and apply group operations. Saved but closed toolbar groups are not read. |
| `bookmarks` | 在工作台展示并管理浏览器原生书签与文件夹，支持新增、编辑、移动、删除，以及恢复通过工作台删除的项目。 | Display and manage native bookmarks and folders: create, edit, move, delete and restore items deleted through Qiye. |
| `storage` | 在用户设备保存会话、暂存、偏好、快照、回收站、同步状态与连接凭据。凭据与收藏数据分开，不进入导出和远端收藏正文。 | Save sessions, stash, preferences, snapshots, recycle-bin items, sync status and credentials on the device. Credentials are stored separately and excluded from collection exports and synced collection JSON. |
| `contextMenus` | 根据用户偏好提供工作台、保存标签、保存窗口、分组、休眠与快照等右键入口。 | Provide configurable context-menu shortcuts for opening the workspace, saving tabs or windows, grouping, sleeping and snapshots. |
| `alarms` | 仅在用户开启自动同步后，按其设置的间隔和时段调度远端同步。 | Schedule remote sync at the interval and time windows chosen by the user, only after automatic sync is enabled. |

## 可选站点权限 / Optional host access

`https://*/*`

用户可以配置自己的 HTTPS WebDAV 服务，因此清单预留 HTTPS 可选权限。实际在保存同步配置时，仅请求所选服务的 origin；GitHub Gist 仅请求 https://api.github.com/*。这些权限用于同步数据和认证，不用于注入脚本、读取网页正文、广告或跟踪。HTTP 地址在配置及发出请求时均被拒绝；HTTPS 不等于端到端加密。

Users may configure their own HTTPS WebDAV server, so optional host patterns allow user-selected HTTPS origins. Only the selected service origin is requested when sync is configured; Gist requests https://api.github.com/*. Access is used for sync and authentication, not content-script injection, page-content reading, advertising or tracking. HTTP endpoints are rejected at configuration and request time. HTTPS transport does not provide end-to-end encryption.

## 远程代码 / Remote code

不使用远程执行代码。脚本和样式随扩展打包；同步只解析经校验的 JSON 数据。

No remotely hosted executable code. Scripts and styles are packaged with the extension; sync parses validated JSON data only.

## 数据披露填写依据 / Data disclosure basis

- 浏览活动：标签标题与网址用于本地整理；开启同步后，相应已保存链接发送到用户选择的服务。
- 认证信息：用户主动填写的 WebDAV 凭据或 GitHub Token，用于连接所选服务。
- 书签：访问原生书签并缓存于本机；原生书签树不进入同步正文，主动复制进会话的链接按会话同步。
- 搜索词：仅在可选开始页提交搜索时导航到用户所选搜索引擎；没有自动搜索跟踪。
- 不读取完整浏览历史、网页正文或网页表单；不包含广告、分析 SDK 或第三方站点图标网络请求。
- 可声明无出售数据、无定向广告、无贷款或信用资格判断用途；不能填写“没有处理或传输任何数据”。

Firefox 当前生成清单声明 required: none，optional: browsingActivity, authenticationInfo, bookmarksInfo, technicalAndInteraction, searchTerms。这不是签名或审核通过证明。同步只请求浏览活动、认证信息、主动复制的书签链接，以及启用偏好同步时的设置数据授权；开始页搜索在提交查询时单独申请 searchTerms，拒绝或撤销时不发送。仍需 AMO 最终校验与签名。

依据：[Chrome 隐私字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)、[Firefox 数据传输同意](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)。

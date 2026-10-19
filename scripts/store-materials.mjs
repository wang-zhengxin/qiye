import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SETTING_FIELDS,SETTINGS_SECTIONS} from '../src/settings.js';
import {manifestFor} from './build.mjs';

const root=resolve(import.meta.dirname,'..');
export const STORES={chrome:'Google Chrome',edge:'Microsoft Edge',firefox:'Mozilla Firefox'};
export function listing(store,language,version,profile){
  const browser=STORES[store];
  if(!browser)throw new Error(`Unknown store: ${store}`);
  const english=language==='en';
  const title=english?'Qiye — Tabs, Sessions & Bookmarks':'栖页 Qiye · 标签与书签工作台';
  const summary=english?'Organize tabs across windows, save sessions, manage bookmarks, and put background tabs to sleep. Local-first and free.':'在一个工作台整理多窗口标签、原生分组与书签，保存会话、休眠后台标签，本地优先，免费使用。';
  const description=english?`Qiye is a free, local-first workspace for ${browser}. Bring open tabs, native tab groups, saved sessions, and browser bookmarks into one place, then organize them with drag and drop.

MANAGE YOUR CURRENT BROWSING
See tabs across windows in the current browser profile, switch to a page or window, reorder tabs, create native groups, and close tabs you no longer need. Put supported background tabs to sleep while keeping their tab-bar entries available. Active tabs are protected from sleeping.

SAVE A SESSION FOR LATER
Keep a named set of links and reopen it when you are ready. Star, lock, clone, sort, and deduplicate saved sessions. Closing an open tab does not delete a saved session. Saved sessions and the current tab list serve different purposes.

ORGANIZE BOOKMARKS
Work with the browser's real bookmarks and folders. Add, edit, and move items, including nested folders. Drag links to bookmark folders; dragging a saved session creates or reuses a named subfolder while retaining the source session. Built-in and managed folders are protected.

FIND AND RECOVER
Search tabs and saved links, set items aside in a stash, create local snapshots, import and export collections, and recover items deleted through Qiye from its recycle bin.

MAKE THE WORKSPACE YOURS
Drag pane separators to resize the workspace; sizes stay on this device. Give open tabs custom Qiye display names, rename saved tabs and native groups, and scroll long lists independently. Open-tab names do not modify website or browser tab-strip titles. Choose light, dark, or system appearance and use Chinese or English controls. ${SETTING_FIELDS.length} preferences across ${SETTINGS_SECTIONS.length} sections cover saving, opening, display, search, shortcuts, context menus, and an optional start page.

LOCAL BY DEFAULT, OPTIONAL SYNC
Core features work without a Qiye account or subscription. Collections and preferences stay in browser-local storage by default. You may connect your own WebDAV service or GitHub Secret Gist to sync saved sessions, stashed links, and selected preferences. Sync is off until configured. Network access is requested when you configure the service. Credentials are used to authenticate to your selected provider and are excluded from collection exports and synced preference data. Native bookmark-tree sync remains the browser's responsibility.

PLEASE NOTE
This listing is for desktop ${browser}. Native groups and sleeping depend on browser support. Saved but closed toolbar groups cannot be fully read; open a group first to manage it. Closed-tab history and a complete browsing history are not collected. Recently opened only records links opened through Qiye. A Secret Gist is unlisted, not end-to-end encrypted. Backups contain readable URLs and titles, so store them carefully. External sync services have their own terms and may charge for their service.

Version ${version}. Support: ${profile.supportEmail}`:`栖页 Qiye 是为 ${browser} 提供的免费、本地优先的标签与书签工作台。把打开的标签、浏览器原生分组、已保存会话和书签放在一个页面中，通过拖拽完成整理。

整理当前浏览现场
默认展示当前浏览器用户资料中的多个窗口，可切换到对应页面或窗口、调整标签顺序、创建原生分组、休眠后台标签或关闭不再需要的页面。休眠保留标签栏入口；正在使用的标签受到保护。

保存会话，随时继续
把一组网页保存为有名称的会话，之后批量重新打开。支持星标、锁定、克隆、去重与排序。打开的标签代表当前浏览现场，已保存会话用于持久保留网址；关闭原标签不会删除已保存会话。

直接管理浏览器书签
新增、编辑、移动真实书签与嵌套文件夹；将链接拖入文件夹即可收藏。把整组已保存会话拖入书签目录，会创建或复用同名子文件夹，原会话保留。浏览器内置或托管目录受到保护。

查找、暂存与恢复
搜索标签与收藏，把尚未整理的网址先放入暂存区。支持本地快照、收藏导入导出，以及恢复通过工作台删除的收藏内容。直接在浏览器其他界面删除的书签不进入栖页回收站。

按自己的习惯配置
拖动分栏边缘调整宽高，尺寸保存在本机；打开标签可设置栖页内显示名，已保存标签与原生分组可重命名，长列表支持独立滚动。打开标签的自定义名称不修改网页或浏览器标签栏标题。提供中文和英文主要操作界面、浅色、深色和跟随系统外观。${SETTINGS_SECTIONS.length} 个设置分区、${SETTING_FIELDS.length} 项偏好涵盖保存与打开行为、显示、搜索、快捷键、右键菜单和可选开始页。

默认本地使用，可选连接自己的同步服务
核心功能无需栖页账号或订阅，默认在浏览器本机保存收藏与偏好。可自行连接 WebDAV 或 GitHub Secret Gist，同步已保存会话、暂存和部分偏好；配置前不会自动同步。仅在配置同步时申请对应站点访问。凭据用于所选服务的认证，不进入收藏导出或远端偏好正文。原生书签树的跨设备同步由浏览器自身管理。

使用范围与注意事项
本版本面向桌面 ${browser}；原生分组和休眠以实际接口能力为准。当前不能完整读取已保存但未打开的工具栏分组，需先打开该组。不会读取完整浏览历史，“最近访问”仅记录通过栖页打开的链接。Secret Gist 为不公开列出的文件，并非端到端加密；导出文件含可读的网址与标题，请妥善保存。外部同步服务由用户自行选择，可能有其自身费用。

版本 ${version}。支持邮箱：${profile.supportEmail}`;
  const privacyPolicyUrl=profile.repository+`/blob/main/docs/store/generated/privacy.${store==='edge'?'edge.':''}${language}.md`;
  return {store,browser,language,version,title,summary,description,price:'free',category:store==='firefox'?'Tabs / Bookmarks':'Productivity',supportEmail:profile.supportEmail,supportUrl:profile.repository+'/blob/main/docs/store/generated/support.'+language+'.md',privacyPolicyUrl,publisherDisplayNameSource:profile.publisherDisplayNameSource,license:profile.license};
}

export function privacy(language,profile,version,store){
  const en=language==='en',browser=store?STORES[store]:null;
  return en?`# Qiye${browser?' for '+browser:''} Privacy Policy

Effective date: ${profile.policyDate} · Product version reviewed: ${version}

Operator: ${profile.operatorEn}. Contact: ${profile.supportEmail}.

## What Qiye does

Qiye is a free desktop browser extension for organizing tabs, native tab groups, saved sessions, and bookmarks. Core functionality requires no Qiye account. This policy describes Qiye's extension code; browser-store, browser-vendor, hosting-provider, and external website practices are governed by those providers.

## Information used locally

Qiye accesses tab titles, URLs, window and group identifiers, grouping information, and tab status to display and manage open pages. It accesses bookmark names, URLs, folder relationships, and identifiers to provide bookmark management. A local workspace cache may include bookmark information. Saved sessions, stashed links, favorites and locks, preferences and preference history, device-local pane sizes and URL-based custom tab names, snapshots, items in the recycle bin, sync status, and links opened through Qiye are stored in the browser profile. If you enable startup restoration, Qiye stores a local snapshot of eligible previously open pages. Qiye does not use the browser history API to obtain a complete browsing history and does not inject scripts to read website content, form fields, or keystrokes on websites.

## Optional external connections

Remote sync is disabled by default. If you choose and configure WebDAV or GitHub Gist, Qiye sends saved-session names, link titles and URLs, stashed links, associated identifiers and timestamps, and optionally portable preferences to the service you select. Native bookmark trees, recent-link records, recycle-bin records, local snapshots, pane sizes, and the custom open-tab name map are not part of the remote sync payload. A display name copied into a saved session is included as that saved link’s title. Links you explicitly copy or import into saved sessions can be included as saved-session links. Connection settings and credentials are excluded from synced preference data.

WebDAV credentials are sent to your configured server for authentication; a GitHub token is sent to GitHub's API for authentication. These credentials are not included in exported collections or remote collection JSON. A provider receives normal connection information such as your IP address and request metadata. GitHub connection tests can request your account information to validate authentication. Qiye does not send these collections to a developer-operated sync server.

If you choose the optional start page and submit a search, your query is sent by navigation to the search engine you select. Opening saved links takes you to those websites, which apply their own policies. The extension code contains no advertising, analytics SDK, tracking beacon, or third-party favicon request. The developer does not sell browsing data or use it for targeted advertising.

## Security and storage limitations

Use HTTPS for remote sync. Version ${version} also accepts HTTP WebDAV addresses; HTTP does not encrypt connection content or authentication information. Do not use it for public-network transfers. Secret Gists are unlisted, not private encrypted vaults: anyone who obtains their URL may be able to read them. Qiye does not implement end-to-end encryption.

Extension credentials are stored separately in browser-local extension storage. Qiye does not encrypt them with an additional application encryption key or store them in the operating system's keychain. Protect your browser profile and device and use narrowly scoped, revocable credentials. Collection exports are ordinary readable JSON files, not encrypted backups.

## Your controls and deletion

You can use the extension locally without configuring sync. Disable automatic sync, select local-only mode, revoke site access or applicable optional data-transmission permissions, or use **Remove saved credentials** in sync settings. Removing credentials also disables automatic sync; it does not delete remote files. You can revoke provider credentials from the provider's account settings.

Delete saved items and empty the recycle bin, remove snapshots, and clear Recently opened through the corresponding views. Resetting preferences alone does not erase collections or credentials. To remove the extension's complete local storage, remove the extension or clear its storage using browser tools. Native bookmarks belong to the browser and are not erased by uninstalling Qiye. Remote WebDAV/Gist copies and files you exported must be deleted separately at their storage locations. Qiye cannot retrieve device-only collections or delete copies held by a provider on your behalf.

## Retention, support, and changes

Local items remain until deleted, replaced, or removed with extension storage; some local histories and snapshots have implementation limits. Remote copies follow the chosen provider's retention and deletion behavior. If you email support, your email address and the information you send are used to respond; do not send credentials or sensitive browsing data. This product is operated by an individual developer. Future material changes will be reflected in an updated policy date and extension documentation.

Questions or data-handling requests: ${profile.supportEmail}.
`:`# 栖页 Qiye${browser?'（'+browser+' 版）':''}隐私政策

生效日期：${profile.policyDate} · 本次核对版本：${version}

运营者：${profile.operatorZh}。联系邮箱：${profile.supportEmail}。

## 产品用途

栖页是用于整理标签、原生分组、已保存会话和书签的免费桌面浏览器扩展，核心功能无需注册栖页账号。本政策说明扩展自身代码的数据处理方式；浏览器、商店、托管平台和外部网站各自的数据处理适用其自身政策。

## 在本机使用的信息

为展示和管理打开的网页，扩展访问标签标题、网址、窗口和分组标识、分组信息及标签状态；为管理书签，访问书签名称、网址、文件夹层级和标识，并可能在本地工作台缓存中保留书签信息。已保存会话、暂存、星标和锁定状态、偏好及其历史、仅本机的分栏尺寸和按网址保存的自定义标签名、快照、回收站、同步状态和通过栖页打开的链接记录保存在浏览器用户资料中。启用启动恢复时，会在本机保存符合条件的上次打开页面。扩展不使用浏览器历史接口读取完整浏览历史，也不向网页注入脚本以读取网页正文、表单字段或用户在网页上的按键。

## 用户选择的外部连接

默认关闭远端同步。只有选择并配置 WebDAV 或 GitHub Gist 后，才会将会话名称、链接标题与网址、暂存、相关标识与时间，以及可选的可迁移偏好发送到用户选择的服务。原生书签树、最近打开记录、回收站、本地快照、分栏尺寸和打开标签自定义名称表不属于同步正文；复制进会话的显示名作为已保存链接标题同步；用户主动复制或导入已保存会话的书签链接可作为会话链接参与同步。同步地址和凭据不进入远端偏好正文。

WebDAV 账号与密码会用于向所配置服务器认证，GitHub Token 会用于向 GitHub API 认证。这些凭据不进入收藏导出或远端收藏 JSON。服务商会接收到 IP 地址、请求元数据等正常连接信息；GitHub 连接测试可能读取账户信息以核验认证。扩展不把这些收藏发送到开发者运营的同步服务器。

如果选择可选开始页并提交搜索，查询词会通过页面导航发送到所选搜索引擎；打开链接时会访问相应网站，其处理方式适用该网站政策。扩展代码不含广告、统计 SDK、跟踪信标或第三方站点图标请求；开发者不出售浏览数据或将其用于定向广告。

## 传输与存储边界

远端同步请使用 HTTPS。${version} 版本也接受 HTTP WebDAV 地址，HTTP 不加密传输内容和认证信息，不应将其用于公网传输。Secret Gist 是不公开列出的文件，并非加密保险库；获得其链接的人可能读取内容。本产品未实现端到端加密。

扩展凭据单独保存在浏览器扩展本地存储，不使用额外的应用密钥加密，也不存入操作系统钥匙串。请保护浏览器用户资料和设备，并使用最小权限、可撤销的凭据。导出文件是包含可读网址与标题的普通 JSON，不是加密备份。

## 控制与删除

可以不配置同步，仅使用本地功能。可关闭自动同步、选择仅本地模式、撤销站点访问或相应的可选数据传输许可，或在同步设置点击“移除已保存凭据”。移除凭据同时关闭自动同步，但不会删除远端文件；也可到服务商账户设置撤销凭据。

可以删除收藏并清空回收站、移除快照、清空最近访问。仅重置偏好不会删除收藏或凭据。完整清除扩展本地数据可卸载扩展，或通过浏览器工具清除扩展存储。原生书签属于浏览器，卸载扩展不会将其删除。WebDAV / Gist 上的远端副本及导出文件需要在各自存储位置单独删除。开发者无法替用户取回仅保存在设备上的收藏，也不能代用户删除服务商持有的副本。

## 保存期限、支持与政策更新

本地内容保留到用户删除、覆盖或扩展存储被清除；部分历史和快照有数量上限。远端内容遵循所选服务的保留与删除机制。发送支持邮件时，邮件地址及主动提供的内容用于回复问题，请勿发送密码、Token 或敏感浏览记录。本产品由个人开发者运营，重要变更会通过政策日期和项目文档更新。

隐私问题或数据处理请求请联系：${profile.supportEmail}。
`;
}

const justifications={
  tabs:['读取当前浏览器资料中的标签标题、网址与状态，在工作台展示多个窗口，并提供定位、移动、保存、休眠与关闭操作。','Read titles, URLs and status of tabs in the current browser profile to show multiple windows and support switching, moving, saving, sleeping and closing tabs.'],
  tabGroups:['读取和管理当前打开的浏览器原生标签组，支持创建、加入、保存、解除分组与按组操作；不读取已保存但未打开的工具栏分组。','Read and manage currently open native tab groups: create, join, save and ungroup them, and apply group operations. Saved but closed toolbar groups are not read.'],
  bookmarks:['在工作台展示并管理浏览器原生书签与文件夹，支持新增、编辑、移动、删除，以及恢复通过工作台删除的项目。','Display and manage native bookmarks and folders: create, edit, move, delete and restore items deleted through Qiye.'],
  storage:['在用户设备保存会话、暂存、偏好、快照、回收站、同步状态与连接凭据。凭据与收藏数据分开，不进入导出和远端收藏正文。','Save sessions, stash, preferences, snapshots, recycle-bin items, sync status and credentials on the device. Credentials are stored separately and excluded from collection exports and synced collection JSON.'],
  contextMenus:['根据用户偏好提供工作台、保存标签、保存窗口、分组、休眠与快照等右键入口。','Provide configurable context-menu shortcuts for opening the workspace, saving tabs or windows, grouping, sleeping and snapshots.'],
  alarms:['仅在用户开启自动同步后，按其设置的间隔和时段调度远端同步。','Schedule remote sync at the interval and time windows chosen by the user, only after automatic sync is enabled.']
};

export async function generate(directory=root){
  const profile=JSON.parse(await readFile(resolve(directory,'docs/store/profile.json'),'utf8'));
  const manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));
  const project=JSON.parse(await readFile(resolve(directory,'package.json'),'utf8'));
  if(project.version!==manifest.version)throw new Error('Project and manifest versions differ.');
  const output=resolve(directory,'docs/store/generated');
  await mkdir(output,{recursive:true});
  const write=(name,text)=>writeFile(resolve(output,name),text);
  for(const language of ['zh-CN','en']){
    await write(`privacy.${language}.md`,privacy(language,profile,manifest.version));
    for(const store of Object.keys(STORES)){
      const data=listing(store,language,manifest.version,profile);
      if(data.title.length>50||data.summary.length>132||data.description.length<250||data.description.length>10000)throw new Error(`Invalid listing lengths: ${store}/${language}`);
      await write(`${store}.${language}.json`,JSON.stringify(data,null,2)+'\n');
      await write(`${store}.${language}.md`,`# ${data.title}\n\n${language==='en'?'Short description':'简短说明'}\n\n${data.summary}\n\n${language==='en'?'Full description':'详细说明'}\n\n${data.description}\n\n${language==='en'?'Category suggestion':'建议分类'}: ${data.category}\n\n${language==='en'?'Support':'支持'}: ${profile.supportEmail}\n`);
      if(store==='edge')await write(`privacy.edge.${language}.md`,privacy(language,profile,manifest.version,store));
    }
  }
  const rows=manifest.permissions.map(permission=>{
    if(!justifications[permission])throw new Error(`Permission needs justification: ${permission}`);
    return `| \`${permission}\` | ${justifications[permission][0]} | ${justifications[permission][1]} |`;
  });
  await write('permissions.md',`# 权限与商店隐私字段 / Permissions and privacy fields\n\n版本 ${manifest.version}。从扩展清单与实现生成；提交时核对平台字段定义。\n\n## 单一用途 / Single purpose\n\n在一个本地优先的工作台整理浏览器标签、会话与书签。\n\nOrganize browser tabs, saved sessions and bookmarks in one local-first workspace.\n\n## 权限理由 / Permission justifications\n\n| 权限 | 中文理由 | English justification |\n| --- | --- | --- |\n${rows.join('\n')}\n\n## 可选站点权限 / Optional host access\n\n${manifest.optional_host_permissions.map(value=>'\`'+value+'\`').join(', ')}\n\n用户可以配置任意 WebDAV 服务，因此清单预留 HTTP(S) 可选权限。实际在保存同步配置时，仅请求所选服务的 origin；GitHub Gist 仅请求 https://api.github.com/*。这些权限用于同步数据和认证，不用于注入脚本、读取网页正文、广告或跟踪。当前 HTTP 支持需要在商店正式发布前完成安全处理；不要把它描述成全程加密。\n\nUsers may configure their own WebDAV server, so optional host patterns allow user-selected HTTP(S) origins. Only the selected service origin is requested when sync is configured; Gist requests https://api.github.com/*. Access is used for sync and authentication, not content-script injection, page-content reading, advertising or tracking. Review HTTP support before store publication; do not claim all connections are encrypted.\n\n## 远程代码 / Remote code\n\n不使用远程执行代码。脚本和样式随扩展打包；同步只解析经校验的 JSON 数据。\n\nNo remotely hosted executable code. Scripts and styles are packaged with the extension; sync parses validated JSON data only.\n\n## 数据披露填写依据 / Data disclosure basis\n\n- 浏览活动：标签标题与网址用于本地整理；开启同步后，相应已保存链接发送到用户选择的服务。\n- 认证信息：用户主动填写的 WebDAV 凭据或 GitHub Token，用于连接所选服务。\n- 书签：访问原生书签并缓存于本机；原生书签树不进入同步正文，主动复制进会话的链接按会话同步。\n- 搜索词：仅在可选开始页提交搜索时导航到用户所选搜索引擎；没有自动搜索跟踪。\n- 不读取完整浏览历史、网页正文或网页表单；不包含广告、分析 SDK 或第三方站点图标网络请求。\n- 可声明无出售数据、无定向广告、无贷款或信用资格判断用途；不能填写“没有处理或传输任何数据”。\n\nFirefox 当前生成清单声明 required: none，optional: ${manifestFor(manifest,'firefox').browser_specific_settings.gecko.data_collection_permissions.optional.join(', ')}。这不是签名或审核通过证明。内置搜索及同步偏好对应的数据分类需在 AMO 校验时一并核对；待核对项属于工程验收，不需要用户编写声明。\n\n依据：[Chrome 隐私字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)、[Firefox 数据传输同意](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)。\n`);
  await write('support.zh-CN.md',`# 栖页 Qiye 使用与支持\n\n免费桌面标签与书签工作台 · 当前版本 ${manifest.version}\n\n支持邮箱：${profile.supportEmail}\n\n问题反馈：${profile.repository}/issues\n\n## 开始使用\n\n安装对应浏览器扩展后点击栖页图标，或按 Alt + Shift + T 打开工作台。“当前标签页”默认显示同一用户资料下的所有窗口；“已保存会话”保留网址以供稍后恢复。开发者 ZIP 需要先解压再加载。Firefox 未签名 ZIP 仅供临时测试，普通安装请使用已签名版本。\n\n## 整理与恢复\n\n选择标签可保存会话、暂存、休眠或关闭。将链接拖入书签文件夹可收藏，整组会话拖入会创建或复用同名子目录。会话可锁定以防误改，通过工作台删除的收藏可从回收站恢复。浏览器自身删除的书签不会进入栖页回收站。\n\n## 备份与迁移\n\n顶部“导出”生成收藏 JSON，导入会保留已有收藏并追加内容；偏好可在设置中单独导入导出。导出文件不含凭据，但含可读网址与标题。安装商店版本前先备份，开发者模式与商店版本可能使用不同扩展 ID，不应假定数据自动迁移。\n\n## 同步与数据清除\n\n默认关闭同步。需要时配置自己的 HTTPS WebDAV 或 GitHub Secret Gist，再保存授权、测试连接并手动同步。关闭自动同步、移除已保存凭据和撤销服务 Token 可停止连接；远端文件需自行删除。可在回收站、快照和最近访问中清除对应记录；仅重置偏好不会清除全部数据，完整清除请卸载或清除扩展存储。\n\n## 反馈问题\n\n请提供浏览器与系统版本、栖页版本、复现步骤和已遮挡敏感内容的截图。不要发送密码、Token 或完整私人书签备份。开发者尚未完成所有目标浏览器的真实安装验证，功能边界以浏览器支持文档为准。\n\n[下载与更新](${profile.repository}/releases/latest) · [安装说明](${profile.repository}/blob/main/INSTALL.md) · [浏览器支持](${profile.repository}/blob/main/BROWSERS.md)\n`);
  await write('support.en.md',`# Qiye Support\n\nFree desktop tab and bookmark workspace · Version ${manifest.version}\n\nContact: ${profile.supportEmail}\n\nReport an issue: ${profile.repository}/issues\n\nClick the extension icon or use Alt + Shift + T to open the workspace. Open tabs show the current browser profile's windows; saved sessions retain links for later. Extract developer ZIPs before loading them. Unsigned Firefox ZIPs are temporary test builds; normal installation requires a signed version.\n\nSelect tabs to save a session, stash, sleep or close them. Drag links to bookmark folders; dragging a saved session creates or reuses a named child folder. Items deleted through Qiye can be restored from its recycle bin; bookmarks deleted elsewhere do not appear there.\n\nExport collections before switching from an unpacked build to a store build: extension IDs and storage may differ. Exports contain readable URLs and titles but no credentials. Import adds to existing saved content; preferences have separate import/export tools.\n\nSync is off by default. To use it, configure your own HTTPS WebDAV or Secret Gist, grant access, test the connection and perform a manual sync. Disable automatic sync, remove saved credentials or revoke provider tokens to stop connections. Delete remote files separately. Resetting preferences does not erase all data; uninstall or clear extension storage to remove complete local extension data. Native bookmarks remain owned by the browser.\n\nFor support, include browser, OS and Qiye versions, steps to reproduce, and a redacted screenshot. Do not send passwords, tokens or full private bookmark backups. See the browser support guide for capabilities and validation limits.\n\n[Downloads](${profile.repository}/releases/latest) · [Installation](${profile.repository}/blob/main/INSTALL.md) · [Browser support](${profile.repository}/blob/main/BROWSERS.md)\n`);
  await write('build-info.json',JSON.stringify({version:manifest.version,policyDate:profile.policyDate,settings:SETTING_FIELDS.length,sections:SETTINGS_SECTIONS.length,permissions:manifest.permissions,optionalHostPermissions:manifest.optional_host_permissions,license:profile.license,rightsConfirmed:profile.rightsConfirmed,privacyPolicyUrl:profile.privacyPolicyUrl,storeUrls:profile.storeUrls},null,2)+'\n');
  console.log(`Generated store text for ${manifest.version}: 3 stores × 2 languages, privacy policies, permissions and support documents.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await generate();

import {api,syncPermissionRequest} from './platform.js';
import {createDemoState,createEmptyState,uid} from './data.js';
import {safeUrl,normalizeTab,makeGroup,dedupeTabs,moveSavedTab,recycle,restoreItem,parseImport} from './model.js';
import {extension,readState,writeState,readCredentials,writeCredentials,writePreferences,BrowserAdapter} from './browser.js';
import {esc,icon,ib,btn,dateLabel,domain,siteIcon,toast,emptyState} from './ui.js';
import {DEFAULT_SETTINGS,SETTINGS_SECTIONS,normalizeSettings,validateSettings,exportPreferences,importPreferences,PREFS_KEY,STORAGE_KEY,inSyncWindow} from './settings.js';
import {renderSettings} from './settings-view.js';
import {collectableTabs,appendTabs,prepareTab,groupName,insertGroup,insertItems,saveCollection,removeEmptyGroups,formatLinks,matchesSearch,openInBackground} from './policies.js';
import {runSync,SYNC_STATUS_KEY} from './sync.js';
import {applyTranslations} from './i18n.js';
import {folderPath,folderIds,retireCategories} from './bookmarks.js';
import {windowSections} from './windows.js';
import {attachWorkspaceLayout,resizeHandle} from './layout.js';
import {readTabTitles,writeTabTitles,updateTabTitle} from './tab-titles.js';

const state=await readState(extension?createEmptyState():createDemoState()).catch(error=>{document.querySelector('#app').textContent=error.message;throw error;});
const browser=new BrowserAdapter(state);
const route=new URLSearchParams(location.search).get('view');
let tabs=[],nativeGroups=[],browserWindows=[],bookmarkFolders=[],view=['groups','tabs','bookmarks','stash','recent','trash','settings'].includes(route)?route:state.settings.startPage,category='all',query='',starOnly=false,lockOnly=false,sort=state.settings.defaultSort,layout=state.settings.defaultLayout,batch=false,bookmarkFolder=new URLSearchParams(location.search).get('folder')||'all',allWindows=state.settings.tabWindowScope==='all';
const expanded=new Set(state.settings.expandAll?state.groups.map(g=>g.id):extension?[]:['g1']);
const selectedTabs=new Set(),selectedGroups=new Set(),selectedSaved=new Set();
let dragData=null,mobileOpen=false;
let settingsDraft=structuredClone(state.settings),settingsSection=SETTINGS_SECTIONS.some(s=>s.id===new URLSearchParams(location.search).get('section'))?new URLSearchParams(location.search).get('section'):'general',settingsFilter='',secretDraft={},credentialSaved=await credentialsExist(),syncStatus={},syncBusy=false,searchTimer,autoSyncTimer;
let refreshRevision=0;
let previousCounts=new Map(state.groups.map(g=>[g.id,g.tabs.length]));
const app=document.querySelector('#app'),overlay=document.querySelector('#overlay-root');
const workspaceLayout=await attachWorkspaceLayout(app,error=>toast(error.message||'无法保存分栏尺寸',true));
const allSaved=()=>state.groups.flatMap(g=>g.tabs);
const collapsedFolders=new Set(state.bookmarkCollapsed||[]);
const writableFolders=()=>bookmarkFolders.filter(f=>!f.readOnly);
const preferredFolder=()=>writableFolders().find(f=>f.id===bookmarkFolder)?.id||writableFolders()[0]?.id;
const bookmarkMatches=b=>matchesSearch(b,query,state.settings,folderPath(bookmarkFolders,b.parentId));
const visibleTabs=()=>tabs.filter(t=>!query||matches(t)||nativeGroups.some(g=>g.id===t.groupId&&matches({title:g.title})));
const liveWindows=()=>windowSections(tabs,nativeGroups,browserWindows,browser.currentWindowId);
const matches=item=>matchesSearch(item,query,state.settings,'');
const persist=async()=>{retireCategories(state);removeEmptyGroups(state,previousCounts);await writeState(state);previousCounts=new Map(state.groups.map(g=>[g.id,g.tabs.length]));};
async function refresh(renderPage=true){const revision=++refreshRevision;const [live,bookmarks]=await Promise.all([browser.listTabs(allWindows),browser.listBookmarks()]);if(revision!==refreshRevision)return;tabs=live.tabs;nativeGroups=live.groups;browserWindows=live.windows||[];state.bookmarks=bookmarks.bookmarks;bookmarkFolders=bookmarks.folders;if(bookmarkFolder!=='all'&&!bookmarkFolders.some(f=>f.id===bookmarkFolder)){bookmarkFolder='all';history.replaceState(null,'',`?view=${view}`);}for(const id of selectedTabs)if(!tabs.some(t=>String(t.id)===id))selectedTabs.delete(id);if(renderPage)render();}
function navItem(name,label,route,count,active,extra=''){return `<button class="nav-item ${active?'active':''}" data-action="navigate" data-id="${route}" ${extra}>${icon(name)}<span>${label}</span>${count!==undefined?`<span class="count">${count}</span>`:''}</button>`;}
function renderBookmarkTree(){
  const counts=new Map(bookmarkFolders.map(f=>[f.id,0]));
  for(const b of state.bookmarks){let id=b.parentId;const seen=new Set();while(counts.has(id)&&!seen.has(id)){seen.add(id);counts.set(id,counts.get(id)+1);id=bookmarkFolders.find(f=>f.id===id)?.parentId;}}
  const rows=(parentId,depth=0,seen=new Set())=>bookmarkFolders.filter(f=>f.parentId===parentId).map(f=>{
    if(seen.has(f.id))return '';const children=bookmarkFolders.some(c=>c.parentId===f.id),open=!collapsedFolders.has(f.id),active=view==='bookmarks'&&bookmarkFolder===f.id;
    return `<div class="bookmark-tree-branch"><div class="bookmark-tree-row ${active?'active':''}" style="--depth:${depth}" draggable="${!f.protected&&!f.readOnly}" data-drag="bookmark-folder" data-id="${esc(f.id)}" data-drop="bookmark-folder" data-target="${esc(f.id)}" data-folder-menu="${esc(f.id)}"><button class="folder-toggle ${children?'':'no-children'}" data-action="toggle-bookmark-folder" data-id="${esc(f.id)}" aria-label="${open?'收起文件夹':'展开文件夹'}" aria-expanded="${open}">${open?'⌄':'›'}</button><button class="bookmark-folder-name" data-action="bookmark-folder" data-id="${esc(f.id)}" title="${esc(folderPath(bookmarkFolders,f.id))}" ${active?'aria-current="page"':''}>${icon(active?'folderOpen':'folder')}<span class="folder-title">${esc(f.title)}</span>${f.readOnly?icon('lock'):''}<span class="count">${counts.get(f.id)}</span></button>${ib('more','文件夹操作','bookmark-folder-menu',f.id,'folder-more')}</div>${children&&open?rows(f.id,depth+1,new Set([...seen,f.id])):''}</div>`;
  }).join('');
  const roots=bookmarkFolders.filter(f=>!bookmarkFolders.some(p=>p.id===f.parentId));
  return roots.map(f=>rows(f.parentId)).filter((value,index,array)=>array.indexOf(value)===index).join('');
}
function renderSidebar(){return `<aside class="sidebar ${mobileOpen?'open':''}" aria-label="主导航"><div class="sidebar-scroll" data-scroll-key="navigation">${ib('close','收起导航','mobile-close','','mobile-close')}<div class="brand"><div class="brand-image"><img src="assets/brand/qiye.svg" alt="栖页 Qiye"></div><div><div class="brand-name">栖页 Qiye</div><div class="brand-tagline">书签与标签管理</div></div></div><nav class="navigation">
 ${navItem('folder','已保存会话','groups',allSaved().length,view==='groups')}
 ${navItem('tabs','当前标签页','tabs',tabs.length,view==='tabs')}
 ${navItem('archive','暂存标签','stash',state.stash.length,view==='stash','data-drop="stash"')}
 ${navItem('clock','最近访问','recent',undefined,view==='recent')}
 </nav><div class="rule"></div><nav class="navigation bookmarks-navigation" aria-label="浏览器书签"><div class="nav-label"><span>浏览器书签</span>${ib('plus','新建书签文件夹','new-bookmark-folder')}</div>
 <button class="nav-item ${view==='bookmarks'&&bookmarkFolder==='all'?'active':''}" data-action="bookmark-folder" data-id="all">${icon('bookmark')}<span>全部书签</span><span class="count">${state.bookmarks.length}</span></button><div class="bookmark-tree" data-scroll-key="bookmark-tree">${renderBookmarkTree()}</div>${browser.capabilities.bookmarks?'':'<p class="capability-note">此浏览器暂不支持原生书签管理，可使用已保存会话。</p>'}
 <button class="nav-item new-folder" data-action="new-bookmark-folder">${icon('newCategory')}新建文件夹</button></nav><div class="sidebar-space"></div><div class="sidebar-hint">${icon('pointer')}<strong>拖一拖，整理更轻松</strong><p>${browser.capabilities.bookmarks?'拖入书签文件夹保存网址；整组拖入会创建同名子文件夹。':'拖入已保存会话或暂存区，留下稍后要用的网址。'}</p></div><nav class="navigation aux-nav">${navItem('trash','回收站','trash',state.trash.length||undefined,view==='trash')}${navItem('settings','设置与帮助','settings',undefined,view==='settings')}</nav><div class="local-status">${icon('drive')}${extension?browser.capabilities.bookmarks?'已连接浏览器书签':'浏览器已连接':'演示数据 · 本机保存'}</div></div>${resizeHandle('sidebarWidth','调整导航栏宽度')}${resizeHandle('sidebarHeight','调整导航栏高度')}</aside>`;}

function renderTopbar(){return `<header class="topbar">${ib('menu','展开导航','mobile-open','','mobile-menu')}<div class="page-title"><h1>${({groups:'已保存会话',tabs:'当前标签页',stash:'暂存标签',bookmarks:'浏览器书签',recent:'最近访问',trash:'回收站',settings:'设置中心'})[view]}</h1><p>${state.groups.length} 个标签组 · ${state.bookmarks.length} 个书签</p></div><label class="search">${icon('search')}<input id="global-search" aria-label="搜索标签、书签或分组" placeholder="搜索标签、书签或分组" value="${esc(view==='settings'?settingsFilter:query)}" autocomplete="off"><kbd>⌘ K</kbd></label><div class="header-tools">${[['list','列表','navigate','groups'],['settingsTool','设置','settings',''],['camera','快照','snapshots',''],['download','导入','import',''],['upload','导出','export',''],['refresh','同步','sync','']].map(([i,t,a,id])=>`<button class="button" data-action="${a}" data-id="${id}" title="${t}">${icon(i)}<span class="tool-label">${t}</span></button>`).join('')}${ib('undo','恢复默认分栏','reset-layout')}${ib('trash','打开回收站','navigate','trash')}</div></header>`;}
function filteredGroups(){let groups=state.groups.filter(g=>(!starOnly||g.starred)&&(!lockOnly||g.locked)&&(!query||matches(g)||g.tabs.some(matches)));if(sort==='name'||sort==='name-desc')groups=[...groups].sort((a,b)=>(sort==='name-desc'?-1:1)*a.name.localeCompare(b.name,'zh-CN'));if(sort==='newest')groups=[...groups].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));return groups;}
function savedRow(tab,source,showSelect=false){return `<div class="saved-tab" draggable="true" data-drag="saved" data-id="${esc(tab.id)}" data-source="${esc(source)}" ${source!=='recent'?`data-drop="saved-tab" data-target="${esc(source)}"`:''}><span class="drag-grip" aria-hidden="true">⠿</span>${showSelect?`<input type="checkbox" aria-label="选择 ${esc(tab.title)}" data-select-saved="${esc(tab.id)}" ${selectedSaved.has(tab.id)?'checked':''}>`:''}${siteIcon(tab)}<button class="saved-tab-info" data-action="open-saved" data-id="${esc(tab.id)}" data-source="${esc(source)}" title="${esc(tab.url)}"><span class="saved-title">${esc(tab.title)}</span><span class="tab-url">${esc(domain(tab.url))}</span></button><div class="row-actions">${ib('edit','重命名标签','rename-saved',tab.id)}${ib('bookmarkStatus','添加到浏览器书签','bookmark-saved',tab.id)}${ib('more','标签页操作','saved-menu',tab.id)}</div></div>`;}
function groupCard(g){const isOpen=expanded.has(g.id);return `<article class="group-card" draggable="${!g.locked}" data-drag="group" data-id="${esc(g.id)}" data-drop="group" data-target="${esc(g.id)}"><div class="group-top">${batch?`<input type="checkbox" aria-label="选择标签组 ${esc(g.name)}" data-select-group="${esc(g.id)}" ${selectedGroups.has(g.id)?'checked':''}>`:''}<button class="folder-icon" data-action="expand" data-id="${esc(g.id)}" aria-label="${isOpen?'收起':'展开'} ${esc(g.name)}" aria-expanded="${isOpen}">${icon('groupFolder')}</button><button class="group-info" data-action="expand" data-id="${esc(g.id)}" aria-expanded="${isOpen}"><h3>${esc(g.name)}</h3><span class="group-meta"><span>${g.tabs.length} 个标签页</span><i class="dot"></i><span>${dateLabel(g.createdAt)}</span>${g.locked?icon('lock'):''}</span></button><div class="group-actions">${renderGroupActions(g)}</div></div>${isOpen?`<div class="group-content">${g.tabs.filter(t=>!query||matches(g)||matches(t)).map(t=>savedRow(t,g.id,batch)).join('')||'<p class="group-empty">还没有标签页，拖一个进来试试</p>'}<div class="group-footer"><div class="group-footer-left"><button class="text-button accent" data-action="add-tab" data-id="${esc(g.id)}">${icon('dropPlus')}添加标签</button><button class="text-button" data-action="dedupe-group" data-id="${esc(g.id)}">去重</button></div><button class="text-button" data-action="group-menu" data-id="${esc(g.id)}">${icon('more')}更多操作</button></div></div>`:''}</article>`;}
function renderGroups(){const groups=filteredGroups();return `<div class="section-heading"><div><div class="section-title"><h2>已保存会话</h2><span class="badge">${groups.length}</span></div><p class="section-subtitle">保存的浏览会话，关闭标签后仍可恢复</p></div>${btn('newGroup','新建标签组','new-group','primary')}</div><div class="view-toolbar"><div class="filter-tools"><span class="group-count">${groups.length} 个标签组</span><i class="divider"></i><button class="chip ${starOnly?'active':''}" data-action="filter-star" aria-pressed="${starOnly}">${icon('starFilter')}已星标</button><button class="chip ${lockOnly?'active':''}" data-action="filter-lock" aria-pressed="${lockOnly}">${icon('lock')}已锁定</button></div><div class="view-tools"><label class="text-button">${icon('sort')}<select class="select-plain" id="sort-select" aria-label="标签组排序"><option value="default" ${sort==='default'?'selected':''}>默认排序</option><option value="newest" ${sort==='newest'?'selected':''}>最近创建</option><option value="name" ${sort==='name'?'selected':''}>名称排序</option><option value="name-desc" ${sort==='name-desc'?'selected':''}>名称降序</option></select></label><button class="text-button" data-action="batch">${batch?'完成管理':'批量管理'}</button><div class="layout-toggle">${ib('grid','卡片视图','layout','grid',layout==='grid'?'active':'')}${ib('listView','列表视图','layout','list',layout==='list'?'active':'')}</div></div></div>${batch?renderBatch():''}<div class="groups ${layout==='grid'?'grid':''}">${groups.map(groupCard).join('')||emptyState(query?'没有找到相关标签':'给想法，留一个位置',query?'换个关键词，或试试搜索网址':'新建标签组，或者把右侧的标签页拖到这里',query?'clear-search':'new-group',query?'清除搜索':'新建标签组')}</div><div class="drop-guide" data-drop="new-group"><div class="drop-icon">${icon('dropPointer')}</div><div class="copy"><strong>从浏览，到收藏，只需拖一下</strong><p>将右侧已打开的标签页拖到这里，快速创建标签组。稍后再整理？先放进暂存区。</p></div>${icon('enter')}</div><footer class="collection-status"><span>${icon('bookmarkStatus')}共 ${allSaved().length} 个已保存标签 · ${state.groups.length} 个标签组</span><span>支持拖拽排序与跨组移动</span></footer>`;}
function renderBatch(){return `<div class="batch-toolbar"><label class="check-label"><input type="checkbox" data-select-all-groups ${filteredGroups().length&&filteredGroups().every(g=>selectedGroups.has(g.id))?'checked':''}>全选</label><strong>已选择 ${selectedGroups.size} 个组 / ${selectedSaved.size} 个标签</strong><button class="text-button" data-action="batch-move">${selectedGroups.size?'存入书签':'移动标签'}</button><button class="text-button" data-action="batch-sleep">${icon('moon')}休眠</button><button class="text-button" data-action="batch-close">关闭</button><button class="text-button" data-action="batch-delete">${icon('trash')}删除</button></div>`;}
function renderGroupActions(g){
  const actions={open:['play','打开整个标签组','open-group'],sleep:['moon','休眠已打开标签','sleep-group'],close:['close','关闭已打开标签','close-group'],'new-above':['plus','上方新建标签组','new-above'],'new-below':['plus','下方新建标签组','new-below'],lock:['lock',g.locked?'解锁标签组':'锁定标签组','lock-group'],star:['star',g.starred?'取消星标':'添加星标','star-group'],move:['bookmark','存入浏览器书签','move-group'],clone:['copy','克隆标签组','clone-group'],copy:['copy','复制全部链接','copy-group'],dedupe:['check','标签去重','dedupe-group'],'sort-asc':['sort','标签名称升序','sort-tabs-asc'],'sort-desc':['sort','标签名称降序','sort-tabs-desc'],delete:['trash','删除标签组','delete-group']};
  return state.settings.groupActions.filter(key=>actions[key]).map(key=>{const [i,title,action]=actions[key];return ib(i,title,action,g.id,key==='star'&&g.starred?'starred':'quick-group');}).join('')+ib('more','标签组操作','group-menu',g.id,'quick-more');
}
function liveRow(tab,main=false){return `<div class="live-tab ${selectedTabs.has(String(tab.id))?'selected':''} ${tab.discarded?'sleeping':''} ${tab.customTitle?'custom-title':''}" draggable="true" data-drag="live" data-id="${tab.id}" data-drop="live-tab" data-target="${tab.id}"><input type="checkbox" aria-label="选择 ${esc(tab.title)}" data-select-tab="${tab.id}" ${selectedTabs.has(String(tab.id))?'checked':''}>${siteIcon(tab)}<button class="live-tab-title" data-action="activate-tab" data-id="${tab.id}" title="${esc(tab.title)}&#10;${esc(tab.url)}">${esc(tab.title)}</button>${tab.discarded?'<span class="inline-label">休眠</span>':tab.active&&main?'<span class="inline-label">使用中</span>':''}<div class="live-tab-actions">${ib('edit','重命名标签','rename-live-tab',tab.id,'rename-live')}${ib(tab.discarded?'play':'moon',tab.discarded?'唤醒标签页':'休眠标签页',tab.discarded?'wake-tab':'sleep-tab',tab.id,'hover-action')}${ib('saveTab','暂存标签页','stash-tab',tab.id)}${ib('close','关闭标签页','close-tab',tab.id,'hover-action')}</div></div>`;}
const groupColors={grey:'#7b8087',blue:'#4285f4',red:'#d85850',yellow:'#b78a22',green:'#368d60',pink:'#c85b91',purple:'#9166cc',cyan:'#258e9e',orange:'#c77750'};
function nativeLabel(group){return `<div class="native-group-label" style="--group-color:${groupColors[group.color]||groupColors.orange}" data-drop="native-group" data-target="${group.id}"><i class="native-dot"></i><span class="native-group-title">${esc(group.title||'未命名标签组')}</span><span>${tabs.filter(t=>t.groupId===group.id&&t.windowId===group.windowId).length}</span>${ib('more','浏览器标签组操作','native-menu',group.id)}</div>`;}
function scopeSelector(id){return `<label class="window-select">${icon('window')}<select id="${id}" data-window-scope aria-label="窗口范围"><option value="all" ${allWindows?'selected':''}>所有窗口</option><option value="current" ${!allWindows?'selected':''}>当前窗口</option></select></label>`;}
function liveList(main=false,visible=visibleTabs()){
  const ids=new Set(visible.map(t=>t.id)),sections=liveWindows();
  const list=sections.map(window=>{
    const shown=window.tabs.filter(t=>ids.has(t.id));if(!shown.length)return '';
    const body=window.entries.map(entry=>entry.type==='tab'?(ids.has(entry.tab.id)?liveRow(entry.tab,main):''):(entry.tabs.some(t=>ids.has(t.id))?nativeLabel(entry.group)+entry.tabs.filter(t=>ids.has(t.id)).map(t=>liveRow(t,main)).join(''):'')).join('');
    const checked=shown.every(t=>selectedTabs.has(String(t.id)));
    return `<section class="live-window" aria-label="窗口 ${window.number}"><header class="live-window-heading"><label class="window-check"><input type="checkbox" data-select-window="${window.id}" aria-label="选择窗口 ${window.number} 的标签" ${checked?'checked':''}>${icon('window')}<strong>窗口 ${window.number}</strong></label><span class="window-origin">${window.current?'工作台所在窗口':window.focused?'正在使用':''}</span>${window.incognito?'<span class="window-origin">无痕</span>':''}<span class="window-tab-count">${shown.length}${shown.length!==window.tabs.length?' / '+window.tabs.length:''} 个标签</span>${ib('external','切换到此窗口','focus-window',window.id)}</header><div class="live-window-tabs">${body}</div></section>`;
  }).join('');
  return list||'<p class="no-tabs">没有符合条件的标签页</p>';
}

function renderBrowserPanel(){const visible=visibleTabs();return `<div class="browser-pane">${resizeHandle('browserWidth','调整标签栏宽度')}<aside class="browser-panel" aria-label="浏览器标签管理" data-scroll-key="browser-column"><div class="browser-heading"><h3>浏览器标签</h3><div class="window-source">${extension?icon('monitor'):'<span class="mode-tag" title="安装扩展后，管理真实浏览器标签">演示模式</span>'}${extension?'当前浏览器':''}</div></div><section class="panel stash-panel" data-drop="stash"><div class="panel-heading"><div class="panel-heading-title">${icon('stash')}<h3>暂存</h3><span class="count">${state.stash.length}</span></div>${ib('stashMore','暂存区操作','stash-menu')}</div><div class="stash-body" data-scroll-key="stash">${state.stash.length?`<div class="mini-stash">${state.stash.map(t=>savedRow(t,'stash')).join('')}</div>`:`<div class="stash-empty"><div class="stash-image"><img src="assets/figma/2c3af.svg" alt="暂存收纳盒"></div><strong>留待稍后，暂存于此</strong><p>将标签页拖入这里</p></div>`}</div><button class="drop-target" data-action="stash-selected">${icon('dropPlus')}拖放标签页到此处</button>${resizeHandle('stashHeight','调整暂存区高度')}</section><section class="panel live-panel"><div class="panel-heading"><div class="panel-heading-title">${icon('tabs')}<h3>打开的标签页</h3><span class="count">${tabs.length}</span></div>${ib('refresh','刷新标签页列表','refresh-browser')}</div>${scopeSelector('window-select')}<div class="selection-count">${liveWindows().length} 个窗口 · ${selectedTabs.size} / ${visible.length} 已选择${tabs.some(t=>t.discarded)?` · ${tabs.filter(t=>t.discarded).length} 个休眠中`:''}</div><div class="live-tabs" data-scroll-key="live-tabs">${liveList()}</div><div class="panel-bottom"><label class="check-label"><input type="checkbox" data-select-all-tabs ${visible.length&&visible.every(t=>selectedTabs.has(String(t.id)))?'checked':''}>全选</label><div class="panel-bulk"><button class="text-button" data-action="sleep-selected" title="休眠已选标签；未选择时休眠所有后台标签">${icon('moon')}休眠</button><button class="text-button" data-action="stash-selected">${icon('saveTab')}${selectedTabs.size?'暂存所选':'全部暂存'}</button></div></div>${resizeHandle('tabsHeight','调整标签列表高度')}</section><p class="sleep-tip">${icon('moon')}${browser.capabilities.sleep?'休眠释放内存，点击标签即可重新唤醒。':'可暂存或保存会话，再关闭暂时不用的标签。'}</p></aside></div>`;}
function renderTabs(){const visible=visibleTabs();return `<div class="section-heading"><div><div class="section-title"><h2>打开的标签页</h2><span class="badge">${tabs.length}</span></div><p class="section-subtitle">${liveWindows().length} 个窗口 · ${tabs.filter(t=>t.discarded).length} 个标签休眠中</p></div><div class="view-tools">${ib('refresh','刷新标签页列表','refresh-browser')}${btn('plus','新建分组','new-native-group','primary')}</div></div><div class="view-toolbar tabs-toolbar"><div class="tabs-scope">${scopeSelector('tabs-window-select')}<label class="check-label"><input type="checkbox" data-select-all-tabs ${visible.length&&visible.every(t=>selectedTabs.has(String(t.id)))?'checked':''}>全选</label><span class="selection-count">${selectedTabs.size} 个已选择</span></div><div class="view-tools"><button class="text-button" data-action="save-selected-group">${icon('folder')}保存会话</button><button class="text-button" data-action="stash-selected">${icon('saveTab')}${selectedTabs.size?'暂存所选':'全部暂存'}</button><button class="text-button" data-action="sleep-selected">${icon('moon')}休眠</button><button class="text-button" data-action="close-selected">${icon('close')}关闭</button></div></div><div class="view-tabs-list multi-window-list">${liveList(true)}</div><div class="help-box">${browser.capabilities.nativeGroups&&browser.capabilities.sleep?'':'<p>此浏览器的部分功能暂不可用，可保存会话后关闭标签，稍后再恢复。</p>'}<p>分组用于整理当前打开的标签，每个标签只显示一次；保存会话后，可在“已保存会话”中恢复。</p><p>${extension?'展示同一浏览器资料下的已打开窗口。窗口和标签变化会实时更新；点击标签可切换到它所在的窗口。':'当前为多个窗口的交互演示；安装扩展后会读取同一浏览器资料下的真实窗口与标签。'}</p></div>`;}

function renderStash(){return `<div class="section-heading"><div><div class="section-title"><h2>暂存标签</h2><span class="badge">${state.stash.length}</span></div><p class="section-subtitle">先收起来，把注意力留给现在</p></div>${btn('folder','整理成组','stash-to-group','primary')}</div><div class="view-tabs-list" data-drop="stash">${state.stash.filter(matches).map(t=>savedRow(t,'stash',batch)).join('')||emptyState('给稍后的自己留个位置','从右侧拖入标签页，灵感和待办都不会丢失','','')}</div><div class="help-box">暂存会保留链接；在设置中开启“保存后关闭标签”，可以同时收起浏览器中的标签页。</div>`;}
function renderBookmarks(){
  if(!browser.capabilities.bookmarks)return `<div class="section-heading"><h2>浏览器书签</h2></div><div class="help-box">此浏览器暂不支持原生书签管理。你仍可保存会话、暂存网址，以及导入和导出收藏。</div>`;
  const folder=bookmarkFolders.find(f=>f.id===bookmarkFolder),bookmarks=state.bookmarks.filter(b=>(bookmarkFolder==='all'||b.parentId===bookmarkFolder)&&bookmarkMatches(b));
  const children=bookmarkFolders.filter(f=>bookmarkFolder==='all'?!bookmarkFolders.some(p=>p.id===f.parentId):f.parentId===bookmarkFolder);
  const trail=[];let current=folder;const seen=new Set();while(current&&!seen.has(current.id)){seen.add(current.id);trail.unshift(current);current=bookmarkFolders.find(f=>f.id===current.parentId);}
  return `<div class="section-heading"><div><div class="section-title"><h2 class="${folder?'native-folder-title':''}">${esc(folder?.title||'全部书签')}</h2><span class="badge">${bookmarks.length}</span></div><p class="section-subtitle">${extension?'与浏览器书签保持一致':'浏览器书签 · 演示预览'}</p></div><div class="bookmark-heading-actions">${folder?ib('more','当前文件夹操作','bookmark-folder-menu',folder.id):''}${btn('plus','添加书签','new-bookmark','primary')}</div></div><nav class="bookmark-breadcrumb" aria-label="书签路径"><button data-action="bookmark-folder" data-id="all">${icon('bookmark')}全部书签</button>${trail.map(f=>`<span>/</span><button data-action="bookmark-folder" data-id="${esc(f.id)}" class="native-folder-title">${esc(f.title)}</button>`).join('')}</nav>${children.length?`<div class="bookmark-subfolders">${children.map(f=>`<article class="bookmark-subfolder" draggable="${!f.protected&&!f.readOnly}" data-drag="bookmark-folder" data-id="${esc(f.id)}" data-drop="bookmark-folder" data-target="${esc(f.id)}"><button data-action="bookmark-folder" data-id="${esc(f.id)}">${icon('groupFolder')}<span class="native-folder-title">${esc(f.title)}</span><small>${state.bookmarks.filter(b=>folderIds(bookmarkFolders,f.id).has(b.parentId)).length} 个书签</small></button>${ib('more','文件夹操作','bookmark-folder-menu',f.id)}</article>`).join('')}</div>`:''}<div class="bookmark-toolbar"><span>${children.length} 个文件夹 · ${bookmarks.length} 个书签</span><button class="text-button accent" data-action="new-bookmark-folder">${icon('plus')}新建文件夹</button></div><div class="bookmark-grid" data-drop="bookmark-folder" data-target="${esc(folder?.id||preferredFolder()||'')}">${bookmarks.map(b=>`<article class="bookmark-card" draggable="${!b.readOnly}" data-drag="bookmark" data-id="${esc(b.id)}">${siteIcon(b)}<button class="bookmark-info" data-action="open-bookmark" data-id="${esc(b.id)}" title="${esc(b.url)}"><h3>${esc(b.title)}</h3><p>${esc(domain(b.url))}</p><span class="book-count native-folder-title">${esc(folderPath(bookmarkFolders,b.parentId)||'书签')}</span></button><div class="bookmark-actions">${!b.readOnly?ib('edit','编辑书签','edit-bookmark',b.id)+ib('folder','移动书签','move-bookmark',b.id)+ib('trash','删除书签','delete-bookmark',b.id):icon('lock')}</div></article>`).join('')}</div>${!bookmarks.length?emptyState('此处还没有书签','拖入标签页、已保存标签或整个标签组，即可存入书签','new-bookmark','添加书签'):''}<div class="bookmark-drop-guide" data-drop="bookmark-folder" data-target="${esc(folder?.id||preferredFolder()||'')}">${icon('dropPointer')}拖入网址存为书签；整组拖入会保留组名，源标签组继续保留。</div><div class="help-box">${extension?'文件夹和书签直接使用浏览器原生数据，新增、编辑与移动会立即应用。':'网页使用演示书签；安装扩展后，这里会显示真实浏览器的书签文件夹。'}</div>`;
}

function renderRecent(){return `<div class="section-heading"><div><div class="section-title"><h2>最近访问</h2><span class="badge">${state.recent.length}</span></div><p class="section-subtitle">找回刚刚浏览的灵感</p></div><button class="text-button" data-action="clear-recent">清空记录</button></div><div class="recent-list">${state.recent.filter(matches).map(t=>savedRow(t,'recent')).join('')||emptyState('你的足迹，从这里开始','通过工作台打开的链接，会自动记录在这里','','')}</div>`;}
function renderTrash(){return `<div class="section-heading"><div><div class="section-title"><h2>回收站</h2><span class="badge">${state.trash.length}</span></div><p class="section-subtitle">整理时的小失误，还有挽回的余地</p></div><button class="text-button" data-action="empty-trash">清空回收站</button></div>${state.trash.filter(t=>matches(t.value)).map(t=>`<div class="trash-row"><span class="folder-icon">${icon(t.kind==='group'?'groupFolder':'bookmark')}</span><div class="trash-info"><h3>${esc(t.value.name||t.value.title)}</h3><p>${t.kind==='group'?`${t.value.tabs.length} 个标签页`:t.kind==='bookmark-folder'?'书签文件夹（含子文件夹）':'标签页'} · 删除于 ${dateLabel(t.deletedAt)}</p></div>${btn('undo','恢复','restore-trash','small',t.id)}${ib('close','永久删除','purge-trash',t.id)}</div>`).join('')||emptyState('干干净净，轻装上阵','删除的标签、标签组和书签文件夹会先放在这里','','')}`;}
function render(){
  workspaceLayout.beforeRender();
  const focus=document.activeElement?.id,selection=['global-search','settings-search'].includes(focus)?document.activeElement.selectionStart:null;
  const preferences=view==='settings'?settingsDraft:state.settings;
  document.documentElement.lang=preferences.language;
  document.documentElement.classList.toggle('dark',preferences.theme==='dark'||preferences.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.title=state.settings.managerTitle;
  const classes=[state.settings.compact?'compact':'',!state.settings.showSiteIcons?'hide-site-icons':'',!state.settings.showUrls?'hide-urls':'',!state.settings.showGroupDates?'hide-dates':'',!state.settings.showCounts?'hide-counts':'',!state.settings.showHints?'hide-hints':'',!state.settings.showStash?'hide-stash':'',state.settings.stickyHeader?'sticky-toolbar':''].join(' ');
  const globalResults=query&&state.settings.searchGlobal&&view!=='settings';
  const showBrowserPanel=state.settings.showBrowserPanel&&view!=='tabs'&&!globalResults;
  app.innerHTML=`<div class="shell ${classes}">${renderSidebar()}<main class="workspace">${renderTopbar()}<div data-scroll-key="${view==='settings'?'settings':'content'}" class="content ${view==='settings'?'settings-content':!showBrowserPanel?'no-side-panel':''}">${view==='settings'?renderSettings({draft:settingsDraft,section:settingsSection,filter:settingsFilter,dirty:settingsDirty(),categories:state.categories,native:extension,credentialSaved,status:syncStatus,busy:syncBusy}):`<section class="collection-pane"><section data-scroll-key="collection-${globalResults?'search':view}" class="collection ${layout==='list'?'list-view':''}" aria-label="收藏管理">${globalResults?renderGlobalSearch():({groups:renderGroups,tabs:renderTabs,stash:renderStash,bookmarks:renderBookmarks,recent:renderRecent,trash:renderTrash})[view]()}</section>${resizeHandle('collectionHeight','调整内容区高度')}</section>${showBrowserPanel?renderBrowserPanel():''}`}</div></main></div>`;
  if(focus&&document.getElementById(focus)){const input=document.getElementById(focus);input.focus({preventScroll:true});if(selection!==null)input.setSelectionRange(selection,selection);}
  if(view==='settings'){document.querySelectorAll('[data-secret]').forEach(el=>el.value=secretDraft[el.dataset.secret]||'');const preview=document.querySelector('[data-name-preview]');if(preview)preview.textContent=groupName([{url:'https://example.com'}],settingsDraft);}
  applyBrowserCapabilities(app);
  translateCoreUi();
  workspaceLayout.afterRender();
}
function renderGlobalSearch(){
  const s=state.settings,limit=s.searchLimit,sources=s.searchSources;
  const groups=state.groups.filter(g=>(matches(g)||g.tabs.some(t=>matches(t)))).slice(0,limit);
  const liveResults=visibleTabs().slice(0,limit),bookmarks=state.bookmarks.filter(b=>(s.searchScope!=='current'||view!=='bookmarks'||bookmarkFolder==='all'||folderIds(bookmarkFolders,bookmarkFolder).has(b.parentId))&&bookmarkMatches(b)).slice(0,limit),stash=state.stash.filter(matches).slice(0,limit);
  const count=(sources.includes('groups')?groups.length:0)+(sources.includes('tabs')?liveResults.length:0)+(sources.includes('bookmarks')?bookmarks.length:0)+(sources.includes('stash')?stash.length:0);
  return `<div class="section-heading"><div><div class="section-title"><h2>全局搜索</h2><span class="badge">${count}</span></div><p class="section-subtitle">${esc(query)} · 每个来源最多显示 ${limit} 个结果</p></div><button class="text-button" data-action="clear-search">清除搜索</button></div>${sources.includes('groups')&&groups.length?`<section class="search-results-section"><h3>${icon('folder')}已保存会话 <small>${groups.length}</small></h3><div class="groups">${groups.map(g=>{expanded.add(g.id);return groupCard(g);}).join('')}</div></section>`:''}${sources.includes('tabs')&&liveResults.length?`<section class="search-results-section"><h3>${icon('tabs')}打开的标签 <small>${liveResults.length}</small></h3>${liveList(true,liveResults)}</section>`:''}${sources.includes('bookmarks')&&bookmarks.length?`<section class="search-results-section"><h3>${icon('bookmark')}浏览器书签 <small>${bookmarks.length}</small></h3>${bookmarks.map(b=>`<div class="saved-tab">${siteIcon(b)}<button class="saved-tab-info" data-action="open-bookmark" data-id="${esc(b.id)}"><span class="saved-title">${esc(b.title)}</span><span class="tab-url">${esc(domain(b.url))}</span></button>${ib('edit','编辑书签','edit-bookmark',b.id)}</div>`).join('')}</section>`:''}${sources.includes('stash')&&stash.length?`<section class="search-results-section"><h3>${icon('archive')}暂存标签 <small>${stash.length}</small></h3>${stash.map(t=>savedRow(t,'stash')).join('')}</section>`:''}${!count?emptyState('没有找到相关标签','换个关键词，或在设置中调整搜索范围','clear-search','清除搜索'):''}`;
}
function findSaved(id){return allSaved().find(t=>t.id===id)||state.stash.find(t=>t.id===id)||state.recent.find(t=>t.id===id);}
function sourceFor(id){return state.groups.find(g=>g.tabs.some(t=>t.id===id))?.id||(state.stash.some(t=>t.id===id)?'stash':'recent');}
function live(id){const tab=tabs.find(t=>String(t.id)===String(id));if(!tab)throw new Error('标签页已关闭，请刷新列表');return tab;}
function group(id){const g=state.groups.find(g=>g.id===id);if(!g)throw new Error('标签组已删除');return g;}
function assertUnlocked(g){if(g.locked)throw new Error('这个标签组已锁定，请先解锁');}
function chosenTabs(){return selectedTabs.size?tabs.filter(t=>selectedTabs.has(String(t.id))):tabs;}
function remember(tab){state.recent=state.recent.filter(t=>t.url!==tab.url);state.recent.unshift({...normalizeTab(tab),visitedAt:new Date().toISOString()});state.recent=state.recent.slice(0,50);}
async function saveLive(items,target){
  const accepted=collectableTabs(items,state.settings);if(!accepted.length)throw new Error('没有符合保存条件的标签，请检查固定标签与网址过滤规则');
  const destination=target==='stash'?state.stash:group(target).tabs;if(target!=='stash')assertUnlocked(group(target));
  const added=appendTabs(destination,accepted,state.settings);await persist();
  if(state.settings.closeAfterSave){const results=await Promise.allSettled(accepted.map(t=>browser.close(t)));const failures=results.filter(r=>r.status==='rejected').length;if(failures)toast(`链接已保存，${failures} 个标签未能关闭`,true);}
  await refresh();toast(added.length?`已${target==='stash'?'暂存':'保存'} ${added.length} 个标签页${accepted.length<items.length?`，跳过 ${items.length-accepted.length} 个过滤标签`:''}`:'这些链接已保存，无需重复添加');
}
async function operateTabs(items,operation){if(operation==='sleep'&&!browser.capabilities.sleep)throw new Error('此浏览器暂不支持标签休眠，可保存会话后关闭标签');let done=0,skipped=0,failed=0;for(const tab of items){if(operation==='sleep'&&(tab.active||tab.discarded)){skipped++;continue;}try{await browser[operation](tab);done++;}catch{failed++;}}await persist();await refresh();toast(`${operation==='sleep'?'已休眠':operation==='wake'?'已唤醒':'已关闭'} ${done} 个标签页${skipped?`，跳过 ${skipped} 个使用中或已休眠标签`:''}${failed?`，${failed} 个未能处理`:''}`,failed>0);}
async function openGroup(g){
  if(!g.tabs.length)throw new Error('这个组还没有标签页');
  const existingOpen=extension&&state.settings.avoidDuplicateOpen?await api.tabs.query({}):tabs;
  const source=state.settings.openOrder==='reverse'?[...g.tabs].reverse():[...g.tabs],created=[],opened=[];
  const asNative=browser.capabilities.nativeGroups&&(g.autoNamed?state.settings.unnamedNativeGroup:state.settings.namedNativeGroup);
  if(extension){
    let windowId;
    for(const tab of source){
      if(state.settings.avoidDuplicateOpen&&existingOpen.some(t=>t.url===tab.url)){opened.push(tab);continue;}
      let result;
      if(state.settings.groupNewWindow&&!windowId){const win=await api.windows.create({url:safeUrl(tab.url),focused:true});windowId=win.id;result=win.tabs[0];}
      else result=await api.tabs.create({url:safeUrl(tab.url),active:false,...(windowId?{windowId}:{})});
      created.push(result);opened.push(tab);
    }
    if(created.length&&asNative)await browser.nativeGroup(created,g.name);
    if(browser.capabilities.sleep&&state.settings.sleepAfterOpen&&created.length){const response=await api.runtime.sendMessage({type:'discard-tabs',ids:created.filter(t=>!t.active).map(t=>t.id)});if(!response?.ok)toast('标签已打开，部分标签无法自动休眠',true);}
  }else{
    const windowId=state.settings.groupNewWindow?Date.now():1;
    for(const tab of source){if(state.settings.avoidDuplicateOpen&&state.demoTabs.some(t=>t.url===tab.url)){opened.push(tab);continue;}const item={...tab,id:Date.now()+created.length,windowId,groupId:-1,index:state.demoTabs.length,discarded:state.settings.sleepAfterOpen,active:false};state.demoTabs.push(item);created.push(item);opened.push(tab);}
    if(created.length&&asNative)await browser.nativeGroup(created,g.name);
  }
  if(state.settings.removeAfterOpen&&!g.locked){for(const tab of opened){recycle(state,'tab',tab,{groupId:g.id});g.tabs=g.tabs.filter(t=>t.id!==tab.id);}}
  await persist();await refresh();toast(`已打开「${g.name}」的 ${opened.length} 个标签页`);
}
async function openSaved(tab,event={}){if(!tab)throw new Error('标签不存在');await browser.open(tab,{background:openInBackground(event,state.settings),reuse:state.settings.avoidDuplicateOpen});remember(tab);if(state.settings.removeAfterOpen){const source=sourceFor(tab.id),g=state.groups.find(g=>g.id===source);if(g&&!g.locked){recycle(state,'tab',tab,{groupId:g.id});g.tabs=g.tabs.filter(t=>t.id!==tab.id);}else if(source==='stash'){recycle(state,'stash',tab);state.stash=state.stash.filter(t=>t.id!==tab.id);}}}
function closeOverlay(){overlay.querySelector('dialog')?.close();overlay.innerHTML='';}
function dialog(title,body,{wide=false,onSubmit}={}){closeOverlay();overlay.innerHTML=`<dialog class="dialog ${wide?'wide':''}"><div class="dialog-heading"><h2>${title}</h2>${ib('close','关闭弹窗','close-dialog')}</div><div class="dialog-body">${onSubmit?'<form id="dialog-form">':''}${body}<p class="dialog-error" role="alert" id="dialog-error"></p>${onSubmit?'</form>':''}</div></dialog>`;applyTranslations(overlay,state.settings.language);const d=overlay.querySelector('dialog');d.showModal();d.addEventListener('click',e=>{if(e.target===d)closeOverlay();});d.addEventListener('cancel',()=>closeOverlay());if(onSubmit)overlay.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{await onSubmit(new FormData(e.target));closeOverlay();await persist();await refresh();}catch(error){const target=document.querySelector('#dialog-error');if(target)target.textContent=error.message;}finally{if(button.isConnected)button.disabled=false;}};}
const formField=(label,name,value='',placeholder='',type='text')=>`<label class="form-field"><span>${label}</span><input name="${name}" value="${esc(value)}" placeholder="${placeholder}" type="${type}" ${type==='text'?'maxlength="200"':''} required></label>`;

const formFooter=(text='保存')=>`<div class="dialog-footer">${btn('','取消','close-dialog')}<button type="submit" class="button primary">${text}</button></div>`;
function groupForm(g,initialTabs=[],scope='selected',placement){
  const accepted=initialTabs.length?collectableTabs(initialTabs,state.settings):[];
  if(initialTabs.length&&!accepted.length)throw new Error('没有符合保存条件的标签，请检查网址过滤与固定标签配置');
  dialog(g?'编辑标签组':accepted.length?'保存标签到分组':'新建标签组',`<p class="dialog-description">把相关的网页放在一起，随时接着上次的思路。${initialTabs.length>accepted.length?`已按过滤规则跳过 ${initialTabs.length-accepted.length} 个标签。`:''}</p>${formField('标签组名称','name',g?.name||(accepted.length?groupName(accepted,state.settings):''),'例如：设计灵感、项目资料')}${formFooter(g?'保存更改':'创建标签组')}`,{onSubmit:async data=>{
    if(!data.get('name').trim())throw new Error('请输入标签组名称');
    if(g){assertUnlocked(g);g.name=data.get('name').trim();g.categoryId='inbox';}
    else{const created=saveCollection(state,accepted,{name:data.get('name').trim(),categoryId:'inbox',automatic:accepted.length>0});expanded.add(created.id);if(placement){state.groups=state.groups.filter(g=>g.id!==created.id);const index=state.groups.findIndex(g=>g.id===placement.anchorId);state.groups.splice(index+(placement.below?1:0),0,created);}if(accepted.length&&(state.settings.closeAfterSave||state.settings.closeScopes.includes(scope))){await persist();await operateTabs(accepted,'close');}}
    view='groups';history.replaceState(null,'','?view=groups');category='all';toast(g?'标签组已更新':'标签组已创建');
  }});
}
function bookmarkForm(b,tab){if(!writableFolders().length)throw new Error('浏览器中没有可写入的书签文件夹');dialog(b?'编辑书签':'添加书签',`<p class="dialog-description">${extension?'直接保存到你的浏览器书签。':'将常用的网址收藏起来，随时都能找到。'}</p>${formField('书签名称','title',b?.title||tab?.title||'','给这个书签起个名字')}${formField('网址','url',b?.url||tab?.url||'','https://example.com','url')}<label class="form-field"><span>文件夹</span><select name="parentId">${writableFolders().map(f=>`<option value="${esc(f.id)}" ${(b?.parentId||bookmarkFolder)===f.id?'selected':''}>${esc(folderPath(bookmarkFolders,f.id))}</option>`).join('')}</select></label>${formFooter()}`,{onSubmit:async data=>{await browser.saveBookmark({title:data.get('title').trim(),url:safeUrl(data.get('url'))},data.get('parentId'),b?.id);toast(b?'书签已更新':'已添加到浏览器书签');}});}
function settingsDialog(section){if(view!=='settings'&&!settingsDirty()){settingsDraft=structuredClone(state.settings);secretDraft={};}view='settings';clearTimeout(searchTimer);settingsSection=section||settingsSection;history.replaceState(null,'',`?view=settings&section=${settingsSection}`);settingsFilter='';query='';mobileOpen=false;closeOverlay();}
async function credentialsExist(){const value=await readCredentials();return Boolean(value.token||value.username||value.password);}
function settingsDirty(){return JSON.stringify(settingsDraft)!==JSON.stringify(state.settings)||Object.values(secretDraft).some(Boolean);}
function downloadJson(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function saveSettings(){
  const next=validateSettings(settingsDraft);
  if(extension&&next.syncProvider!=='none'){
    const origins=next.syncProvider==='gist'?['https://api.github.com/*']:next.webdavUrl?[new URL(next.webdavUrl).origin+'/*']:[];
    if(origins.length&&!await api.permissions.request(syncPermissionRequest(origins)))throw new Error('未授权访问同步地址，配置尚未保存');
  }
  state.settingsHistory=[{at:new Date().toISOString(),preferences:structuredClone(state.settings)},...(state.settingsHistory||[])].slice(0,10);
  const before=state.settings;state.settings=next;
  try{await persist();await writePreferences(next);}catch(error){state.settings=before;throw error;}
  const existingCredentials=await readCredentials();
  if(next.syncProvider==='webdav'&&next.webdavUrl){const origin=new URL(next.webdavUrl).origin;if(existingCredentials.webdavOrigin!==origin){delete existingCredentials.username;delete existingCredentials.password;}existingCredentials.webdavOrigin=origin;}
  if(Object.values(secretDraft).some(Boolean)||next.syncProvider==='webdav'){await writeCredentials({...existingCredentials,...Object.fromEntries(Object.entries(secretDraft).filter(([,v])=>v!==''))});credentialSaved=await credentialsExist();secretDraft={};}
  settingsDraft=structuredClone(next);layout=next.defaultLayout;sort=next.defaultSort;allWindows=next.tabWindowScope==='all';await refresh(false);
  if(next.expandAll)state.groups.forEach(g=>expanded.add(g.id));else if(before.expandAll)expanded.clear();
  configureAutoSync();toast(next.language==='en'?'Preferences saved':'设置已保存并应用');
}
async function performSync(test=false){
  if(syncBusy)throw new Error('已有同步任务正在执行');
  if(settingsDirty()&&view==='settings')throw new Error('请先保存设置，再测试连接或同步');
  syncBusy=true;render();
  try{
    if(extension&&!test){const result=await api.runtime.sendMessage({type:'sync'});if(!result.ok)throw new Error(result.error);const latest=await readState(createEmptyState());Object.assign(state,latest);syncStatus=result.result;}
    else{syncStatus=await runSync(state,{credentials:await readCredentials(),test});if(!test){await persist();await writePreferences(state.settings);}}
    syncStatus.at=new Date().toISOString();
    if(extension)await api.storage.local.set({[SYNC_STATUS_KEY]:syncStatus});else localStorage.setItem(SYNC_STATUS_KEY,JSON.stringify(syncStatus));
    if(!settingsDirty())settingsDraft=structuredClone(state.settings);
    toast(syncStatus.message);
  }catch(error){syncStatus={ok:false,message:error.message,at:new Date().toISOString()};toast(error.message,true);}finally{syncBusy=false;render();}
}
function configureAutoSync(){clearInterval(autoSyncTimer);if(extension||!state.settings.autoSync||state.settings.syncProvider==='none')return;autoSyncTimer=setInterval(()=>{if(!syncBusy&&inSyncWindow(state.settings.syncWindows))performSync().catch(()=>{});},state.settings.syncInterval*60000);}
function configurationTools(anchor){menu(anchor,[{label:'导出偏好配置',icon:'upload',action:'settings-export'},{label:'导入偏好配置',icon:'download',action:'settings-import'},{label:'恢复上次保存的配置',icon:'undo',action:'settings-previous'},{label:'恢复全部默认配置',icon:'settings',action:'settings-defaults'},'rule',{label:'使用帮助',icon:'external',action:'help'},{label:'浏览器支持',icon:'monitor',action:'browser-support'},!extension?{label:'重置演示内容',icon:'refresh',action:'reset-demo'}:null]);}
function unsupportedAction(action){
  const c=browser.capabilities;
  if(!c.sleep&&['sleep-tab','sleep-selected','sleep-group','sleep-native','batch-sleep'].includes(action))return '此浏览器暂不支持标签休眠';
  if(!c.nativeGroups&&['new-native-group','ungroup-native','rename-native-group'].includes(action))return '此浏览器暂不支持原生分组管理';
  if(!c.bookmarks&&(['bookmark-saved','new-bookmark','new-bookmark-folder','move-group','move-bookmark','move-bookmark-folder','rename-bookmark-folder','delete-bookmark-folder'].includes(action)||action==='batch-move'&&selectedGroups.size))return '此浏览器暂不支持原生书签管理';
  return '';
}
function applyBrowserCapabilities(root){
  for(const el of root.querySelectorAll('[data-action]')){const reason=unsupportedAction(el.dataset.action);if(reason){el.disabled=true;el.title=reason;}}
  const unavailable={sleepAfterOpen:!browser.capabilities.sleep,preserveNativeGroups:!browser.capabilities.nativeGroups,namedNativeGroup:!browser.capabilities.nativeGroups,unnamedNativeGroup:!browser.capabilities.nativeGroups};
  for(const [key,missing] of Object.entries(unavailable))if(missing){const row=root.querySelector(`[data-pref-row="${key}"]`);if(row){for(const el of row.querySelectorAll('button,input,select'))el.disabled=true;row.title='此浏览器暂不支持此功能，配置会保留';}}
}
function translateCoreUi(){applyTranslations(app,view==='settings'?settingsDraft.language:state.settings.language);}
function menu(anchor,items){items=items.filter(item=>!item?.action||!unsupportedAction(item.action));closeOverlay();const rect=anchor.getBoundingClientRect();const height=items.filter(Boolean).length*34+20;overlay.innerHTML=`<div class="menu" role="menu" style="left:${Math.max(8,Math.min(rect.right-200,innerWidth-208))}px;top:${Math.max(8,Math.min(rect.bottom+6,innerHeight-height-8))}px">${items.filter(Boolean).map(item=>item==='rule'?'<div class="rule"></div>':`<button role="menuitem" data-action="${item.action}" data-id="${esc(item.id||'')}" class="${item.danger?'danger':''}">${icon(item.icon||'external')}${esc(item.label)}</button>`).join('')}</div>`;applyTranslations(overlay,state.settings.language);overlay.querySelector('[role=menuitem]')?.focus();}
function groupMenu(anchor,g){menu(anchor,[
 {label:'打开整个标签组',icon:'play',action:'open-group',id:g.id},{label:'休眠已打开标签',icon:'moon',action:'sleep-group',id:g.id},{label:'关闭已打开标签',icon:'close',action:'close-group',id:g.id},'rule',
 {label:'编辑标签组',icon:'edit',action:'edit-group',id:g.id},{label:'上方新建标签组',icon:'plus',action:'new-above',id:g.id},{label:'下方新建标签组',icon:'plus',action:'new-below',id:g.id},{label:'存入浏览器书签',icon:'bookmark',action:'move-group',id:g.id},{label:'克隆标签组',icon:'copy',action:'clone-group',id:g.id},{label:'复制全部链接',icon:'copy',action:'copy-group',id:g.id},{label:'标签去重',icon:'check',action:'dedupe-group',id:g.id},{label:'标签名称升序',icon:'sort',action:'sort-tabs-asc',id:g.id},{label:'标签名称降序',icon:'sort',action:'sort-tabs-desc',id:g.id},{label:g.starred?'取消星标':'添加星标',icon:'star',action:'star-group',id:g.id},{label:g.locked?'解锁标签组':'锁定标签组',icon:'lock',action:'lock-group',id:g.id},'rule',{label:'删除标签组',icon:'trash',action:'delete-group',id:g.id,danger:true}]);}
function confirmDialog(title,description,callback,label='确认删除'){dialog(title,`<p class="dialog-description">${esc(description)}</p>${formFooter(label)}`,{onSubmit:callback});}
function folderOptions(selected,exclude=new Set()){return writableFolders().filter(f=>!exclude.has(f.id)).map(f=>`<option value="${esc(f.id)}" ${selected===f.id?'selected':''}>${esc(folderPath(bookmarkFolders,f.id))}</option>`).join('');}
function folderMenu(anchor,id){const folder=bookmarkFolders.find(f=>f.id===id);if(!folder)throw new Error('书签文件夹已不存在');menu(anchor,[{label:'打开文件夹',icon:'folderOpen',action:'bookmark-folder',id},!folder.readOnly?{label:'新建子文件夹',icon:'plus',action:'new-child-folder',id}:null,!folder.protected&&!folder.readOnly?{label:'重命名文件夹',icon:'edit',action:'rename-bookmark-folder',id}:null,!folder.protected&&!folder.readOnly?{label:'移动文件夹',icon:'folder',action:'move-bookmark-folder',id}:null,!folder.protected&&!folder.readOnly?{label:'删除文件夹',icon:'trash',action:'delete-bookmark-folder',id,danger:true}:null]);}
function bookmarkFolderForm(parentId=preferredFolder()){if(!writableFolders().length)throw new Error('浏览器中没有可写入的书签文件夹');dialog('新建书签文件夹',`${formField('文件夹名称','name')}<label class="form-field"><span>父文件夹</span><select name="parentId" required>${folderOptions(parentId)}</select></label>${formFooter('创建文件夹')}`,{onSubmit:async data=>{const folder=await browser.createBookmarkFolder(data.get('name'),data.get('parentId'));collapsedFolders.delete(data.get('parentId'));await selectBookmarkFolder(folder.id);toast('书签文件夹已创建');}});}
async function selectBookmarkFolder(id){if(id!=='all'){if(!bookmarkFolders.some(f=>f.id===id)){const fresh=await browser.listBookmarks();bookmarkFolders=fresh.folders;state.bookmarks=fresh.bookmarks;}let parent=bookmarkFolders.find(f=>f.id===id);const seen=new Set();while(parent&&!seen.has(parent.id)){seen.add(parent.id);collapsedFolders.delete(parent.id);parent=bookmarkFolders.find(f=>f.id===parent.parentId);}}bookmarkFolder=id;view='bookmarks';category='all';query='';mobileOpen=false;clearTimeout(searchTimer);history.replaceState(null,'',`?view=bookmarks${id!=='all'?'&folder='+encodeURIComponent(id):''}`);}
function bookmarkDestinationDialog(groupsToCopy){if(!writableFolders().length)throw new Error('浏览器中没有可写入的书签文件夹');dialog('存入浏览器书签',`<p class="dialog-description">每个标签组将保存到同名子文件夹中，原标签组继续保留，可随时恢复浏览会话。</p><label class="form-field"><span>目标书签文件夹</span><select name="target" required>${folderOptions(preferredFolder())}</select></label>${formFooter('保存为书签')}`,{onSubmit:async data=>{let count=0;for(const g of groupsToCopy){if(!g.tabs.length)continue;const result=await browser.copyToBookmarks(g.tabs,data.get('target'),{name:g.name,dedupe:state.settings.duplicateTabs==='dedupe'});count+=result.count;}if(!groupsToCopy.some(g=>g.tabs.length))throw new Error('所选标签组没有可保存的链接');selectedGroups.clear();collapsedFolders.delete(data.get('target'));toast(`已保存 ${count} 个浏览器书签，原标签组保留`);}});}
function moveDialog(groupsToMove,tabsToMove=[]){if(groupsToMove.length){bookmarkDestinationDialog(groupsToMove);return;}dialog('移动到',`<p class="dialog-description">选择标签的目标标签组。</p><label class="form-field"><span>目标标签组</span><select name="target">${state.groups.filter(g=>!g.locked).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>${formFooter('移动')}`,{onSubmit:async data=>{const target=data.get('target');if(!target)throw new Error('请先创建可用的标签组');for(const id of tabsToMove)moveSavedTab(state,id,sourceFor(id),target);selectedSaved.clear();toast('已移动到新位置');}});}

function snapshotDialog(){dialog('工作台快照',`<p class="dialog-description">留住此刻的标签组和浏览现场。快照保存在本机，恢复时会保留现有收藏。</p>${btn('camera','创建当前快照','create-snapshot','primary')}<div style="margin-top:18px">${state.snapshots.map(s=>`<div class="snapshot-row"><div><strong>${esc(s.name)}</strong><p>${s.groups.length} 个标签组 · ${s.openTabs?.length||0} 个打开标签</p></div>${btn('undo','恢复','restore-snapshot','small',s.id)}${ib('trash','删除快照','delete-snapshot',s.id)}</div>`).join('')||'<p class="dialog-description">还没有快照，从今天的工作台开始吧。</p>'}</div>`,{wide:true});}
async function restoreSnapshot(id){const s=state.snapshots.find(s=>s.id===id);if(!s)throw new Error('快照不存在');for(const c of s.categories)if(!state.categories.some(x=>x.id===c.id))state.categories.push({...c});for(const g of s.groups){const existing=state.groups.find(x=>x.id===g.id);if(!existing)state.groups.push(structuredClone(g));else if(JSON.stringify(existing.tabs)!==JSON.stringify(g.tabs))insertGroup(state,makeGroup('恢复 · '+g.name,g.categoryId,g.tabs));}if(s.preferences){state.settings=normalizeSettings({...state.settings,...s.preferences});await writePreferences(state.settings);settingsDraft=structuredClone(state.settings);}for(const tab of s.stash)if(!state.stash.some(t=>t.url===tab.url))state.stash.push(normalizeTab(tab));if(s.openTabs?.length)state.groups.unshift(makeGroup(`快照 · ${s.name}`,'inbox',s.openTabs));closeOverlay();view='groups';category='all';toast('快照已恢复，打开的标签已保存为新标签组');}
function deleteSaved(id){const source=sourceFor(id);if(source==='recent'){state.recent=state.recent.filter(t=>t.id!==id);return;}const g=source==='stash'?null:group(source);if(g)assertUnlocked(g);const list=g?g.tabs:state.stash;const t=list.find(t=>t.id===id);if(!t)return;recycle(state,source==='stash'?'stash':'tab',t,{groupId:source});list.splice(list.indexOf(t),1);toast('标签已移入回收站');}
function deleteGroup(g){assertUnlocked(g);recycle(state,'group',g);state.groups=state.groups.filter(x=>x.id!==g.id);selectedGroups.delete(g.id);}
function nameDialog(title,label,initial,callback){dialog(title,`${formField(label,'name',initial)}${formFooter()}`,{onSubmit:async data=>{const name=data.get('name').trim();if(!name)throw new Error('名称不能为空');await callback(name);}});}
async function dispatch(action,id,anchor,event={}){
  if(syncBusy&&!['sync','sync-test','sync-now','settings','settings-section','close-dialog','navigate'].includes(action)){toast('同步正在进行，请稍后再修改数据');return;}
  if(['navigate','category','settings'].includes(action))clearTimeout(searchTimer);
  if(['close-tab','close-selected','close-group','close-native','batch-close'].includes(action)&&state.settings.confirmClose&&!event.confirmed){confirmDialog('关闭浏览器标签','关闭选中的浏览器标签页，收藏中的链接会保留。',async()=>dispatch(action,id,anchor,{confirmed:true}),'确认关闭');return;}
  switch(action){
    case 'reset-layout':await workspaceLayout.reset();toast('分栏已恢复默认');break;
    case 'rename-live-tab':{const tab=live(id);dialog('重命名标签',`<p class="dialog-description">仅修改栖页显示名称，同一网址共用此名称。留空可恢复网页原标题。</p><label class="form-field"><span>显示名称</span><input name="title" maxlength="200" value="${esc(tab.customTitle?tab.title:'')}" placeholder="${esc(tab.originalTitle||tab.title)}"></label><p class="original-title-note">${esc(tab.originalTitle||tab.title)}</p>${formFooter()}`,{onSubmit:async data=>{await writeTabTitles(updateTabTitle(await readTabTitles(),tab.url,data.get('title')));toast('标签名称已保存');}});break;}
    case 'rename-saved':{const tab=findSaved(id),g=state.groups.find(g=>g.tabs.includes(tab));if(!tab)throw new Error('标签不存在');if(g)assertUnlocked(g);nameDialog('重命名标签','标题',tab.title,async name=>{if(g)assertUnlocked(g);tab.title=name;toast('标签名称已保存');});break;}
    case 'rename-native-group':{const native=nativeGroups.find(group=>String(group.id)===String(id));if(!native)throw new Error('浏览器标签组已关闭');nameDialog('重命名浏览器分组','标签组名称',native.title||'',async name=>{await browser.renameNativeGroup(native.id,name);toast('标签组名称已保存');});break;}
    case 'settings-section':settingsSection=id;history.replaceState(null,'',`?view=settings&section=${id}`);settingsFilter='';break;
    case 'settings-save':await saveSettings();break;
    case 'settings-discard':settingsDraft=structuredClone(state.settings);secretDraft={};toast('已撤销未保存的更改');break;
    case 'settings-reset-section':for(const field of SETTINGS_SECTIONS.find(s=>s.id===settingsSection).fields)settingsDraft[field.key]=structuredClone(DEFAULT_SETTINGS[field.key]);toast('本分区已恢复默认，保存后生效');break;
    case 'settings-tools':configurationTools(anchor);return;
    case 'settings-export':downloadJson(exportPreferences(validateSettings(settingsDraft)),`qiye-preferences-${new Date().toLocaleDateString('sv-SE')}.json`);toast('配置已导出，不包含密码或 Token');break;
    case 'settings-import':document.querySelector('#preferences-file').click();break;
    case 'settings-previous':if(!state.settingsHistory?.length)throw new Error('尚无历史配置，请先保存一次设置');settingsDraft=normalizeSettings(state.settingsHistory[0].preferences);toast('已载入上次配置，保存后生效');break;
    case 'settings-defaults':confirmDialog('恢复默认配置','只重置偏好选项，标签组、书签、暂存和凭据会保留。保存设置后生效。',async()=>{settingsDraft=structuredClone(DEFAULT_SETTINGS);secretDraft={};},'恢复默认');break;
    case 'settings-add-rule':if(settingsDraft.titleRules.length>=50)throw new Error('最多添加 50 条标题规则');settingsDraft.titleRules.push({domain:'',find:'',replace:''});break;
    case 'settings-remove-rule':settingsDraft.titleRules.splice(Number(id),1);break;
    case 'settings-add-window':if(settingsDraft.syncWindows.length>=12)throw new Error('最多添加 12 个同步时段');settingsDraft.syncWindows.push({start:'09:00',end:'18:00'});break;
    case 'settings-remove-window':if(settingsDraft.syncWindows.length>1)settingsDraft.syncWindows.splice(Number(id),1);break;
    case 'settings-template':settingsDraft.copyTemplate=id;break;
    case 'sync-test':await performSync(true);break;
    case 'sync-now':await performSync();break;
    case 'sync-clear-secret':confirmDialog('移除本机同步凭据','移除保存的账号密码和 Token；远端收藏文件会保留。',async()=>{await writeCredentials({});secretDraft={};credentialSaved=false;state.settings.autoSync=false;settingsDraft.autoSync=false;await writePreferences(state.settings);configureAutoSync();toast('本机同步凭据已移除');},'移除凭据');break;
    case 'preview-home':window.open('newtab.html','_blank','noopener,noreferrer');break;
    case 'browser-support':dialog('浏览器支持',`<p class="dialog-description">按浏览器安装对应版本，每份收藏保存在当前浏览器中。部分功能以浏览器实际支持为准。</p><div class="help-box"><strong>Chrome · Edge · Brave · Opera · Vivaldi</strong><p>使用 Chromium 通用包，支持多窗口标签、分组、书签和休眠。</p></div><div class="help-box"><strong>Firefox 140 及以上</strong><p>使用 Firefox 专用包，支持多窗口标签、分组、书签和休眠。未签名版本用于临时加载测试。</p></div><div class="help-box"><strong>Safari（macOS）</strong><p>提供转换源包，需要通过 Xcode 打包。可管理标签和保存会话；原生书签、分组与休眠暂不可用。</p></div><div class="dialog-footer">${btn('','关闭','close-dialog')}</div>`);break;
    case 'help':dialog('使用帮助',`<p class="dialog-description">在设置中心选择分区修改，点击“保存设置”后生效。配置管理支持导入、导出、回退和恢复默认。</p><div class="help-box">⌘ / Ctrl + K 搜索（可在搜索配置中修改）<br>拖动标签到分组、暂存或浏览器书签文件夹。整组拖入书签文件夹会创建同名子文件夹，原标签组保留。<br>工作台收藏与浏览器原生书签分别管理，删除的收藏可从回收站恢复。<br>${extension?'浏览器扩展已连接。':'网页使用演示数据；安装对应浏览器的扩展包，即可管理真实标签。'}</div><div class="dialog-footer">${btn('','关闭','close-dialog')}</div>`);break;
    case 'new-above':case 'new-below':groupForm(null,[],'current',{anchorId:id,below:action==='new-below'});break;
    case 'clone-group':{const original=group(id),copy=makeGroup(original.name+' · 副本',original.categoryId,original.tabs);insertGroup(state,copy);expanded.add(copy.id);toast('标签组已克隆');break;}
    case 'sort-tabs-asc':case 'sort-tabs-desc':{const g=group(id);assertUnlocked(g);g.tabs.sort((a,b)=>(action==='sort-tabs-desc'?-1:1)*a.title.localeCompare(b.title,state.settings.language));toast('组内标签顺序已更新');break;}
    case 'navigate':if(id==='settings'){settingsDialog();break;}view=id;history.replaceState(null,'',`?view=${view}`);query='';mobileOpen=false;if(view==='groups'&&state.settings.expandAll)state.groups.forEach(g=>expanded.add(g.id));break;

    case 'mobile-open':mobileOpen=true;break;
    case 'mobile-close':mobileOpen=false;break;
    case 'clear-search':query='';break;
    case 'filter-star':starOnly=!starOnly;break;
    case 'filter-lock':lockOnly=!lockOnly;break;
    case 'layout':layout=id;break;
    case 'batch':batch=!batch;selectedGroups.clear();selectedSaved.clear();break;
    case 'expand':expanded.has(id)?expanded.delete(id):expanded.add(id);break;
    case 'star-group':group(id).starred=!group(id).starred;break;
    case 'lock-group':group(id).locked=!group(id).locked;toast(group(id).locked?'标签组已锁定':'标签组已解锁');break;
    case 'new-group':groupForm();break;
    case 'edit-group':assertUnlocked(group(id));groupForm(group(id));break;
    case 'group-menu':groupMenu(anchor,group(id));return;
    case 'delete-group':{const g=group(id);assertUnlocked(g);const remove=()=>{deleteGroup(g);const entry=state.trash[0];toast('标签组已移入回收站',false,async()=>{restoreItem(state,entry.id);await persist();render();});};if(state.settings.confirmDeleteGroup)confirmDialog('删除标签组',`将「${g.name}」移入回收站，之后仍可恢复。`,remove,'移入回收站');else remove();break;}
    case 'move-group':bookmarkDestinationDialog([group(id)]);break;
    case 'copy-group':await navigator.clipboard.writeText(formatLinks(group(id).tabs,state.settings.copyTemplate));toast('已复制全部链接');break;
    case 'dedupe-group':{const g=group(id);assertUnlocked(g);const before=g.tabs.length;g.tabs=dedupeTabs(g.tabs);toast(before===g.tabs.length?'没有重复链接':`已移除 ${before-g.tabs.length} 个重复链接`);break;}
    case 'add-tab':{const g=group(id);assertUnlocked(g);dialog('添加标签',`${formField('标题','title','','给网页起个名字')}${formField('网址','url','','https://example.com','url')}${formFooter('添加标签')}`,{onSubmit:async data=>{appendTabs(g.tabs,[{title:data.get('title'),url:data.get('url')}],state.settings);toast('标签已添加');}});break;}
    case 'open-saved':{const tab=findSaved(id);if(!tab)throw new Error('标签不存在');await openSaved(tab,event);break;}
    case 'saved-menu':{const source=sourceFor(id);menu(anchor,[{label:'打开标签页',icon:'external',action:'open-saved',id},{label:'重命名标签',icon:'edit',action:'rename-saved',id},{label:'编辑标题与网址',icon:'edit',action:'edit-saved',id},{label:'移动到其他标签组',icon:'folder',action:'move-saved',id},source!=='stash'&&source!=='recent'?{label:'移入暂存',icon:'archive',action:'stash-saved',id}:null,{label:'添加到浏览器书签',icon:'bookmark',action:'bookmark-saved',id},'rule',{label:source==='recent'?'移除记录':'删除标签',icon:'trash',action:'delete-saved',id,danger:true}]);return;}
    case 'edit-saved':{const tab=findSaved(id),g=state.groups.find(g=>g.tabs.includes(tab));if(g)assertUnlocked(g);dialog('编辑标签',`${formField('标题','title',tab.title)}${formField('网址','url',tab.url,'','url')}${formFooter()}`,{onSubmit:async data=>{tab.title=data.get('title').trim();tab.url=safeUrl(data.get('url'));toast('标签已更新');}});break;}
    case 'delete-saved':if(state.settings.confirmDeleteTab)confirmDialog('删除收藏标签','将此收藏标签移入回收站，浏览器中已打开的页面不会关闭。',async()=>deleteSaved(id),'移入回收站');else deleteSaved(id);break;
    case 'move-saved':moveDialog([],[id]);break;
    case 'stash-saved':moveSavedTab(state,id,sourceFor(id),'stash');toast('已移入暂存');break;
    case 'bookmark-saved':bookmarkForm(null,findSaved(id));break;
    case 'open-group':await openGroup(group(id));break;
    case 'sleep-group':case 'close-group':{const urls=new Set(group(id).tabs.map(t=>t.url));const matched=tabs.filter(t=>urls.has(t.url));if(!matched.length)throw new Error('此标签组没有正在打开的标签页');await operateTabs(matched,action==='sleep-group'?'sleep':'close');break;}
    case 'focus-window':await browser.focusWindow(Number(id));await refresh();toast('已切换到所选窗口');break;
    case 'activate-tab':{const tab=live(id);await browser.open(tab);remember(tab);await refresh();break;}
    case 'sleep-tab':await browser.sleep(live(id));await refresh();toast('标签已休眠，点击即可唤醒');break;
    case 'wake-tab':await browser.wake(live(id));await refresh();toast('标签已唤醒');break;
    case 'close-tab':await browser.close(live(id));await refresh();toast('标签页已关闭');break;
    case 'stash-tab':await saveLive([live(id)],'stash');break;
    case 'stash-selected':await saveLive(chosenTabs(),'stash');selectedTabs.clear();break;
    case 'sleep-selected':await operateTabs(chosenTabs(),'sleep');break;
    case 'close-selected':if(!selectedTabs.size)throw new Error('请先选择要关闭的标签页');await operateTabs(chosenTabs(),'close');selectedTabs.clear();break;
    case 'save-selected-group':if(!selectedTabs.size)throw new Error('请先选择要保存的标签页');groupForm(null,chosenTabs());break;
    case 'new-native-group':if(!selectedTabs.size)throw new Error('请先选择要分组的标签页');nameDialog('新建浏览器分组','标签组名称','',async name=>{await browser.nativeGroup(chosenTabs(),name);selectedTabs.clear();toast('已创建浏览器原生标签组');});break;
    case 'native-menu':menu(anchor,[{label:'重命名浏览器分组',icon:'edit',action:'rename-native-group',id},{label:'保存标签组',icon:'folder',action:'save-native',id},{label:'休眠整组标签',icon:'moon',action:'sleep-native',id},{label:'关闭整组标签',icon:'close',action:'close-native',id},{label:'解除浏览器分组',icon:'tabs',action:'ungroup-native',id}]);return;
    case 'save-native':{const g=nativeGroups.find(g=>String(g.id)===id);groupForm(null,tabs.filter(t=>String(t.groupId)===id));const input=document.querySelector('[name=name]');if(input)input.value=g?.title||'';break;}
    case 'sleep-native':case 'close-native':await operateTabs(tabs.filter(t=>String(t.groupId)===id),action==='sleep-native'?'sleep':'close');break;
    case 'ungroup-native':await browser.ungroup(tabs.filter(t=>String(t.groupId)===id));await refresh();toast('已解除浏览器分组');break;
    case 'stash-menu':menu(anchor,[{label:'整理为标签组',icon:'folder',action:'stash-to-group'},{label:'查看全部暂存',icon:'archive',action:'navigate',id:'stash'},{label:'清空暂存区',icon:'trash',action:'clear-stash',danger:true}]);return;
    case 'stash-to-group':if(!state.stash.length)throw new Error('暂存区还是空的，先收集几个标签吧');dialog('整理暂存标签',`${formField('标签组名称','name','','给这组标签起个名字')}${formFooter('整理成组')}`,{onSubmit:async data=>{const g=makeGroup(data.get('name'),'inbox',state.stash);insertGroup(state,g);state.stash=[];expanded.add(g.id);view='groups';category=g.categoryId;toast('暂存标签已整理为标签组');}});break;
    case 'clear-stash':if(!state.stash.length)throw new Error('暂存区已经是空的');confirmDialog('清空暂存区','所有暂存标签会移入回收站，之后仍可恢复。',async()=>{state.stash.forEach(t=>recycle(state,'stash',t));state.stash=[];toast('暂存标签已移入回收站');},'移入回收站');break;
    case 'batch-move':{const gs=state.groups.filter(g=>selectedGroups.has(g.id));if(!gs.length&&!selectedSaved.size)throw new Error('请先选择标签组或标签');if(gs.length&&selectedSaved.size)throw new Error('请分别移动标签组和单个标签页');for(const tabId of selectedSaved){const g=state.groups.find(g=>g.tabs.some(t=>t.id===tabId));if(g)assertUnlocked(g);}moveDialog(gs,[...selectedSaved]);break;}
    case 'batch-delete':{if(!event.confirmed&&((selectedGroups.size&&state.settings.confirmDeleteGroup)||(selectedSaved.size&&state.settings.confirmDeleteTab))){confirmDialog('删除所选收藏','将所选收藏移入回收站，之后仍可恢复。',async()=>dispatch(action,id,anchor,{confirmed:true}),'移入回收站');break;}const gs=state.groups.filter(g=>selectedGroups.has(g.id));if(!gs.length&&!selectedSaved.size)throw new Error('请先选择标签组或标签');gs.forEach(assertUnlocked);for(const tabId of selectedSaved){const g=state.groups.find(g=>g.tabs.some(t=>t.id===tabId));if(g)assertUnlocked(g);}for(const tabId of selectedSaved)if(!gs.some(g=>g.tabs.some(t=>t.id===tabId)))deleteSaved(tabId);gs.forEach(deleteGroup);selectedSaved.clear();toast('所选内容已移入回收站');break;}
    case 'batch-sleep':case 'batch-close':{const saved=state.groups.filter(g=>selectedGroups.has(g.id)).flatMap(g=>g.tabs).concat(allSaved().filter(t=>selectedSaved.has(t.id)));if(!saved.length)throw new Error('请先选择标签组或标签');const urls=new Set(saved.map(t=>t.url));await operateTabs(tabs.filter(t=>urls.has(t.url)),action==='batch-sleep'?'sleep':'close');break;}
    case 'bookmark-folder':await selectBookmarkFolder(id);break;
    case 'toggle-bookmark-folder':collapsedFolders.has(id)?collapsedFolders.delete(id):collapsedFolders.add(id);state.bookmarkCollapsed=[...collapsedFolders];break;
    case 'bookmark-folder-menu':folderMenu(anchor,id);return;
    case 'new-bookmark':bookmarkForm();break;
    case 'edit-bookmark':bookmarkForm(state.bookmarks.find(b=>b.id===id));break;
    case 'open-bookmark':{const b=state.bookmarks.find(b=>b.id===id);await browser.open(b,{background:openInBackground(event,state.settings),reuse:state.settings.avoidDuplicateOpen});remember(b);break;}
    case 'delete-bookmark':{const b=state.bookmarks.find(b=>b.id===id);confirmDialog('删除书签',`将从${extension?'浏览器':'演示数据'}中删除「${b.title}」，删除后可在回收站恢复。`,async()=>{recycle(state,'bookmark',b);const entry=state.trash[0];await persist();try{await browser.deleteBookmark(id);}catch(error){state.trash=state.trash.filter(t=>t.id!==entry.id);await persist();throw error;}toast('书签已移入回收站');},'删除书签');break;}
    case 'new-bookmark-folder':bookmarkFolderForm();break;
    case 'new-child-folder':bookmarkFolderForm(id);break;
    case 'rename-bookmark-folder':{const f=bookmarkFolders.find(f=>f.id===id);nameDialog('重命名文件夹','文件夹名称',f?.title||'',async name=>{await browser.renameBookmarkFolder(id,name);await refresh();toast('文件夹已重命名');});break;}
    case 'move-bookmark-folder':{const f=bookmarkFolders.find(f=>f.id===id);dialog('移动文件夹',`<label class="form-field"><span>目标父文件夹</span><select name="parentId" required>${folderOptions(f?.parentId,folderIds(bookmarkFolders,id))}</select></label>${formFooter('移动')}`,{onSubmit:async data=>{await browser.moveBookmarkFolder(id,data.get('parentId'));collapsedFolders.delete(data.get('parentId'));toast('文件夹已移动');}});break;}
    case 'move-bookmark':{const b=state.bookmarks.find(b=>b.id===id);dialog('移动书签',`<label class="form-field"><span>目标书签文件夹</span><select name="parentId" required>${folderOptions(b?.parentId)}</select></label>${formFooter('移动')}`,{onSubmit:async data=>{await browser.moveBookmark(id,data.get('parentId'));toast('书签已移动');}});break;}
    case 'delete-bookmark-folder':{const f=bookmarkFolders.find(f=>f.id===id);if(!f||f.protected||f.readOnly)throw new Error('浏览器内置或托管文件夹不能删除');const ids=folderIds(bookmarkFolders,id),count=state.bookmarks.filter(b=>ids.has(b.parentId)).length;confirmDialog('删除书签文件夹',`将删除「${f.title}」及其子文件夹、${count} 个书签，之后可在回收站恢复。保存的标签组继续保留。`,async()=>{const value=await browser.snapshotBookmarkFolder(id);recycle(state,'bookmark-folder',value);const entry=state.trash[0];await persist();try{await browser.deleteBookmarkFolder(id,value);}catch(error){state.trash=state.trash.filter(t=>t.id!==entry.id);await persist();throw error;}if(ids.has(bookmarkFolder))await selectBookmarkFolder('all');toast('文件夹与书签已移入回收站');},'移入回收站');break;}
    case 'restore-trash':{const entry=state.trash.find(t=>t.id===id);if(entry?.kind==='bookmark-folder'){await browser.restoreBookmarkFolder(entry.value);state.trash=state.trash.filter(t=>t.id!==id);}else if(entry?.kind==='bookmark'){const parentId=bookmarkFolders.some(f=>f.id===entry.value.parentId)?entry.value.parentId:bookmarkFolders[0]?.id;await browser.saveBookmark({title:entry.value.title,url:entry.value.url},parentId);state.trash=state.trash.filter(t=>t.id!==id);}else restoreItem(state,id);toast('已恢复到工作台');break;}
    case 'purge-trash':confirmDialog('永久删除','此内容将永久移除，无法再从回收站恢复。',async()=>{state.trash=state.trash.filter(t=>t.id!==id);},'永久删除');break;
    case 'empty-trash':if(!state.trash.length)throw new Error('回收站已经是空的');confirmDialog('清空回收站','回收站中的所有内容将永久移除，此操作无法撤销。',async()=>{state.trash=[];toast('回收站已清空');},'永久清空');break;
    case 'clear-recent':state.recent=[];toast('访问记录已清空');break;
    case 'settings':settingsDialog();break;
    case 'snapshots':snapshotDialog();break;
    case 'create-snapshot':state.snapshots.unshift({id:uid(),name:new Date().toLocaleString('zh-CN'),createdAt:new Date().toISOString(),groups:structuredClone(state.groups),categories:structuredClone(state.categories),stash:structuredClone(state.stash),openTabs:tabs.map(normalizeTab)});state.snapshots=state.snapshots.slice(0,20);snapshotDialog();toast('快照已保存');break;
    case 'restore-snapshot':await restoreSnapshot(id);break;
    case 'delete-snapshot':state.snapshots=state.snapshots.filter(s=>s.id!==id);snapshotDialog();break;
    case 'refresh-browser':await refresh();toast('标签页列表已刷新');break;
    case 'sync':if(state.settings.syncProvider==='none')settingsDialog('sync');else await performSync();break;
    case 'import':dialog('导入标签与收藏',`<p class="dialog-description">支持本工具导出的 JSON、包含 tabs / tabList 的标签组 JSON，以及 OneTab 的“网址 | 标题”文本。</p><div class="help-box">导入会添加新的标签组，现有收藏会保留。浏览器书签会导入到“导入的浏览器书签”标签组。</div><div class="dialog-footer">${btn('','取消','close-dialog')}${btn('download','选择文件','choose-import','primary')}</div>`);break;
    case 'choose-import':document.querySelector('#import-file').click();break;
    case 'export':{const data={version:1,exportedAt:new Date().toISOString(),categories:state.categories,groups:state.groups,stash:state.stash,bookmarks:state.bookmarks,bookmarkFolders};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`qiye-backup-${new Date().toLocaleDateString('sv-SE')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('收藏备份已导出（标签组、暂存与书签）');break;}
    case 'reset-demo':if(extension)break;confirmDialog('重置演示工作台','恢复初始演示内容。当前标签组和暂存会自动保存为快照，可随时恢复。',async()=>{const backup={id:uid(),name:'重置前的演示快照',createdAt:new Date().toISOString(),groups:structuredClone(state.groups),categories:structuredClone(state.categories),stash:structuredClone(state.stash),openTabs:tabs.map(normalizeTab)};const snapshots=[backup,...state.snapshots];const preferences=state.settings;Object.assign(state,createDemoState());state.settings=preferences;state.snapshots=snapshots.slice(0,20);category='all';view='groups';history.replaceState(null,'','?view=groups');query='';selectedTabs.clear();selectedGroups.clear();selectedSaved.clear();toast('已恢复初始演示，之前的内容已保存为快照');},'恢复初始演示');break;
    case 'close-dialog':closeOverlay();break;
  }
  await persist();render();
}

document.addEventListener('click',async event=>{
  const preference=event.target.closest('button[data-pref]');
  if(preference){const key=preference.dataset.pref;settingsDraft[key]=!settingsDraft[key];render();return;}
  const button=event.target.closest('[data-action]');
  if(!button){if(!event.target.closest('.menu')&&!event.target.closest('dialog')&&overlay.querySelector('.menu'))closeOverlay();return;}
  if(button.disabled)return;
  const {action,id=''}=button.dataset;
  if(button.closest('.menu'))closeOverlay();
  try{await dispatch(action,id,button,event);}catch(error){toast(error.message||'操作未完成，请重试',true);await refresh();}
});
function updateDraftInput(el){
  if(el.dataset.secret){secretDraft[el.dataset.secret]=el.value;return true;}
  if(el.dataset.rule!==undefined){const rule=settingsDraft.titleRules[Number(el.dataset.rule)];if(rule)rule[el.dataset.ruleKey]=el.value;return true;}
  if(el.dataset.time!==undefined){const window=settingsDraft.syncWindows[Number(el.dataset.time)];if(window)window[el.dataset.timeKey]=el.value;return true;}
  if(el.dataset.pref&& !['checkbox','radio'].includes(el.type)){settingsDraft[el.dataset.pref]=el.type==='number'?Number(el.value):el.value;return true;}
  return false;
}
function showDirtyState(){const bar=document.querySelector('.settings-savebar');if(!bar)return;const dirty=settingsDirty();bar.querySelector('strong').textContent=settingsDraft.language==='en'?(dirty?'You have unsaved changes':'All preferences are saved'):(dirty?'有尚未保存的更改':'所有设置已保存');bar.querySelector('[data-action=settings-discard]').disabled=!dirty;bar.querySelector('span').className=dirty?'unsaved-dot':'saved-dot';const preview=document.querySelector('[data-name-preview]');if(preview)preview.textContent=groupName([{url:'https://example.com'}],settingsDraft);}
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='settings-search'||(el.id==='global-search'&&view==='settings')){settingsFilter=el.value;render();return;}
  if(updateDraftInput(el)){showDirtyState();return;}
  if(el.id==='global-search'){const value=el.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=value;render();},state.settings.searchDelay);}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  try{
    if(el.id==='preferences-file'&&el.files[0]){if(el.files[0].size>200000)throw new Error('配置文件过大，请使用偏好配置 JSON');settingsDraft=importPreferences(await el.files[0].text());secretDraft={};el.value='';view='settings';render();toast('配置已载入，保存后生效；自动同步保持关闭');}
    else if(el.dataset.pref){const key=el.dataset.pref;if(el.type==='checkbox'){const values=new Set(settingsDraft[key]);el.checked?values.add(el.value):values.delete(el.value);settingsDraft[key]=[...values];}else settingsDraft[key]=el.type==='number'?Number(el.value):el.value;render();}
    else if(updateDraftInput(el)){showDirtyState();}
    else if(el.matches('[data-select-tab]')){const id=el.dataset.selectTab;el.checked?selectedTabs.add(id):selectedTabs.delete(id);render();}
    else if(el.matches('[data-select-window]')){visibleTabs().filter(t=>String(t.windowId)===el.dataset.selectWindow).forEach(t=>el.checked?selectedTabs.add(String(t.id)):selectedTabs.delete(String(t.id)));render();}
    else if(el.matches('[data-select-all-tabs]')){visibleTabs().forEach(t=>el.checked?selectedTabs.add(String(t.id)):selectedTabs.delete(String(t.id)));render();}
    else if(el.matches('[data-select-group]')){el.checked?selectedGroups.add(el.dataset.selectGroup):selectedGroups.delete(el.dataset.selectGroup);render();}
    else if(el.matches('[data-select-all-groups]')){filteredGroups().forEach(g=>el.checked?selectedGroups.add(g.id):selectedGroups.delete(g.id));render();}
    else if(el.matches('[data-select-saved]')){el.checked?selectedSaved.add(el.dataset.selectSaved):selectedSaved.delete(el.dataset.selectSaved);render();}

    else if(el.id==='sort-select'){sort=el.value;render();}
    else if(el.matches('[data-window-scope]')){const wasDirty=settingsDirty(),previous=state.settings.tabWindowScope;state.settings.tabWindowScope=el.value;allWindows=el.value==='all';if(!wasDirty||settingsDraft.tabWindowScope===previous)settingsDraft.tabWindowScope=el.value;await writePreferences(state.settings);await persist();await refresh();}
    else if(el.id==='import-file'&&el.files[0]){
      const file=el.files[0];if(file.size>10*1024*1024)throw new Error('文件过大，请使用 10 MB 以内的备份');
      const text=await file.text();const result=parseImport(text);
      for(const c of result.categories)if(!state.categories.some(x=>x.id===c.id))state.categories.push(c);
      for(const g of result.groups)if(!state.categories.some(c=>c.id===g.categoryId))g.categoryId='inbox';
      state.groups.unshift(...result.groups);state.stash.push(...(result.stash||[]));
      if(result.bookmarks?.length)state.groups.push(makeGroup('导入的浏览器书签','inbox',result.bookmarks));
      closeOverlay();view='groups';category='all';query='';await persist();render();toast(`已导入 ${result.groups.length} 个标签组`);el.value='';
    }
  }catch(error){toast(error.message,true);el.value=el.id==='import-file'?'':el.value;}
});
document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase(),mod=event.metaKey||event.ctrlKey,shortcut=state.settings.searchShortcut;
  if(shortcut==='mod+k'&&mod&&!event.shiftKey&&key==='k'||shortcut==='alt+k'&&event.altKey&&key==='k'||shortcut==='mod+shift+f'&&mod&&event.shiftKey&&key==='f'){event.preventDefault();document.querySelector(view==='settings'?'#settings-search':'#global-search')?.focus();}
  if(event.key==='Escape'){if(overlay.innerHTML)closeOverlay();else if(mobileOpen){mobileOpen=false;render();}else if(query){query='';render();}}
  if(event.target.closest('.menu')&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const items=[...overlay.querySelectorAll('[role=menuitem]')],index=items.indexOf(document.activeElement);items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}
});
document.addEventListener('contextmenu',event=>{const folder=event.target.closest('[data-folder-menu]');if(!folder)return;event.preventDefault();folderMenu(folder,folder.dataset.folderMenu);});

document.addEventListener('dragstart',event=>{
  const item=event.target.closest('[data-drag]');if(!item)return;
  if(item.dataset.source==='recent'){event.preventDefault();return;}
  dragData={type:item.dataset.drag,id:item.dataset.id,source:item.dataset.source};
  if(dragData.type==='live'&&selectedTabs.has(dragData.id))dragData.ids=[...selectedTabs];
  event.dataTransfer.setData('application/x-qiye',JSON.stringify(dragData));event.dataTransfer.setData('text/plain',dragData.id);event.dataTransfer.effectAllowed='copyMove';item.classList.add('dragging');document.body.classList.add('drag-active');
});
document.addEventListener('dragenter',event=>{if(dragData&&event.target.closest('[data-drop]'))event.preventDefault();});
document.addEventListener('dragover',event=>{const target=event.target.closest('[data-drop]');if(target&&dragData){event.preventDefault();event.dataTransfer.dropEffect=(target.dataset.drop==='bookmark-folder'&&['live','saved','group'].includes(dragData.type)||['live','bookmark'].includes(dragData.type)&&['group','stash','saved-tab','new-group'].includes(target.dataset.drop))?'copy':'move';document.querySelectorAll('.drop-over').forEach(el=>{if(el!==target)el.classList.remove('drop-over');});target.classList.add('drop-over');}});
document.addEventListener('dragleave',event=>{const target=event.target.closest('[data-drop]');if(target&&!target.contains(event.relatedTarget))target.classList.remove('drop-over');});
document.addEventListener('dragend',()=>{dragData=null;document.querySelectorAll('.dragging,.drop-over').forEach(el=>el.classList.remove('dragging','drop-over'));document.body.classList.remove('drag-active');});
document.addEventListener('drop',async event=>{
  const target=event.target.closest('[data-drop]');if(!target||!dragData)return;event.preventDefault();const data=dragData;dragData=null;document.querySelectorAll('.drop-over,.dragging').forEach(el=>el.classList.remove('drop-over','dragging'));document.body.classList.remove('drag-active');
  const drop=target.dataset.drop,to=target.dataset.target;
  try{
    if(syncBusy)throw new Error('同步正在进行，请稍后再拖动数据');
    const liveItems=data.type==='live'?(data.ids||[data.id]).map(live):[];
    if(drop==='bookmark-folder'){
      const parentId=to||preferredFolder();
      if(data.type==='bookmark-folder')await browser.moveBookmarkFolder(data.id,parentId);
      else if(data.type==='bookmark')await browser.moveBookmark(data.id,parentId);
      else if(data.type==='group'){const g=group(data.id);const result=await browser.copyToBookmarks(g.tabs,parentId,{name:g.name,dedupe:state.settings.duplicateTabs==='dedupe'});toast(`已保存 ${result.count} 个浏览器书签，原标签组保留`);}
      else if(data.type==='live'||data.type==='saved'){const items=data.type==='live'?collectableTabs(liveItems,state.settings).map(t=>prepareTab(t,state.settings)):[findSaved(data.id)];const result=await browser.copyToBookmarks(items,parentId,{dedupe:state.settings.duplicateTabs==='dedupe'});toast(result.count?`已保存 ${result.count} 个浏览器书签`:'这些链接已在目标书签文件夹中');}
      else throw new Error('请拖入网址、标签组或书签文件夹');
      collapsedFolders.delete(parentId);
      if(data.type==='bookmark-folder'||data.type==='bookmark')toast('浏览器书签已移动');
    }else if(data.type==='bookmark-folder')throw new Error('请将文件夹拖入另一个书签文件夹');
    else if(data.type==='group'){
      const g=group(data.id);assertUnlocked(g);
      if(drop==='group'&&to!==data.id){assertUnlocked(group(to));state.groups.splice(state.groups.indexOf(g),1);state.groups.splice(state.groups.findIndex(g=>g.id===to),0,g);sort='default';toast('标签组顺序已更新');}
      else throw new Error('将标签组拖到其他标签组前排序，或拖到书签文件夹保存');
    }else if(drop==='stash'||drop==='group'||drop==='saved-tab'){
      const destination=drop==='stash'?'stash':to;
      if(data.type==='live')await saveLive(liveItems,destination);
      else if(data.type==='saved'){moveSavedTab(state,data.id,data.source,destination,drop==='saved-tab'?target.dataset.id:undefined);toast('标签已移动');}
      else if(data.type==='bookmark'){const b=state.bookmarks.find(b=>b.id===data.id);if(destination!=='stash')assertUnlocked(group(destination));appendTabs(destination==='stash'?state.stash:group(destination).tabs,[b],state.settings);toast('书签已收藏到标签组');}
      if(destination!=='stash')expanded.add(destination);
    }else if(drop==='new-group'){
      const item=data.type==='saved'?findSaved(data.id):data.type==='bookmark'?state.bookmarks.find(b=>b.id===data.id):liveItems[0];
      if(data.type==='live'){const accepted=collectableTabs(liveItems,state.settings);if(!accepted.length)throw new Error('没有符合过滤条件的标签');liveItems.splice(0,liveItems.length,...accepted);}
      if(data.type==='saved'&&data.source!=='stash')assertUnlocked(group(data.source));
      const g=makeGroup(data.type==='live'&&liveItems.length>1?'新收集的标签':item?.title||'新标签组','inbox',data.type==='live'||data.type==='saved'?[]:[item]);insertGroup(state,g);if(data.type==='live')appendTabs(g.tabs,liveItems,state.settings);
      if(data.type==='saved')moveSavedTab(state,data.id,data.source,g.id);
      expanded.add(g.id);if(data.type==='live'&&state.settings.closeAfterSave){await persist();await operateTabs(liveItems,'close');}toast('已创建标签组');
    }else if(drop==='native-group'&&data.type==='live'){await browser.nativeGroup(liveItems,'',Number(to));toast('已加入浏览器标签组');}
    else if(drop==='live-tab'&&data.type==='live'&&data.id!==to){await browser.reorderTab(live(data.id),live(to));toast('浏览器标签顺序已更新');}
    else throw new Error('请拖到标签组、暂存区或书签文件夹中');
    await persist();await refresh();
  }catch(error){toast(error.message,true);render();}
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(state.settings.theme==='auto'||view==='settings'&&settingsDraft.theme==='auto')render();});
if(extension)api.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  const dirty=settingsDirty();
  if(changes[PREFS_KEY]?.newValue){state.settings=normalizeSettings(changes[PREFS_KEY].newValue);if(!dirty)settingsDraft=structuredClone(state.settings);const nextScope=state.settings.tabWindowScope==='all';if(nextScope!==allWindows){allWindows=nextScope;refresh().catch(e=>toast(e.message,true));}}
  const incoming=changes[STORAGE_KEY]?.newValue;
  if(incoming)for(const key of ['categories','groups','stash','trash','snapshots','recent'])if(Array.isArray(incoming[key]))state[key]=incoming[key];
  if(changes[SYNC_STATUS_KEY]?.newValue)syncStatus=changes[SYNC_STATUS_KEY].newValue;
  previousCounts=new Map(state.groups.map(g=>[g.id,g.tabs.length]));
  if(state.settings.expandAll)state.groups.forEach(g=>expanded.add(g.id));
  if(view!=='settings')render();
});
try{
  syncStatus=extension?(await api.storage.local.get(SYNC_STATUS_KEY))[SYNC_STATUS_KEY]||{}:JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)||'{}');
  await refresh();browser.listen(()=>refresh().catch(e=>toast(e.message,true)));configureAutoSync();
  if(route==='search')document.querySelector('#global-search')?.focus();
  if(extension&&new URLSearchParams(location.search).has('collect')){
    const pending=(await api.storage.session.get('pendingCollection')).pendingCollection;
    if(pending){const results=await Promise.allSettled(pending.tabIds.map(id=>api.tabs.get(id)));const incoming=results.filter(r=>r.status==='fulfilled').map(r=>r.value);if(incoming.length)groupForm(null,incoming,pending.scope);await api.storage.session.remove('pendingCollection');}
  }
}catch(error){render();toast(`无法读取浏览器数据：${error.message}`,true);}

import {formatNamespace,rebrandContent,BRAND_TITLE} from './brand.js';
export const STORAGE_KEY='qiye-workspace-v1';
export const PREFS_KEY='qiye-preferences-v2';
export const SECRETS_KEY='qiye-sync-credentials-v1';
export const DEFAULT_SETTINGS={
  language:'zh-CN',theme:'light',startupOpen:false,newWindowOpen:false,pinManager:false,restoreOnStartup:false,startPage:'groups',
  askDestination:false,includePinned:false,excludeUrls:'about:blank\nchrome://newtab/\nedge://newtab/\nabout:newtab',openAfterSave:true,singleNewGroup:true,closeAfterSave:false,closeScopes:[],duplicateGroups:'new',duplicateTabs:'dedupe',preserveNativeGroups:true,
  groupNewWindow:false,removeAfterOpen:false,sleepAfterOpen:false,backgroundModifier:'alt',foregroundModifier:'none',openOrder:'forward',namedNativeGroup:true,unnamedNativeGroup:true,avoidDuplicateOpen:false,
  managerTitle:BRAND_TITLE,groupNameTemplate:'收集 · {{date}} {{time}}',titleRules:[],titleRulesEnabled:false,
  removeEmptyGroups:false,confirmDeleteTab:false,confirmDeleteGroup:true,confirmClose:false,copyTemplate:'{{url}} | {{title}}',groupInsert:'top',tabInsert:'bottom',
  compact:false,defaultLayout:'list',defaultSort:'default',tabWindowScope:'all',expandAll:false,showUrls:true,showSiteIcons:true,showGroupDates:true,showCounts:true,showBrowserPanel:true,showStash:true,showHints:true,stickyHeader:false,
  groupActions:['open','star'],showBadge:true,contextMenus:true,contextActions:['manager','save-current','save-all','save-all-windows','save-group','save-others','save-left','save-right','search','sleep','snapshot','sync'],popupEnabled:false,popupModules:['info','navigation','actions','theme','tabs'],
  newTabMode:'browser',homeSearch:'bing',homeClock:true,homeBookmarks:true,
  syncProvider:'none',webdavUrl:'',gistId:'',syncPreferences:true,autoSync:false,syncInterval:30,syncWindows:[{start:'00:00',end:'23:59'}],syncMode:'merge',
  searchGlobal:true,searchSources:['groups','tabs','bookmarks','stash'],searchFields:['title','url','folder'],searchScope:'all',searchCase:false,searchMode:'includes',searchLimit:50,searchDelay:120,searchShortcut:'mod+k'
};

const f=(key,type,zh,en,description='',options=[],extra={})=>({key,type,zh,en,description,options,...extra});
const yesNo=[];
export const SETTINGS_SECTIONS=[
 {id:'general',icon:'settings',zh:'通用配置',en:'General',intro:'从启动方式到外观，让工作台符合你的使用习惯。',fields:[
  f('language','select','界面语言','Interface language','提供完整设置文案与主要操作的中英文界面。',[['zh-CN','简体中文'],['en','English']]),
  f('theme','segments','主题模式','Appearance','自动模式跟随系统外观。',[['light','浅色'],['dark','深色'],['auto','跟随系统']]),
  f('startPage','select','默认打开的页面','Default page','每次进入工作台时优先显示。',[['groups','收藏标签组'],['tabs','当前标签页'],['bookmarks','浏览器书签']]),
  f('startupOpen','toggle','启动浏览器时打开工作台','Open workspace on browser startup','在浏览器启动后打开一个工作台。',yesNo,{native:true}),
  f('newWindowOpen','toggle','新开窗口时打开工作台','Open workspace in new windows','仅处理普通浏览窗口，工作台不会重复打开。',yesNo,{native:true}),
  f('pinManager','toggle','固定工作台标签页','Pin workspace tab','保存后立即应用到已打开的工作台。',yesNo,{native:true}),
  f('restoreOnStartup','toggle','启动时恢复上次浏览现场','Restore the previous browsing session','只补回尚未打开的网页；与浏览器自己的会话恢复配合去重。',yesNo,{native:true})
 ]},
 {id:'saving',icon:'archive',zh:'保存标签配置',en:'Saving tabs',intro:'决定收集哪些标签、放在哪里，以及保存后如何处理。',fields:[
  f('askDestination','toggle','保存前选择目标位置','Choose destination before saving','暂存操作除外；快捷保存时先填写标签组名称。'),
  f('includePinned','toggle','允许收集固定标签','Include pinned tabs','关闭时会跳过固定标签，防止常用页面被收起。'),
  f('excludeUrls','textarea','不收集的网址与域名','Excluded URLs and domains','每行一条。支持完整网址、example.com 和 *.example.com；不会影响手动添加收藏。'),
  f('openAfterSave','toggle','快捷保存后打开工作台','Open workspace after quick save','适用于浏览器右键菜单、快捷键和扩展面板。',yesNo,{native:true}),
  f('singleNewGroup','toggle','单标签快捷保存时新建标签组','Create a group when saving one tab','关闭后加入最近的未锁定分组。'),
  f('closeAfterSave','toggle','保存成功后关闭原标签','Close tabs after saving','先写入本地存储，再关闭成功保存的标签。'),
  f('closeScopes','checks','仅为这些快捷操作额外关闭标签','Close tabs for selected quick actions','上方开关开启时所有保存操作都会关闭原标签。',[['current','当前标签'],['all','当前窗口全部'],['all-windows','所有窗口'],['group','当前原生组'],['others','其他标签'],['left','左侧标签'],['right','右侧标签']]),
  f('duplicateGroups','segments','同名标签组的处理方式','Duplicate group names','合并时只选择收藏列表中未锁定的同名标签组。',[['new','保留为新组'],['merge','合并到已有组']]),
  f('duplicateTabs','segments','重复链接的处理方式','Duplicate URLs','适用于保存、暂存、合并和拖入标签。',[['dedupe','自动去重'],['keep','保留重复']]),
  f('preserveNativeGroups','toggle','快捷保存时保留浏览器分组','Preserve native groups when saving','批量收集时，按浏览器原生标签组分别保存。')
 ]},
 {id:'opening',icon:'external',zh:'打开标签配置',en:'Opening tabs',intro:'从收藏回到浏览时，保留熟悉的分组和打开方式。',fields:[
  f('groupNewWindow','toggle','整组在新窗口打开','Open groups in a new window','关闭时在当前浏览窗口打开。'),
  f('removeAfterOpen','toggle','打开后移出收藏列表','Remove saved tabs after opening','移入回收站，仍可恢复；锁定组里的标签始终保留。'),
  f('sleepAfterOpen','toggle','批量打开后休眠后台标签','Discard tabs after opening a group','正在使用的标签保持活跃，后台标签释放内存。'),
  f('avoidDuplicateOpen','toggle','优先切换到已打开的相同网址','Reuse already-open URLs','单标签和整组打开均会检查已打开的网址。'),
  f('backgroundModifier','select','后台打开使用的修饰键','Modifier for background opening','按住修饰键点击收藏链接，工作台保持在前台。',[['alt','⌥ Alt'],['mod','⌘ / Ctrl'],['shift','⇧ Shift'],['none','无修饰键']]),
  f('foregroundModifier','select','前台打开使用的修饰键','Modifier for foreground opening','与后台打开修饰键不能相同。',[['none','无修饰键'],['alt','⌥ Alt'],['mod','⌘ / Ctrl'],['shift','⇧ Shift']]),
  f('openOrder','segments','批量打开顺序','Group opening order','按收藏顺序或从后向前打开。',[['forward','默认顺序'],['reverse','反向顺序']]),
  f('namedNativeGroup','toggle','已命名收藏恢复为浏览器分组','Restore named browser groups','整组重新打开后创建原生标签组。'),
  f('unnamedNativeGroup','toggle','自动命名收藏恢复为浏览器分组','Restore automatically named browser groups','针对快捷收集生成的自动命名组。')
 ]},
 {id:'titles',icon:'edit',zh:'网页标题配置',en:'Titles and naming',intro:'统一页面标题与收集命名，按需要清理网页标题。',fields:[
  f('managerTitle','text','工作台页面标题','Workspace page title','显示在浏览器标签栏中，不会修改品牌名称。'),
  f('groupNameTemplate','text','自动创建标签组的名称','Automatic group name','支持 {{date}}、{{time}}、{{domain}}、{{count}}。'),
  f('titleRulesEnabled','toggle','启用标题清理规则','Enable title cleanup rules','只在新收集网页时生效，不改动原来的网页标题或已有收藏。'),
  f('titleRules','rules','标题清理规则','Title cleanup rules','按顺序替换文字，域名留空时匹配所有网站；使用文字替换避免复杂正则造成卡顿。')
 ]},
 {id:'operations',icon:'pointer',zh:'其他操作配置',en:'Actions and protection',intro:'减少重复操作，并给重要内容留好保护。',fields:[
  f('removeEmptyGroups','toggle','标签移空后自动移除空组','Remove groups after their last tab is removed','空组进入回收站；锁定组和刚创建的空组不会被移除。'),
  f('confirmDeleteTab','toggle','删除收藏标签前确认','Confirm deleting saved tabs','删除后仍可从回收站恢复。'),
  f('confirmDeleteGroup','toggle','删除标签组前确认','Confirm deleting groups','适用于单组和批量删除。'),
  f('confirmClose','toggle','关闭浏览器标签前确认','Confirm closing browser tabs','适用于手动关闭；保存后自动关闭遵循保存配置。'),
  f('copyTemplate','template','复制链接的模板','Copy links template','支持 {{url}}、{{title}}；每个链接占一行。'),
  f('groupInsert','segments','新建或移动组的插入位置','Insert groups at','明确拖到某一分组前时，以拖动目标为准。',[['top','顶部'],['bottom','底部']]),
  f('tabInsert','segments','新增或移动标签的插入位置','Insert tabs at','明确拖到某个标签前时，以拖动目标为准。',[['top','顶部'],['bottom','底部']])
 ]},
 {id:'display',icon:'grid',zh:'展示配置',en:'Display',intro:'保留需要的信息和按钮，搭建自己的整理界面。',fields:[
  f('defaultLayout','segments','默认收藏布局','Default collection layout','仍可在列表页临时切换。',[['list','列表'],['grid','卡片']]),
  f('defaultSort','select','默认排序','Default sort order','手动拖动排序时会回到自定义顺序。',[['default','自定义顺序'],['newest','最近创建'],['name','名称升序'],['name-desc','名称降序']]),
  f('tabWindowScope','segments','打开标签的窗口范围','Open tab window scope','默认展示同一浏览器资料下的所有窗口，按窗口分区；在标签列表中切换时会自动记住。',[['all','所有窗口'],['current','当前窗口']]),
  f('compact','toggle','紧凑布局','Compact layout','缩小列表间距，在一屏显示更多内容。'),
  f('expandAll','toggle','进入列表时展开所有标签组','Expand all groups on entry','关闭时默认折叠；仍可手动展开。'),
  f('showUrls','toggle','显示标签网址','Show URLs','控制收藏列表中的网址信息。'),
  f('showSiteIcons','toggle','显示站点图标','Show site icons'),
  f('showGroupDates','toggle','显示分组创建时间','Show group creation dates'),
  f('showCounts','toggle','显示导航和分组数量','Show item counts'),
  f('showBrowserPanel','toggle','显示右侧浏览器标签区','Show browser side panel','在已保存会话、书签等页面显示，便于拖拽整理；当前标签页始终使用主列表。'),
  f('showStash','toggle','显示右侧暂存卡片','Show the stash card','左侧暂存页面仍可使用。'),
  f('showHints','toggle','显示整理提示','Show organizing tips'),
  f('stickyHeader','toggle','滚动时固定顶部工具栏','Keep toolbar visible while scrolling'),
  f('groupActions','checks','标签组常用操作按钮','Quick group actions','未选择的操作仍保留在“更多”菜单里，避免失去入口。',[['open','打开'],['sleep','休眠'],['close','关闭'],['new-above','上方新建'],['new-below','下方新建'],['lock','锁定'],['star','星标'],['move','存入书签'],['clone','克隆'],['copy','复制链接'],['dedupe','去重'],['sort-asc','名称升序'],['sort-desc','名称降序'],['delete','删除']]),
  f('showBadge','toggle','扩展图标显示打开的标签数','Show tab count on extension badge','不计工作台和扩展内部页面。',yesNo,{native:true}),
  f('contextMenus','toggle','启用浏览器右键菜单','Enable browser context menus','在网页或扩展图标右键菜单提供快捷操作。',yesNo,{native:true}),
  f('contextActions','checks','右键菜单项目','Context menu items','保存后立即更新浏览器右键菜单。',[['manager','打开工作台'],['save-current','保存当前标签'],['save-all','保存当前窗口'],['save-all-windows','保存所有窗口'],['save-group','保存当前组'],['save-others','保存其他标签'],['save-left','保存左侧标签'],['save-right','保存右侧标签'],['search','全局搜索'],['sleep','休眠后台标签'],['snapshot','创建快照'],['sync','立即同步']],{native:true}),
  f('popupEnabled','toggle','点击扩展图标显示快捷面板','Show a popup when clicking the extension','关闭时点击图标直接打开工作台。',yesNo,{native:true}),
  f('popupModules','checks','快捷面板展示模块','Popup modules','用于扩展图标弹出的快捷面板。',[['info','扩展信息'],['navigation','页面导航'],['actions','快捷保存'],['theme','外观切换'],['tabs','打开的标签']],{native:true})
 ]},
 {id:'newtab',icon:'tabs',zh:'新标签页配置',en:'New tab page',intro:'保留浏览器默认页面，或把新的浏览从工作台开始。',fields:[
  f('newTabMode','segments','打开新标签页时','When a new tab is created','选择自定义页面后，扩展将新标签转入所选页面；关闭后恢复不干预。',[['browser','浏览器默认'],['home','极简开始页'],['workspace','标签工作台']],{native:true}),
  f('homeSearch','select','开始页搜索引擎','Start-page search engine','在极简开始页输入关键词时使用。',[['bing','Bing'],['google','Google'],['baidu','百度'],['duckduckgo','DuckDuckGo']]),
  f('homeClock','toggle','开始页显示时钟','Show a clock on the start page'),
  f('homeBookmarks','toggle','开始页显示最近收藏','Show saved links on the start page')
 ]},
 {id:'sync',icon:'refresh',zh:'同步配置',en:'Sync',intro:'把收藏带到其他设备。连接信息单独保存在本机，凭据不进入配置导出。',fields:[
  f('syncProvider','segments','同步服务','Sync service','选择服务并保存连接配置后，才会发起同步。',[['none','仅本地'],['webdav','WebDAV'],['gist','GitHub Gist']]),
  f('webdavUrl','url','WebDAV 文件地址','WebDAV file URL','填写完整 JSON 文件地址，例如 https://example.com/dav/qiye.json。',[],{when:['syncProvider','webdav']}),
  f('gistId','text','Gist ID','Gist ID','已有 Gist 的 ID；留空则首次同步时创建不公开列出的 Secret Gist。',[],{when:['syncProvider','gist']}),
  f('syncPreferences','toggle','同步收藏时包含偏好设置','Include preferences in sync','不包含同步地址、凭据、自动同步计划和本机启动行为。'),
  f('autoSync','toggle','开启自动同步','Enable automatic sync','扩展关闭工作台后仍通过浏览器定时任务执行；网页演示仅在页面打开时执行。'),
  f('syncInterval','number','自动同步间隔（分钟）','Automatic sync interval (minutes)','支持 1–1440 分钟。',[],{min:1,max:1440}),
  f('syncWindows','windows','自动同步开启时段','Automatic sync time windows','使用本机时间，支持跨午夜；可添加多个时段。'),
  f('syncMode','select','同步方式','Sync strategy','覆盖拉取前会自动创建本地恢复快照。',[['merge','合并后推送（本机同名字段优先）'],['pull','拉取并替换本地收藏'],['push','以本地收藏覆盖远端']])
 ]},
 {id:'search',icon:'search',zh:'全局搜索配置',en:'Search',intro:'决定搜索哪里、匹配哪些内容，以及怎样快速找到结果。',fields:[
  f('searchGlobal','toggle','搜索时汇总不同来源的结果','Search across all sources','关闭时只筛选当前页面。'),
  f('searchSources','checks','搜索范围','Search sources','至少保留一个来源。',[['groups','收藏标签组'],['tabs','打开的标签'],['bookmarks','浏览器书签'],['stash','暂存标签']]),
  f('searchFields','checks','匹配内容','Match fields','至少保留一个匹配字段。',[['title','标题与组名'],['url','网址'],['folder','书签文件夹路径']]),
  f('searchScope','segments','书签搜索范围','Bookmark search scope','在书签页搜索时，可只查找当前文件夹及子文件夹。',[['all','全部书签'],['current','当前文件夹及子文件夹']]),
  f('searchMode','select','匹配方式','Match mode','多关键词模式要求每个词都匹配。',[['includes','包含关键词'],['starts','以关键词开头'],['words','匹配所有关键词']]),
  f('searchCase','toggle','区分英文字母大小写','Case-sensitive search'),
  f('searchLimit','number','每个来源最多显示结果','Maximum results per source','支持 10–200 个结果。',[],{min:10,max:200}),
  f('searchDelay','number','输入响应间隔（毫秒）','Search debounce (milliseconds)','支持 0–1000 毫秒；减少大收藏库搜索时的重复渲染。',[],{min:0,max:1000}),
  f('searchShortcut','select','页面内搜索快捷键','Search shortcut','仅在工作台页面生效。',[['mod+k','⌘ / Ctrl + K'],['alt+k','Alt + K'],['mod+shift+f','⌘ / Ctrl + Shift + F'],['none','关闭']])
 ]}
];

export const SETTING_FIELDS=SETTINGS_SECTIONS.flatMap(s=>s.fields);
const enums=Object.fromEntries(SETTING_FIELDS.filter(f=>f.options.length).map(f=>[f.key,f.options.map(o=>o[0])]));
export function normalizeSettings(input={}){
  input={...input,searchFields:Array.isArray(input.searchFields)?input.searchFields.map(key=>key==='category'?'folder':key):undefined};
  const out=structuredClone(DEFAULT_SETTINGS);
  for(const key of Object.keys(out)){
    const v=input[key];if(v===undefined)continue;
    if(Array.isArray(out[key])){if(Array.isArray(v))out[key]=structuredClone(v);}
    else if(typeof v===typeof out[key])out[key]=v;
    if(enums[key]){if(Array.isArray(out[key]))out[key]=[...new Set(out[key].filter(v=>enums[key].includes(v)))];else if(!enums[key].includes(out[key]))out[key]=DEFAULT_SETTINGS[key];}
  }
  for(const f of SETTING_FIELDS)if(f.type==='number')out[f.key]=Math.round(Math.min(f.max,Math.max(f.min,Number.isFinite(out[f.key])?out[f.key]:DEFAULT_SETTINGS[f.key])));
  for(const key of ['searchSources','searchFields'])if(!out[key].length)out[key]=[...DEFAULT_SETTINGS[key]];
  if(out.backgroundModifier===out.foregroundModifier)out.backgroundModifier=out.foregroundModifier==='alt'?'mod':'alt';
  out.titleRules=out.titleRules.filter(r=>r&&typeof r.find==='string').slice(0,50).map(r=>({domain:String(r.domain||'').slice(0,250),find:r.find.slice(0,250),replace:String(r.replace||'').slice(0,250)}));
  out.syncWindows=out.syncWindows.filter(w=>w&&/^\d{2}:\d{2}$/.test(w.start)&&/^\d{2}:\d{2}$/.test(w.end)&&[w.start,w.end].every(t=>Number(t.slice(0,2))<24&&Number(t.slice(3))<60)).slice(0,12);
  if(!out.syncWindows.length)out.syncWindows=structuredClone(DEFAULT_SETTINGS.syncWindows);
  for(const key of ['managerTitle','groupNameTemplate','copyTemplate'])out[key]=out[key].trim().slice(0,500)||DEFAULT_SETTINGS[key];
  out.excludeUrls=out.excludeUrls.slice(0,10000);out.webdavUrl=out.webdavUrl.trim();out.gistId=out.gistId.trim();
  return out;
}
export function validateSettings(input){
  const s=normalizeSettings(input);
  if(input.backgroundModifier===input.foregroundModifier)throw new Error('前台和后台打开的修饰键不能相同');
  if(s.syncProvider==='webdav'&&s.webdavUrl){const url=new URL(s.webdavUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('请输入 HTTP(S) 文件地址，账号密码请填在单独的凭据栏');}
  if(s.gistId&&!/^[a-f0-9]+$/i.test(s.gistId))throw new Error('Gist ID 只能包含十六进制字符');
  if(s.autoSync&&(s.syncProvider==='none'||(s.syncProvider==='webdav'&&!s.webdavUrl)))throw new Error('请先配置同步服务，再开启自动同步');
  if(s.autoSync&&s.syncProvider==='gist'&&!s.gistId)throw new Error('请先手动同步一次生成 Gist ID，再开启自动同步');
  if(!input.searchSources?.length||!input.searchFields?.length)throw new Error('至少选择一个搜索来源和匹配字段');
  if(!s.copyTemplate.includes('{{url}}'))throw new Error('复制模板需要包含 {{url}}');
  return s;
}
const localKeys=new Set(['startupOpen','newWindowOpen','pinManager','restoreOnStartup','syncProvider','webdavUrl','gistId','autoSync','syncInterval','syncWindows','syncMode']);
export function portableSettings(settings){return Object.fromEntries(Object.entries(normalizeSettings(settings)).filter(([key])=>!localKeys.has(key)));}
export function exportPreferences(settings){return {schema:'qiye-preferences',version:2,exportedAt:new Date().toISOString(),preferences:normalizeSettings(settings)};}
export function importPreferences(text){const data=JSON.parse(text),namespace=formatNamespace(data.schema,'-preferences');if(!namespace||data.version!==2||!data.preferences||typeof data.preferences!=='object')throw new Error('请选择本工具导出的配置文件');return validateSettings({...DEFAULT_SETTINGS,...rebrandContent(data.preferences,namespace),autoSync:false});}
export function inSyncWindow(windows,date=new Date()){
  const time=`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  return windows.some(({start,end})=>start<=end?time>=start&&time<=end:time>=start||time<=end);
}

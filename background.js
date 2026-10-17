import {api,detectCapabilities,isNewTabUrl,requireSyncConsent} from './src/platform.js';
import {createEmptyState,uid} from './src/data.js';
import {readState,writeState,writePreferences,readCredentials} from './src/browser.js';
import {PREFS_KEY,inSyncWindow} from './src/settings.js';
import {collectableTabs,saveCollection} from './src/policies.js';
import {runSync,SYNC_STATUS_KEY} from './src/sync.js';

const managerUrl=api.runtime.getURL('index.html');
const capabilities=detectCapabilities(api);
const nativeGroups=()=>capabilities.nativeGroups?api.tabGroups.query({}):Promise.resolve([]);
const sessionKey='qiye-last-session';
let serial=Promise.resolve(),syncBusy=false,restoreBusy=false,captureTimer,badgeTimer;
const exclusive=fn=>{const next=serial.then(fn,fn);serial=next.catch(()=>{});return next;};
const load=()=>readState(createEmptyState());
const isManager=tab=>tab.url?.split('?')[0]===managerUrl;
async function openManager({windowId,route,collect=false}={}){
  const state=await load(),target=managerUrl+(collect?'?collect=1':route?`?view=${encodeURIComponent(route)}`:'');
  const existing=(await api.tabs.query(windowId?{windowId}:{})).find(isManager);
  if(existing){if(route||collect)await api.tabs.update(existing.id,{url:target,active:true,pinned:state.settings.pinManager});else await api.tabs.update(existing.id,{active:true,pinned:state.settings.pinManager});await api.windows.update(existing.windowId,{focused:true});return existing;}
  return api.tabs.create({url:target,active:true,pinned:state.settings.pinManager,...(windowId?{windowId}:{})});
}
export async function quickSave(scope='current',sourceTab){return exclusive(async()=>{
  const state=await load(),settings=state.settings,active=sourceTab||(await api.tabs.query({active:true,lastFocusedWindow:true}))[0];
  if(!active)throw new Error('没有可收集的浏览窗口');
  let tabs=(await api.tabs.query(scope==='all-windows'?{}:{windowId:active.windowId})).filter(t=>!isManager(t));
  if(scope==='current')tabs=tabs.filter(t=>t.id===active.id);
  if(scope==='group')tabs=tabs.filter(t=>active.groupId>=0?t.groupId===active.groupId:t.id===active.id);
  if(scope==='others')tabs=tabs.filter(t=>t.id!==active.id);
  if(scope==='left')tabs=tabs.filter(t=>t.index<active.index);
  if(scope==='right')tabs=tabs.filter(t=>t.index>active.index);
  tabs=collectableTabs(tabs,settings);if(!tabs.length)throw new Error('没有符合保存条件的标签页，请检查固定标签和网址过滤规则');
  if(settings.askDestination){await api.storage.session.set({pendingCollection:{tabIds:tabs.map(t=>t.id),scope}});await openManager({windowId:active.windowId,collect:true});return {message:'请在工作台选择保存位置'};}
  const preserveGroups=settings.preserveNativeGroups&&capabilities.nativeGroups;
  const groups=preserveGroups?await nativeGroups():[],batches=new Map();
  for(const tab of tabs){const key=preserveGroups&&tab.groupId>=0?`native-${tab.groupId}`:'ungrouped';if(!batches.has(key))batches.set(key,[]);batches.get(key).push(tab);}
  for(const batch of batches.values()){const native=preserveGroups&&batch[0].groupId>=0?groups.find(g=>g.id===batch[0].groupId):null;saveCollection(state,batch,{name:native?.title||undefined,automatic:true});}
  await writeState(state);
  let failed=0;if(settings.closeAfterSave||settings.closeScopes.includes(scope))for(const tab of tabs)try{await api.tabs.remove(tab.id);}catch{failed++;}
  if(settings.openAfterSave)await openManager({windowId:active.windowId});
  return {message:`已保存 ${tabs.length} 个标签页${failed?`，${failed} 个标签未能关闭`:''}`};
});}
async function updateBadge(){const state=await load();const tabs=(await api.tabs.query({})).filter(t=>!t.url?.startsWith(api.runtime.getURL('')));await api.action.setBadgeText?.({text:state.settings.showBadge&&tabs.length?String(tabs.length):''});await api.action.setBadgeBackgroundColor?.({color:'#c77750'});}
const menuLabels={manager:['打开标签工作台','Open tab workspace'],'save-current':['保存当前标签','Save current tab'],'save-all':['保存当前窗口全部标签','Save all tabs in this window'],'save-all-windows':['保存所有窗口标签','Save tabs in all windows'],'save-group':['保存当前原生标签组','Save current native group'],'save-others':['保存其他标签','Save other tabs'],'save-left':['保存左侧标签','Save tabs to the left'],'save-right':['保存右侧标签','Save tabs to the right'],search:['全局搜索','Global search'],sleep:['休眠后台标签','Sleep background tabs'],snapshot:['创建工作台快照','Create a snapshot'],sync:['立即同步收藏','Sync collections now']};
let preferenceSerial=Promise.resolve();
function applyPreferences(){const task=preferenceSerial.then(applyConfiguredPreferences);preferenceSerial=task.catch(()=>{});return task;}
async function applyConfiguredPreferences(){const state=await load(),s=state.settings;for(const alarm of await api.alarms.getAll?.()||[])if(alarm.name!=='qiye-sync'&&alarm.name.endsWith('-sync'))await api.alarms.clear(alarm.name);await api.contextMenus.removeAll();if(s.contextMenus)for(const id of s.contextActions.filter(id=>(id!=='sleep'||capabilities.sleep)&&(id!=='save-group'||capabilities.nativeGroups)))await api.contextMenus.create({id,title:menuLabels[id][s.language==='en'?1:0],contexts:['page','action']});await api.action.setPopup?.({popup:s.popupEnabled?'popup.html':''});for(const tab of(await api.tabs.query({})).filter(isManager))if(tab.pinned!==s.pinManager)await api.tabs.update(tab.id,{pinned:s.pinManager});await updateBadge();const alarm=await api.alarms.get('qiye-sync');if(!s.autoSync||s.syncProvider==='none')await api.alarms.clear('qiye-sync');else if(!alarm||alarm.periodInMinutes!==s.syncInterval)await api.alarms.create('qiye-sync',{delayInMinutes:s.syncInterval,periodInMinutes:s.syncInterval});}
async function captureSession(){if(restoreBusy)return;const state=await load();if(!state.settings.restoreOnStartup)return;const tabs=await api.tabs.query({}),groups=await nativeGroups();await api.storage.local.set({[sessionKey]:tabs.filter(t=>!isManager(t)&&/^https?:/.test(t.url||'')&&!t.incognito).slice(0,500).map(t=>({url:t.url,title:t.title,pinned:t.pinned,group:groups.find(g=>g.id===t.groupId)?.title||'',windowId:t.windowId}))});}
function scheduleUpdates(){clearTimeout(badgeTimer);badgeTimer=setTimeout(()=>updateBadge().catch(()=>{}),150);clearTimeout(captureTimer);captureTimer=setTimeout(()=>captureSession().catch(()=>{}),800);}
async function restoreSession(){restoreBusy=true;try{const cached=(await api.storage.local.get(sessionKey))[sessionKey]||[],open=await api.tabs.query({}),known=new Set(open.map(t=>t.url||t.pendingUrl)),restored=new Map();for(const item of cached){if(!/^https?:/.test(item.url)||known.has(item.url))continue;const tab=await api.tabs.create({url:item.url,active:false,pinned:Boolean(item.pinned)});known.add(item.url);if(capabilities.nativeGroups&&item.group&&!item.pinned){const key=`${item.windowId}:${item.group}`;if(!restored.has(key))restored.set(key,{title:item.group,ids:[]});restored.get(key).ids.push(tab.id);}}for(const g of restored.values()){const groupId=await api.tabs.group({tabIds:g.ids});await api.tabGroups.update(groupId,{title:g.title,color:'orange'});}}finally{restoreBusy=false;}}
async function remoteSync(){await requireSyncConsent();if(syncBusy)throw new Error('已有同步任务正在执行');syncBusy=true;try{return await exclusive(async()=>{const state=await load(),signature=JSON.stringify([state.groups,state.categories,state.stash,state.settings]);const status=await runSync(state,{credentials:await readCredentials()});const latest=await load();if(JSON.stringify([latest.groups,latest.categories,latest.stash,latest.settings])!==signature)throw new Error('本机内容在同步期间发生变化，已保留最新本机内容；请再次同步');state.trash=latest.trash;state.recent=latest.recent;await writeState(state);await writePreferences(state.settings);await api.storage.local.set({[SYNC_STATUS_KEY]:status});return status;});}catch(error){await api.storage.local.set({[SYNC_STATUS_KEY]:{ok:false,message:error.message,at:new Date().toISOString()}});throw error;}finally{syncBusy=false;}}
async function action(id,tab){if(id.startsWith('save-'))return quickSave(id.replace('save-',''),tab);if(id==='manager')return openManager();if(id==='search')return openManager({route:'search'});if(id==='sync')return remoteSync();if(id==='sleep'){if(!capabilities.sleep)throw new Error('此浏览器暂不支持标签休眠');const tabs=await api.tabs.query({active:false});let count=0;for(const t of tabs)if(!t.discarded&&!isManager(t))try{await api.tabs.discard(t.id);count++;}catch{}return {message:`已休眠 ${count} 个后台标签`};}if(id==='snapshot')return exclusive(async()=>{const state=await load();state.snapshots.unshift({id:uid(),name:new Date().toLocaleString(),createdAt:new Date().toISOString(),categories:structuredClone(state.categories),groups:structuredClone(state.groups),stash:structuredClone(state.stash),openTabs:(await api.tabs.query({})).filter(t=>!isManager(t)&&/^https?:/.test(t.url||'')).map(t=>({id:uid(),title:t.title,url:t.url}))});state.snapshots=state.snapshots.slice(0,20);await writeState(state);return {message:'快照已保存'};});}
api.action.onClicked.addListener(()=>openManager().catch(()=>{}));
api.commands.onCommand.addListener(command=>{const id={'open-manager':'manager','save-current':'save-current','save-window':'save-all','open-search':'search'}[command];if(id)action(id).catch(()=>{});});
api.contextMenus.onClicked.addListener((info,tab)=>{action(info.menuItemId,tab).catch(async error=>{await api.storage.local.set({'qiye-last-action-error':error.message});});});
api.runtime.onInstalled.addListener(()=>applyPreferences().catch(()=>{}));
api.runtime.onStartup.addListener(async()=>{await applyPreferences();const state=await load();if(state.settings.restoreOnStartup)await restoreSession();if(state.settings.startupOpen)await openManager();});
api.windows.onCreated.addListener(async window=>{if(window.type!=='normal')return;const state=await load();if(state.settings.newWindowOpen)await openManager({windowId:window.id});});
const redirecting=new Set();
async function redirectNewTab(tab){const url=tab.pendingUrl||tab.url||'';if(!isNewTabUrl(url)||redirecting.has(tab.id))return;redirecting.add(tab.id);try{const state=await load();if(state.settings.newTabMode==='browser')return;await api.tabs.update(tab.id,{url:api.runtime.getURL(state.settings.newTabMode==='workspace'?'index.html':'newtab.html')});}finally{redirecting.delete(tab.id);}}
let discardSerial=Promise.resolve();
function discardPending(id){const task=discardSerial.then(()=>processDiscard(id));discardSerial=task.catch(()=>{});return task;}
async function processDiscard(id){const pending=(await api.storage.session.get('pendingDiscards')).pendingDiscards||[];if(!pending.includes(id))return;let done=false;try{const tab=await api.tabs.get(id);if(tab.status==='complete'){if(!tab.active&&!tab.audible)await api.tabs.discard(id);done=true;}}catch{done=true;}if(done)await api.storage.session.set({pendingDiscards:pending.filter(t=>t!==id)});}
async function queueDiscards(ids){if(!capabilities.sleep)throw new Error('此浏览器暂不支持标签休眠');const pending=(await api.storage.session.get('pendingDiscards')).pendingDiscards||[];await api.storage.session.set({pendingDiscards:[...new Set([...pending,...ids])]});for(const id of ids)await discardPending(id);return {message:'后台标签将在加载完成后休眠'};}
api.tabs.onCreated.addListener(tab=>{scheduleUpdates();redirectNewTab(tab).catch(()=>{});});
api.tabs.onUpdated.addListener((id,info,tab)=>{scheduleUpdates();if(info.url)redirectNewTab(tab).catch(()=>{});if(info.status==='complete')discardPending(id).catch(()=>{});});
for(const event of [api.tabs.onRemoved,api.tabs.onMoved,api.tabs.onAttached,api.tabs.onDetached,api.tabs.onActivated])event.addListener(scheduleUpdates);
api.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[PREFS_KEY])applyPreferences().catch(()=>{});});
api.alarms.onAlarm.addListener(async alarm=>{if(alarm.name!=='qiye-sync')return;const state=await load();if(state.settings.autoSync&&inSyncWindow(state.settings.syncWindows))remoteSync().catch(()=>{});});
api.runtime.onMessage.addListener((message,sender,sendResponse)=>{if(sender.id!==api.runtime.id||!['action','sync','apply-preferences','discard-tabs'].includes(message?.type))return false;const task=message.type==='action'?action(message.action):message.type==='sync'?remoteSync():message.type==='discard-tabs'?queueDiscards(message.ids.filter(Number.isInteger)):applyPreferences();Promise.resolve(task).then(result=>sendResponse({ok:true,result}),error=>sendResponse({ok:false,error:error.message}));return true;});
applyPreferences().catch(()=>{});

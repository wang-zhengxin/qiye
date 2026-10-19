import {api,detectCapabilities,DEMO_CAPABILITIES} from './platform.js';
import {STORAGE_KEY as storageKey,PREFS_KEY,SECRETS_KEY,normalizeSettings} from './settings.js';
import {flattenBookmarkTree,folderIds,folderSnapshot,validateFolderMove,retireCategories} from './bookmarks.js';
import {safeUrl} from './model.js';
import {ensureStorageMigration} from './storage.js';
import {upgradeDemoWindows} from './data.js';
import {applyTabTitles,readTabTitles,TAB_TITLES_KEY} from './tab-titles.js';
export const extension = Boolean(api?.runtime?.id && api?.tabs);
export async function readState(fallback) {
  await ensureStorageMigration();
  try {
    const raw = extension ? (await api.storage.local.get(storageKey))[storageKey] : JSON.parse(localStorage.getItem(storageKey)||'null');
    let preferences;try{preferences=extension?(await api.storage.local.get(PREFS_KEY))[PREFS_KEY]:JSON.parse(localStorage.getItem(PREFS_KEY)||'null');}catch{preferences=null;}
    const result=raw?.version===1?{...fallback,...raw}:fallback;
    if(!extension&&raw?.version===1&&!Object.hasOwn(raw,'demoWindowsVersion'))result.demoWindowsVersion=0;
    result.settings=normalizeSettings(preferences||result.settings);return retireCategories(result);
  } catch {return retireCategories({...fallback,settings:normalizeSettings(fallback.settings)});}
}
export async function writePreferences(settings){const value=normalizeSettings(settings);if(extension)await api.storage.local.set({[PREFS_KEY]:value});else localStorage.setItem(PREFS_KEY,JSON.stringify(value));}
export async function readCredentials(){await ensureStorageMigration();try{return extension?(await api.storage.local.get(SECRETS_KEY))[SECRETS_KEY]||{}:JSON.parse(sessionStorage.getItem(SECRETS_KEY)||'{}');}catch{return {};}}
export async function writeCredentials(value){if(extension)await api.storage.local.set({[SECRETS_KEY]:value});else sessionStorage.setItem(SECRETS_KEY,JSON.stringify(value));}
export async function writeState(state) {
  retireCategories(state);
  if(extension) await api.storage.local.set({[storageKey]:state});
  else localStorage.setItem(storageKey,JSON.stringify(state));
}
export class BrowserAdapter {
  constructor(state){this.state=state;this.currentWindowId=1;this.capabilities=extension?detectCapabilities(api):DEMO_CAPABILITIES;if(!extension&&state.demoTabs)upgradeDemoWindows(state);}
  async listTabs(all=false){
    const titles=await readTabTitles();
    if(!extension) return {tabs:applyTabTitles(this.state.demoTabs.filter(t=>all||t.windowId===this.currentWindowId),titles),groups:this.state.demoNativeGroups.filter(g=>all||g.windowId===this.currentWindowId),windows:this.state.demoWindows.filter(w=>all||w.id===this.currentWindowId)};
    this.currentWindowId=(await api.windows.getCurrent()).id;
    const [queried,groups,windows]=await Promise.all([api.tabs.query(all?{}:{windowId:this.currentWindowId}),this.capabilities.nativeGroups?api.tabGroups.query(all?{}:{windowId:this.currentWindowId}):[],api.windows.getAll?api.windows.getAll({}):Promise.resolve([])]);
    const tabs=queried.filter(t=>Number.isInteger(t.id)&&t.id>=0&&!(t.url||t.pendingUrl)?.startsWith(api.runtime.getURL(''))).map(t=>({...t,groupId:this.capabilities.nativeGroups?(t.groupId??-1):-1}));
    return {tabs:applyTabTitles(tabs,titles),groups,windows:windows.filter(w=>all||w.id===this.currentWindowId)};
  }
  async listBookmarks(){
    if(!extension){
      if(!this.state.bookmarkFolders.some(f=>f.protected)){this.state.bookmarkFolders.unshift({id:'bf-root',title:'书签栏',parentId:'0',protected:true,index:0});for(const f of this.state.bookmarkFolders)if(f.id!=='bf-root'&&!f.parentId)f.parentId='bf-root';}
      return {bookmarks:this.state.bookmarks,folders:this.state.bookmarkFolders};
    }
    if(!this.capabilities.bookmarks)return {bookmarks:[],folders:[]};
    return flattenBookmarkTree(await api.bookmarks.getTree());
  }
  async open(tab,{background=false,reuse=false}={}){
    if(extension){
      if(reuse&&typeof tab.id!=='number'){const existing=(await api.tabs.query({})).find(t=>t.url===tab.url);if(existing){if(!background){await api.tabs.update(existing.id,{active:true});await api.windows.update(existing.windowId,{focused:true});}return existing;}}
      if(typeof tab.id==='number'){await api.tabs.update(tab.id,{active:true});if(tab.windowId) await api.windows.update(tab.windowId,{focused:true});}
      else return api.tabs.create({url:tab.url,active:!background});
    } else if(typeof tab.id==='number'){
      this.state.demoTabs.filter(t=>t.windowId===tab.windowId).forEach(t=>t.active=t.id===tab.id);tab.discarded=false;await this.focusWindow(tab.windowId);
    } else {
      if(!/^https?:/.test(tab.url)) throw new Error('浏览器内部页面请在扩展模式中打开');
      const opened=window.open(tab.url,'_blank','noopener,noreferrer');if(background)opened?.blur();
    }
  }
  async focusWindow(id){
    if(extension)return api.windows.update(id,{focused:true});
    if(!this.state.demoTabs.some(t=>t.windowId===id))throw new Error('窗口已关闭，请刷新列表');
    if(!this.state.demoWindows.some(w=>w.id===id))this.state.demoWindows.push({id,focused:false,incognito:false});this.state.demoWindows.forEach(w=>w.focused=w.id===id);
  }
  async sleep(tab){
    if(!this.capabilities.sleep)throw new Error('此浏览器暂不支持标签休眠，可保存会话后关闭标签');
    if(tab.active) throw new Error('正在使用的标签页无法休眠，请先切换到其他标签');
    if(extension) await api.tabs.discard(tab.id);
    else tab.discarded=true;
  }
  async wake(tab){
    if(extension) await api.tabs.reload(tab.id);
    else tab.discarded=false;
  }
  async close(tab){
    if(extension) await api.tabs.remove(tab.id);
    else this.state.demoTabs=this.state.demoTabs.filter(t=>t.id!==tab.id);
  }
  async nativeGroup(tabs,title,groupId){
    if(!this.capabilities.nativeGroups)throw new Error('此浏览器暂不支持原生分组管理，可使用已保存会话');
    if(!tabs.length) throw new Error('请先选择标签页');
    if(extension){
      const windowId=groupId!==undefined?(await api.tabGroups.get(groupId)).windowId:tabs[0].windowId;
      for(const tab of tabs) {if(tab.pinned) await api.tabs.update(tab.id,{pinned:false}); if(tab.windowId!==windowId) await api.tabs.move(tab.id,{windowId,index:-1});}
      const id=await api.tabs.group({tabIds:tabs.map(t=>t.id),...(groupId!==undefined?{groupId}:{})});
      if(groupId===undefined) await api.tabGroups.update(id,{title,color:'orange'});
      return id;
    }
    const id=groupId??Date.now();
    const windowId=groupId===undefined?tabs[0].windowId:this.state.demoNativeGroups.find(g=>g.id===groupId)?.windowId||1;
    if(groupId===undefined) this.state.demoNativeGroups.push({id,title,color:'orange',windowId});
    tabs.forEach(t=>{t.groupId=id;t.windowId=windowId;});return id;
  }
  async renameNativeGroup(id,title){
    if(!this.capabilities.nativeGroups)throw new Error('此浏览器暂不支持原生分组管理');
    title=String(title).trim();if(!title)throw new Error('名称不能为空');
    if(extension)return api.tabGroups.update(id,{title});
    const group=this.state.demoNativeGroups.find(group=>group.id===id);if(!group)throw new Error('浏览器标签组已关闭');group.title=title;
  }
  async ungroup(tabs){
    if(!this.capabilities.nativeGroups)throw new Error('此浏览器暂不支持原生分组管理');
    if(extension) await api.tabs.ungroup(tabs.map(t=>t.id));
    else tabs.forEach(t=>t.groupId=-1);
  }
  async reorderTab(tab,before){
    if(extension){if(tab.groupId!==before.groupId){if(before.groupId>=0) await this.nativeGroup([tab],'',before.groupId);else await this.ungroup([tab]);}await api.tabs.move(tab.id,{windowId:before.windowId,index:before.index});}
    else {const list=this.state.demoTabs; list.splice(list.indexOf(tab),1);list.splice(list.indexOf(before),0,tab);tab.groupId=before.groupId;tab.windowId=before.windowId;const indices=new Map();list.forEach(t=>{t.index=indices.get(t.windowId)||0;indices.set(t.windowId,t.index+1);});}
  }
  async saveBookmark(tab,parentId,id){
    const tree=await this.listBookmarks();
    parentId=parentId||tree.folders.find(f=>!f.readOnly)?.id;
    if(!parentId||!tree.folders.some(f=>f.id===parentId&&!f.readOnly))throw new Error('请选择可写入的书签文件夹');
    if(id&&!tree.bookmarks.some(b=>b.id===id&&!b.readOnly))throw new Error('书签不存在或由浏览器托管');
    tab={title:String(tab.title||tab.url),url:safeUrl(tab.url)};
    if(extension) {
      if(id){await api.bookmarks.update(id,tab);return api.bookmarks.move(id,{parentId});}
      return api.bookmarks.create({...tab,parentId});
    } else if(id){return Object.assign(this.state.bookmarks.find(b=>b.id===id),tab,{parentId});}
    const saved={...tab,id:crypto.randomUUID(),parentId,index:this.state.bookmarks.filter(b=>b.parentId===parentId).length+this.state.bookmarkFolders.filter(f=>f.parentId===parentId).length};this.state.bookmarks.push(saved);return saved;
  }
  async deleteBookmark(id){const {bookmarks}=await this.listBookmarks();if(!bookmarks.some(b=>b.id===id&&!b.readOnly))throw new Error('书签不存在或由浏览器托管');if(extension) await api.bookmarks.remove(id);else this.state.bookmarks=this.state.bookmarks.filter(b=>b.id!==id);}
  async moveBookmark(id,parentId){const {bookmarks,folders}=await this.listBookmarks();if(!bookmarks.some(b=>b.id===id&&!b.readOnly)||!folders.some(f=>f.id===parentId&&!f.readOnly))throw new Error('请选择可写入的书签文件夹');if(extension) await api.bookmarks.move(id,{parentId});else this.state.bookmarks.find(b=>b.id===id).parentId=parentId;}
  async createBookmarkFolder(title,parentId){
    const {folders}=await this.listBookmarks();parentId=parentId||folders.find(f=>!f.readOnly)?.id;
    if(!parentId||!folders.some(f=>f.id===parentId&&!f.readOnly))throw new Error('请选择可写入的父文件夹');
    title=String(title).trim();if(!title)throw new Error('文件夹名称不能为空');
    if(extension) return api.bookmarks.create({title,parentId});
    const folder={id:crypto.randomUUID(),title,parentId,index:this.state.bookmarks.filter(b=>b.parentId===parentId).length+folders.filter(f=>f.parentId===parentId).length};this.state.bookmarkFolders.push(folder);return folder;
  }
  async renameBookmarkFolder(id,title){
    const {folders}=await this.listBookmarks(),folder=folders.find(f=>f.id===id);
    if(!folder||folder.protected||folder.readOnly)throw new Error('浏览器内置或托管文件夹不能重命名');
    title=String(title).trim();if(!title)throw new Error('文件夹名称不能为空');
    if(extension)await api.bookmarks.update(id,{title});else folder.title=title;
  }
  async moveBookmarkFolder(id,parentId){const {folders}=await this.listBookmarks();validateFolderMove(folders,id,parentId);if(extension)await api.bookmarks.move(id,{parentId});else folders.find(f=>f.id===id).parentId=parentId;}
  async snapshotBookmarkFolder(id){const {bookmarks,folders}=await this.listBookmarks();return folderSnapshot(bookmarks,folders,id);}
  async deleteBookmarkFolder(id,expected){
    const {folders}=await this.listBookmarks(),folder=folders.find(f=>f.id===id);
    if(!folder||folder.protected||folder.readOnly)throw new Error('浏览器内置或托管文件夹不能删除');
    if(expected&&JSON.stringify(await this.snapshotBookmarkFolder(id))!==JSON.stringify(expected))throw new Error('文件夹内容刚刚发生变化，请重新确认删除');
    if(extension)await api.bookmarks.removeTree(id);else{const ids=folderIds(folders,id);this.state.bookmarkFolders=folders.filter(f=>!ids.has(f.id));this.state.bookmarks=this.state.bookmarks.filter(b=>!ids.has(b.parentId));}
  }
  async restoreBookmarkFolder(snapshot){
    const validate=node=>{if(!node||typeof node.title!=='string')throw new Error('文件夹备份格式不正确');if(node.url)safeUrl(node.url);else{if(!Array.isArray(node.children))throw new Error('文件夹备份格式不正确');node.children.forEach(validate);}};validate(snapshot);
    const {folders}=await this.listBookmarks(),parentId=folders.find(f=>f.id===snapshot.parentId&&!f.readOnly)?.id||folders.find(f=>!f.readOnly)?.id;
    const root=await this.createBookmarkFolder(snapshot.title,parentId);
    const restore=async(node,parent)=>{for(const child of node.children){if(child.url)await this.saveBookmark(child,parent);else{const folder=await this.createBookmarkFolder(child.title,parent);await restore(child,folder.id);}}};
    try{await restore(snapshot,root.id);return root;}catch(error){try{await this.deleteBookmarkFolder(root.id);}catch{}throw error;}
  }
  async copyToBookmarks(items,parentId,{name,dedupe=true}={}){
    const incoming=items.map(tab=>({title:String(tab.title||tab.url),url:safeUrl(tab.url)}));
    if(!incoming.length)throw new Error('没有可保存为书签的链接');
    let {folders,bookmarks}=await this.listBookmarks();parentId=parentId||folders.find(f=>!f.readOnly)?.id;
    if(!folders.some(f=>f.id===parentId&&!f.readOnly))throw new Error('请选择可写入的书签文件夹');
    let createdFolder;
    if(name){const existing=folders.find(f=>f.parentId===parentId&&f.title===name&&!f.readOnly);if(existing)parentId=existing.id;else{createdFolder=await this.createBookmarkFolder(name,parentId);parentId=createdFolder.id;}}
    const known=new Set(bookmarks.filter(b=>b.parentId===parentId).map(b=>b.url.replace(/\/$/,''))),created=[];
    try{for(const tab of incoming){const key=tab.url.replace(/\/$/,'');if(dedupe&&known.has(key))continue;created.push(await this.saveBookmark(tab,parentId));known.add(key);}}
    catch(error){for(const tab of created.reverse())try{await this.deleteBookmark(tab.id);}catch{}if(createdFolder)try{await this.deleteBookmarkFolder(createdFolder.id);}catch{}throw error;}
    return {count:created.length,parentId};
  }
  listen(callback){
    if(!extension) return;
    let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(callback,160);};
    api.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes[TAB_TITLES_KEY])schedule();});
    for(const event of [api.tabs.onCreated,api.tabs.onRemoved,api.tabs.onUpdated,api.tabs.onMoved,api.tabs.onAttached,api.tabs.onDetached,api.tabs.onActivated,api.tabGroups?.onCreated,api.tabGroups?.onUpdated,api.tabGroups?.onRemoved,api.tabGroups?.onMoved,api.windows.onCreated,api.windows.onRemoved,api.windows.onFocusChanged,api.bookmarks?.onCreated,api.bookmarks?.onRemoved,api.bookmarks?.onChanged,api.bookmarks?.onMoved])event?.addListener(schedule);
  }
}

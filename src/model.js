import {uid} from './data.js';
export function safeUrl(value) {
  if (typeof value !== 'string') throw new Error('请输入有效链接');
  const url = new URL(value.trim());
  if (!['https:','http:','chrome:','edge:','about:','brave:','opera:','vivaldi:','favorites:'].includes(url.protocol)) throw new Error('不支持此链接类型');
  return url.href;
}
export function normalizeTab(tab) {
  return {id:uid(),title:String(tab.title || tab.url || '未命名标签').slice(0,500),url:safeUrl(tab.url)};
}
export function makeGroup(name,categoryId,tabs=[]) {
  return {id:uid(),name:name.trim() || '未命名标签组',categoryId,starred:false,locked:false,createdAt:new Date().toISOString(),tabs:tabs.map(normalizeTab)};
}
export function dedupeTabs(tabs) {
  const seen = new Set();
  return tabs.filter(tab => {const key=tab.url.replace(/\/$/,''); if(seen.has(key)) return false; seen.add(key); return true;});
}
export function moveSavedTab(state,tabId,sourceId,targetId,beforeId) {
  const source = sourceId === 'stash' ? state.stash : state.groups.find(g=>g.id===sourceId)?.tabs;
  const targetGroup = state.groups.find(g=>g.id===targetId);
  const sourceGroup = state.groups.find(g=>g.id===sourceId);
  if(sourceGroup?.locked || targetGroup?.locked) throw new Error('请先解锁标签组');
  const target = targetId === 'stash' ? state.stash : targetGroup?.tabs;
  if (!source || !target) throw new Error('未找到目标标签组');
  const index = source.findIndex(t=>t.id===tabId);
  if(index<0) throw new Error('标签页已移动，请刷新后重试');
  if(tabId===beforeId) return;
  const [tab]=source.splice(index,1);
  if(source!==target&&state.settings?.duplicateTabs==='dedupe'&&target.some(t=>t.url.replace(/\/$/,'')===tab.url.replace(/\/$/,''))){recycle(state,sourceId==='stash'?'stash':'tab',tab,{groupId:sourceId});return;}
  const targetIndex=target.findIndex(t=>t.id===beforeId);
  target.splice(targetIndex<0?(state.settings?.tabInsert==='top'?0:target.length):targetIndex,0,tab);
}
export function recycle(state,kind,value,extra={}) {
  state.trash.unshift({id:uid(),kind,value:structuredClone(value),deletedAt:new Date().toISOString(),...extra});
}
export function restoreItem(state,id) {
  const entry=state.trash.find(t=>t.id===id);
  if(!entry) return;
  if(entry.kind==='group') {
    if(!state.categories.some(c=>c.id===entry.value.categoryId)) entry.value.categoryId='inbox';
    state.groups.push(entry.value);
  } else if(entry.kind==='tab') {
    const group=state.groups.find(g=>g.id===entry.groupId);
    (group?group.tabs:state.stash).push(entry.value);
  } else if(entry.kind==='stash') state.stash.push(entry.value);
  state.trash=state.trash.filter(t=>t.id!==id);
}
export function parseImport(text) {
  let data;
  try {data=JSON.parse(text);} catch {
    const tabs=text.split(/\r?\n/).filter(Boolean).map(line=>{const [url,...title]=line.split(/\s+\|\s+|\t/);return normalizeTab({url,title:title.join(' ')||url});});
    if(!tabs.length) throw new Error('文件中没有可导入的标签');
    return {groups:[makeGroup('导入的标签','inbox',tabs)],categories:[]};
  }
  const rawGroups=Array.isArray(data)?data:(data.groups||data.tabGroups);
  if(!Array.isArray(rawGroups)) throw new Error('格式不支持，请使用本工具 JSON、OneTab 文本或兼容的标签组 JSON');
  const categories=Array.isArray(data.categories)?data.categories.filter(c=>c && typeof c.id==='string' && typeof c.name==='string').map(c=>({id:c.id,name:c.name.slice(0,100)})):[];
  const groups=rawGroups.map(g=>{
    if(!g||!Array.isArray(g.tabs||g.tabList)) throw new Error('标签组数据格式不正确');
    return {...makeGroup(String(g.name||g.title||'导入的标签组').slice(0,100),String(g.categoryId||'inbox'),g.tabs||g.tabList),starred:Boolean(g.starred),locked:Boolean(g.locked)};
  });
  const stash=Array.isArray(data.stash)?data.stash.map(normalizeTab):[];
  const bookmarks=Array.isArray(data.bookmarks)?data.bookmarks.map(normalizeTab):[];
  if(!groups.length&&!stash.length&&!bookmarks.length) throw new Error('文件中没有可导入的标签');
  return {groups,categories,stash,bookmarks};
}

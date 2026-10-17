import {requireSyncConsent} from './platform.js';
import {uid} from './data.js';
import {safeUrl} from './model.js';
import {normalizeSettings,portableSettings} from './settings.js';
import {retireCategories} from './bookmarks.js';
import {formatNamespace,rebrandContent,SYNC_FILENAME} from './brand.js';
export const SYNC_STATUS_KEY='qiye-sync-status-v1';
const filename=SYNC_FILENAME;
const maxBytes=10*1024*1024;
export function syncPayload(state){return {schema:'qiye-sync',version:1,updatedAt:new Date().toISOString(),categories:structuredClone(state.categories),groups:structuredClone(state.groups),stash:structuredClone(state.stash),...(state.settings.syncPreferences?{preferences:portableSettings(state.settings)}:{})};}
export function validateRemote(data){
  const namespace=formatNamespace(data?.schema,'-sync');
  if(!data||!namespace||data.version!==1||!Array.isArray(data.groups)||!Array.isArray(data.categories)||!Array.isArray(data.stash))throw new Error('远端文件不是有效的 栖页 Qiye 同步数据');
  data=rebrandContent(data,namespace);
  const ids=new Set(),tabIds=new Set();
  const tab=t=>{if(!t||typeof t.id!=='string'||tabIds.has(t.id))throw new Error('远端标签标识不正确或重复');tabIds.add(t.id);return {id:t.id,title:String(t.title||t.url).slice(0,500),url:safeUrl(t.url)};};
  const categories=data.categories.map(c=>{if(!c||typeof c.id!=='string'||ids.has(c.id))throw new Error('远端分类标识不正确或重复');ids.add(c.id);return {id:c.id,name:String(c.name||'未命名分类').slice(0,200)};});
  if(!categories.some(c=>c.id==='inbox'))categories.unshift({id:'inbox',name:'中转站'});
  const gids=new Set();const groups=data.groups.map(g=>{if(!g||typeof g.id!=='string'||gids.has(g.id)||!Array.isArray(g.tabs))throw new Error('远端标签组格式不正确');gids.add(g.id);return {id:g.id,name:String(g.name||'未命名标签组').slice(0,200),categoryId:categories.some(c=>c.id===g.categoryId)?g.categoryId:'inbox',starred:Boolean(g.starred),locked:Boolean(g.locked),autoNamed:Boolean(g.autoNamed),createdAt:Number.isFinite(Date.parse(g.createdAt))?g.createdAt:new Date().toISOString(),tabs:g.tabs.map(tab)};});
  return {categories,groups,stash:data.stash.map(tab),...(data.preferences&&typeof data.preferences==='object'?{preferences:portableSettings(data.preferences)}:{})};
}
export function mergeRemote(local,remote){
  for(const c of remote.categories)if(!local.categories.some(x=>x.id===c.id))local.categories.push(c);
  const knownIds=new Set([...local.groups.flatMap(g=>g.tabs),...local.stash].map(t=>t.id));
  for(const incoming of remote.groups){const existing=local.groups.find(g=>g.id===incoming.id);if(!existing){const copy=structuredClone(incoming);copy.tabs=copy.tabs.filter(t=>!knownIds.has(t.id));copy.tabs.forEach(t=>knownIds.add(t.id));local.groups.push(copy);}else if(!existing.locked){for(const t of incoming.tabs)if(!knownIds.has(t.id)&&!existing.tabs.some(x=>x.url===t.url)){existing.tabs.push(t);knownIds.add(t.id);}}}
  for(const t of remote.stash)if(!knownIds.has(t.id)&&!local.stash.some(x=>x.url===t.url)){local.stash.push(t);knownIds.add(t.id);}
  return local;
}
export async function runSync(state,{credentials={},fetcher=globalThis.fetch,mode=state.settings.syncMode,test=false}={}){
  await requireSyncConsent();
  const settings=state.settings;
  if(settings.syncProvider==='none')throw new Error('请先选择并保存同步服务');
  const provider=settings.syncProvider;
  let endpoint,headers={};
  if(provider==='webdav'){
    if(!settings.webdavUrl)throw new Error('请先保存 WebDAV 文件地址');
    const url=new URL(settings.webdavUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('同步地址不正确');endpoint=url.href;
    if(credentials.username||credentials.password){if(credentials.webdavOrigin!==url.origin)throw new Error('同步服务地址已改变，请重新输入该服务的账号密码');const bytes=new TextEncoder().encode(`${credentials.username||''}:${credentials.password||''}`);headers.Authorization=`Basic ${btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''))}`;}
  }else{
    if(!credentials.token)throw new Error('请先保存 GitHub Token');
    if(settings.gistId&&!/^[a-f0-9]+$/i.test(settings.gistId))throw new Error('Gist ID 不正确');
    endpoint=`https://api.github.com/gists${settings.gistId?'/'+settings.gistId:''}`;
    headers={Accept:'application/vnd.github+json',Authorization:`Bearer ${credentials.token}`,'X-GitHub-Api-Version':'2022-11-28'};
  }
  async function request(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{return await fetcher(url,{...options,headers:{...headers,...options.headers},signal:controller.signal,redirect:'error',credentials:'omit'});}catch(error){throw new Error(error.name==='AbortError'?'同步请求超时，请稍后重试':'无法连接同步服务，请检查地址、网络和浏览器授权');}finally{clearTimeout(timer);}}
  async function readResponse(response){const text=await response.text();if(text.length>maxBytes)throw new Error('远端文件超过 10 MB，未应用任何更改');try{return JSON.parse(text);}catch{throw new Error('远端返回的不是有效 JSON 数据');}}
  let remote=null,etag,remoteFilename=filename;
  if(provider==='webdav'||settings.gistId){
    const response=await request(endpoint);etag=response.headers?.get('etag');
    if(provider==='gist'&&response.status===404)throw new Error('Gist 不存在或没有访问权限，请检查 ID 和 Token');
    if(response.status!==404){if(!response.ok)throw new Error(`同步服务返回 ${response.status}，请检查访问权限`);let data=await readResponse(response);if(provider==='gist'){if(data.public===true&&!test)throw new Error('此 Gist 为公开可见，请使用 Secret Gist 保存个人收藏');const candidates=Object.keys(data.files||{}).filter(key=>formatNamespace(key,'-workspace.json'));if(!data.files?.[filename]&&candidates.length>1)throw new Error('远端有多个兼容收藏文件，请保留一个明确的同步文件');remoteFilename=data.files?.[filename]?filename:candidates[0]||filename;const file=data.files?.[remoteFilename];if(!file){if(test)return {message:'连接成功，首次同步将创建收藏文件',ok:true};data=null;}else{if(file.truncated)throw new Error('Gist 内容被截断，已停止同步以保留本地数据');try{data=JSON.parse(file.content);}catch{throw new Error('Gist 收藏文件不是有效 JSON');}}}if(data)remote=validateRemote(data);}
  }else if(test){const response=await request('https://api.github.com/user');if(!response.ok)throw new Error(`GitHub 认证失败（${response.status}）`);return {ok:true,message:'GitHub 认证成功，首次同步将创建 Secret Gist'};}
  if(test)return {ok:true,message:remote?'连接成功，远端收藏文件可读取':'服务可连接，文件不存在；首次同步将尝试创建（写入权限尚未验证）'};
  if(mode==='pull'){
    if(!remote)throw new Error('远端尚无收藏文件，本地内容保持不变');
    state.snapshots.unshift({id:uid(),name:'远端拉取前的恢复快照',createdAt:new Date().toISOString(),groups:structuredClone(state.groups),categories:structuredClone(state.categories),stash:structuredClone(state.stash),openTabs:[],preferences:portableSettings(state.settings)});
    state.categories=remote.categories;state.groups=remote.groups;state.stash=remote.stash;
    if(settings.syncPreferences&&remote.preferences)state.settings=normalizeSettings({...settings,...remote.preferences});
  }else{
    const candidate=structuredClone(state);if(mode==='merge'&&remote)mergeRemote(candidate,remote);retireCategories(candidate);
    const content=JSON.stringify(syncPayload(candidate));
    if(provider==='gist'&&new TextEncoder().encode(content).length>950000)throw new Error('收藏超过 Gist 单文件读取上限，请使用 WebDAV');
    const response=provider==='webdav'?await request(endpoint,{method:'PUT',headers:{'Content-Type':'application/json',...(etag?{'If-Match':etag}:!remote?{'If-None-Match':'*'}:{})},body:content}):await request(endpoint,{method:settings.gistId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:'栖页 Qiye collections',...(!settings.gistId?{public:false}:{}),files:{[remoteFilename]:{content}}})});
    if(!response.ok)throw new Error(`同步写入失败（${response.status}），本地收藏保持不变`);
    if(provider==='gist'&&!settings.gistId){const result=await readResponse(response);if(!/^[a-f0-9]+$/i.test(result.id||''))throw new Error('远端已接收请求，但未返回有效 Gist ID，请在 GitHub 中确认后填写 ID');state.settings.gistId=result.id;}
    if(mode==='merge'){state.categories=candidate.categories;state.groups=candidate.groups;state.stash=candidate.stash;state.snapshots=candidate.snapshots;}
  }
  retireCategories(state);
  return {ok:true,message:mode==='pull'?'远端收藏已拉取，原收藏已保存为恢复快照':mode==='push'?'已用本地收藏更新远端':'收藏已合并并推送到远端',at:new Date().toISOString()};
}

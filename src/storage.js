import {api} from './platform.js';
import {STORAGE_KEY,PREFS_KEY,SECRETS_KEY} from './settings.js';
import {formatNamespace,isWorkspace,rebrandContent} from './brand.js';

export function migrationPlan(local,session={}){
  const workspaceKeys=Object.keys(local).filter(key=>key!==STORAGE_KEY&&formatNamespace(key,'-workspace-v1')&&isWorkspace(local[key]));
  const preferenceKeys=Object.keys(local).filter(key=>key!==PREFS_KEY&&formatNamespace(key,'-preferences-v2')&&typeof local[key]?.managerTitle==='string'&&typeof local[key]?.theme==='string');
  const namespaces=[...new Set((workspaceKeys.length?workspaceKeys:preferenceKeys).map(key=>formatNamespace(key,workspaceKeys.length?'-workspace-v1':'-preferences-v2')))];
  if(namespaces.length!==1)return {local:{},session:{},removeLocal:[],removeSession:[]};
  const prefix=namespaces[0],localUpdates={},sessionUpdates={},removeLocal=[],removeSession=[];
  const aliases=[['workspace-v1',STORAGE_KEY],['preferences-v2',PREFS_KEY],['sync-credentials-v1',SECRETS_KEY],['sync-status-v1','qiye-sync-status-v1'],['last-session','qiye-last-session'],['last-action-error','qiye-last-action-error']];
  for(const [suffix,target] of aliases){const key=prefix+'-'+suffix;if(Object.hasOwn(local,key)){if(!Object.hasOwn(local,target))localUpdates[target]=suffix==='sync-credentials-v1'?structuredClone(local[key]):rebrandContent(local[key],prefix);removeLocal.push(key);}}
  const credentialsKey=prefix+'-sync-credentials-v1';if(Object.hasOwn(session,credentialsKey)){if(!Object.hasOwn(session,SECRETS_KEY))sessionUpdates[SECRETS_KEY]=structuredClone(session[credentialsKey]);removeSession.push(credentialsKey);}
  return {local:localUpdates,session:sessionUpdates,removeLocal,removeSession};
}
let migration;
export function ensureStorageMigration(){return migration||=(async()=>{
  const native=Boolean(api?.runtime?.id&&api?.tabs);
  const readWeb=storage=>{const values={};for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!/-(workspace-v1|preferences-v2|sync-credentials-v1|sync-status-v1|last-session|last-action-error)$/.test(key))continue;try{values[key]=JSON.parse(storage.getItem(key));}catch{}}return values;};
  const local=native?await api.storage.local.get(null):readWeb(localStorage),session=native?{}:readWeb(sessionStorage),plan=migrationPlan(local,session);
  if(!plan.removeLocal.length&&!plan.removeSession.length)return;
  if(native){
    if(Object.keys(plan.local).length)await api.storage.local.set(plan.local);
    const stored=await api.storage.local.get(Object.keys(plan.local));
    if(Object.entries(plan.local).some(([key,value])=>JSON.stringify(stored[key])!==JSON.stringify(value)))throw new Error('旧数据迁移未完成，原数据已保留');
    if(plan.removeLocal.length)await api.storage.local.remove(plan.removeLocal);
  }else{
    for(const [key,value] of Object.entries(plan.local))localStorage.setItem(key,JSON.stringify(value));
    for(const [key,value] of Object.entries(plan.session))sessionStorage.setItem(key,JSON.stringify(value));
    const valid=(storage,entries)=>Object.entries(entries).every(([key,value])=>storage.getItem(key)===JSON.stringify(value));
    if(!valid(localStorage,plan.local)||!valid(sessionStorage,plan.session))throw new Error('旧数据迁移未完成，原数据已保留');
    plan.removeLocal.forEach(key=>localStorage.removeItem(key));plan.removeSession.forEach(key=>sessionStorage.removeItem(key));
  }
})().catch(error=>{migration=undefined;throw error;});}

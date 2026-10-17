export const BRAND_NAME='栖页 Qiye';
export const BRAND_TITLE='栖页 Qiye · 书签与标签管理';
export const SYNC_FILENAME='qiye-workspace.json';

// Earlier exports are identified by their documented format, not by a brand.
export function formatNamespace(schema,suffix){
  if(typeof schema!=='string'||!schema.endsWith(suffix))return null;
  const prefix=schema.slice(0,-suffix.length);
  return /^[a-z][a-z0-9-]{0,60}$/.test(prefix)?prefix:null;
}
export function rebrandContent(value,namespace){
  if(!namespace||namespace==='qiye')return structuredClone(value);
  const pattern=new RegExp(namespace.split('-').join('[\\s_-]*')+'(?:[\\s_-]+Manager)?','gi');
  const slug=namespace.replaceAll('-','').toLowerCase();
  function walk(input){
    if(Array.isArray(input))return input.map(walk);
    if(!input||typeof input!=='object')return input;
    const out={...input};
    for(const [key,entry] of Object.entries(out)){
      if(['name','title','managerTitle'].includes(key)&&typeof entry==='string')out[key]=entry.replace(pattern,BRAND_NAME);
      else if(entry&&typeof entry==='object')out[key]=walk(entry);
    }
    if(typeof out.url==='string')try{const url=new URL(out.url),parts=url.pathname.split('/').filter(Boolean);if(url.hostname==='github.com'&&parts[1]?.replace(/[-_\s]/g,'').toLowerCase()===slug){out.url='https://developer.chrome.com/docs/extensions/reference/api/';out.title='Chrome Extensions · API 参考';}}catch{}
    return out;
  }
  return walk(value);
}
export const isWorkspace=value=>Boolean(value&&value.version===1&&Array.isArray(value.groups)&&Array.isArray(value.categories)&&Array.isArray(value.stash)&&value.settings&&typeof value.settings==='object');

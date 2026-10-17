import {cp,mkdir,rm,readFile,writeFile,stat,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(import.meta.dirname,'..');
export const TARGETS={chromium:'dist',firefox:'dist-firefox',safari:'dist-safari'};
export function manifestFor(source,target){
  if(!Object.hasOwn(TARGETS,target))throw new Error(`未知浏览器目标：${target}`);
  const manifest=structuredClone(source);
  if(target!=='chromium'){
    delete manifest.minimum_chrome_version;
    manifest.background={scripts:['background.js'],type:'module'};
  }
  if(target==='firefox')manifest.browser_specific_settings={gecko:{id:'qiye-workspace@qiye.local',strict_min_version:'140.0',data_collection_permissions:{required:['none'],optional:['browsingActivity','authenticationInfo']}}};
  if(target==='safari')manifest.permissions=manifest.permissions.filter(p=>!['bookmarks','tabGroups'].includes(p));
  return manifest;
}
export function requestedTargets(args=process.argv.slice(2)){
  const value=args.find(arg=>arg.startsWith('--target='))?.slice(9)||'all';
  if(value==='all')return Object.keys(TARGETS);
  if(!Object.hasOwn(TARGETS,value))throw new Error(`未知浏览器目标：${value}`);
  return [value];
}
export async function buildTargets(targets=Object.keys(TARGETS)){
  const source=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8')),built=[];
  for(const target of targets){
    const manifest=manifestFor(source,target),destination=resolve(root,TARGETS[target]);
    await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
    for(const name of ['index.html','styles.css','settings.css','auxiliary.css','popup.html','newtab.html','src','assets','background.js'])await cp(resolve(root,name),resolve(destination,name),{recursive:true});
    await writeFile(resolve(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    await stat(resolve(destination,manifest.options_page));
    for(const path of manifest.background.scripts||[manifest.background.service_worker])await stat(resolve(destination,path));
    for(const icon of [...Object.values(manifest.icons||{}),...Object.values(manifest.action.default_icon||{})])await stat(resolve(destination,icon));
    for(const entry of ['index.html','popup.html','newtab.html']){
      const html=await readFile(resolve(destination,entry),'utf8');
      for(const match of html.matchAll(/(?:src|href)="([^"#?]+)"/g))if(!/^https?:/.test(match[1]))await stat(resolve(destination,match[1]));
    }
    for(const path of ['background.js',...(await readdir(resolve(destination,'src'))).filter(f=>f.endsWith('.js')).map(f=>'src/'+f)]){
      const source=await readFile(resolve(destination,path),'utf8');
      for(const match of source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g))await stat(resolve(destination,dirname(path),match[1]));
    }
    console.log(`已生成 ${TARGETS[target]}/（${target}）。`);built.push({target,directory:destination,manifest});
  }
  return built;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildTargets(requestedTargets());

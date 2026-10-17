import {DEFAULT_SETTINGS,normalizeSettings} from './settings.js';
import {makeGroup,normalizeTab,dedupeTabs,recycle} from './model.js';
export function domainMatches(url,pattern){try{const host=new URL(url).hostname.toLowerCase(),p=pattern.trim().toLowerCase().replace(/^\*\./,'');return host===p||host.endsWith('.'+p);}catch{return false;}}
export function excludedUrl(url,patterns){return patterns.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).some(p=>p.includes('://')||p.startsWith('about:')?url.replace(/\/$/,'')===p.replace(/\/$/,''):domainMatches(url,p));}
export function collectableTabs(tabs,settings){const s=normalizeSettings(settings);return tabs.filter(t=>(s.includePinned||!t.pinned)&&!excludedUrl(t.url||'',s.excludeUrls)&&!/^(chrome-extension|moz-extension|safari-web-extension):/.test(t.url||''));}
export function prepareTab(tab,settings){const result=normalizeTab(tab);if(settings.titleRulesEnabled)for(const rule of settings.titleRules)if(rule.find&&(!rule.domain||domainMatches(result.url,rule.domain)))result.title=result.title.split(rule.find).join(rule.replace);result.title=result.title.trim()||result.url;return result;}
export function groupName(tabs,settings,date=new Date()){
  const d=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,time=`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  let domain='';try{domain=new URL(tabs[0]?.url).hostname;}catch{}
  return settings.groupNameTemplate.replaceAll('{{date}}',d).replaceAll('{{time}}',time).replaceAll('{{domain}}',domain).replaceAll('{{count}}',String(tabs.length));
}
export function insertItems(target,items,position){if(position==='top')target.unshift(...items);else target.push(...items);}
export function appendTabs(target,tabs,settings){const incoming=tabs.map(t=>prepareTab(t,settings));const added=settings.duplicateTabs==='keep'?incoming:dedupeTabs(incoming).filter(t=>!target.some(s=>s.url.replace(/\/$/,'')===t.url.replace(/\/$/,'')));insertItems(target,added,settings.tabInsert);return added;}
export function insertGroup(state,g){insertItems(state.groups,[g],state.settings.groupInsert);return g;}
export function saveCollection(state,tabs,{name,categoryId,automatic=true}={}){
  const s=normalizeSettings(state.settings),category=state.categories.some(c=>c.id===categoryId)?categoryId:state.categories.some(c=>c.id===s.defaultCategory)?s.defaultCategory:'inbox';
  const title=name||groupName(tabs,s);
  let g=s.duplicateGroups==='merge'?state.groups.find(g=>g.categoryId===category&&!g.locked&&g.name===title):null;
  if(!g&&automatic&&tabs.length===1&&!s.singleNewGroup)g=state.groups.find(g=>g.categoryId===category&&!g.locked);
  if(!g){g=makeGroup(title,category);g.autoNamed=!name;insertItems(state.groups,[g],s.groupInsert);}
  appendTabs(g.tabs,tabs,s);return g;
}
export function removeEmptyGroups(state,previousCounts){if(!state.settings.removeEmptyGroups)return;state.groups=state.groups.filter(g=>{if(!g.locked&&g.tabs.length===0&&(previousCounts.get(g.id)||0)>0){recycle(state,'group',g);return false;}return true;});}
export function formatLinks(tabs,template=DEFAULT_SETTINGS.copyTemplate){return tabs.map(t=>template.replaceAll('{{title}}',t.title).replaceAll('{{url}}',t.url)).join('\n');}
export function matchesSearch(item,query,settings,categoryName=''){
  if(!query)return true;const s=settings;
  const values=[...(s.searchFields.includes('title')?[item.name||item.title||'']:[]),...(s.searchFields.includes('url')?[item.url||'']:[]),...(s.searchFields.includes('folder')?[categoryName]:[])].map(v=>s.searchCase?v:String(v).toLowerCase());
  const q=s.searchCase?query:query.toLowerCase();
  if(s.searchMode==='words')return q.split(/\s+/).filter(Boolean).every(word=>values.some(v=>v.includes(word)));
  return values.some(v=>s.searchMode==='starts'?v.startsWith(q):v.includes(q));
}
export function openInBackground(event,settings){const pressed=key=>key==='none'?!event.altKey&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey:key==='alt'?event.altKey:key==='shift'?event.shiftKey:event.metaKey||event.ctrlKey;if(pressed(settings.backgroundModifier))return true;if(pressed(settings.foregroundModifier))return false;return false;}

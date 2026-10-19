import {api} from './platform.js';
export const TAB_TITLES_KEY='qiye-tab-titles-v1';
const limit=1000;
function address(value){try{const url=new URL(value);return ['http:','https:','chrome:','edge:','about:','brave:','opera:','vivaldi:','favorites:','file:','chrome-extension:','moz-extension:','safari-web-extension:','devtools:'].includes(url.protocol)?url.href:null;}catch{return null;}}
export function normalizeTabTitles(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).flatMap(([url,title])=>{
    const key=address(url);
    return key&&typeof title==='string'&&title.trim()?[[key,title.trim().slice(0,200)]]:[];
  }).slice(-limit));
}
export function updateTabTitle(current,url,title){
  const key=address(url);if(!key)throw new Error('此标签的网址不支持自定义名称');
  const next=normalizeTabTitles(current);delete next[key];
  if(String(title).trim())next[key]=String(title).trim().slice(0,200);
  return normalizeTabTitles(next);
}
export function applyTabTitles(tabs,titles){
  for(const tab of tabs){
    tab.originalTitle=tab.originalTitle??tab.title??tab.url??'';
    tab.title=titles[address(tab.url)]||tab.originalTitle;
    tab.customTitle=Object.hasOwn(titles,address(tab.url));
  }
  return tabs;
}
export async function readTabTitles(){try{return normalizeTabTitles(api?(await api.storage.local.get(TAB_TITLES_KEY))[TAB_TITLES_KEY]:JSON.parse(localStorage.getItem(TAB_TITLES_KEY)||'{}'));}catch{return {};}}
export async function writeTabTitles(value){const titles=normalizeTabTitles(value);if(api)await api.storage.local.set({[TAB_TITLES_KEY]:titles});else localStorage.setItem(TAB_TITLES_KEY,JSON.stringify(titles));return titles;}

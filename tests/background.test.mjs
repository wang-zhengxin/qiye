import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyState} from '../src/data.js';
import {DEFAULT_SETTINGS,PREFS_KEY,STORAGE_KEY} from '../src/settings.js';
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
const data={},session={},calls=[];
let liveTabs=[];
const get=(source,key)=>Promise.resolve({[key]:structuredClone(source[key])});
globalThis.chrome={
 runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onInstalled:event(),onStartup:event(),onMessage:event()},
 storage:{local:{get:key=>get(data,key),set:async value=>Object.assign(data,structuredClone(value)),remove:async key=>delete data[key]},session:{get:key=>get(session,key),set:async value=>Object.assign(session,structuredClone(value)),remove:async key=>delete session[key]},onChanged:event()},
 tabs:{ungroup:async()=>{},query:async options=>liveTabs.filter(t=>(options.windowId===undefined||t.windowId===options.windowId)&&(options.active===undefined||t.active===options.active)),create:async options=>{calls.push(['create',options]);const tab={id:100+liveTabs.length,windowId:1,status:'complete',...options};liveTabs.push(tab);return tab;},update:async(id,options)=>{calls.push(['update',id,options]);Object.assign(liveTabs.find(t=>t.id===id)||{},options);},get:async id=>{const tab=liveTabs.find(t=>t.id===id);if(!tab)throw Error('missing');return tab;},remove:async id=>{assert.ok(data[STORAGE_KEY]?.groups.length,'collection must be persisted before closing');calls.push(['remove',id]);liveTabs=liveTabs.filter(t=>t.id!==id);},discard:async id=>calls.push(['discard',id]),group:async()=>1,onCreated:event(),onUpdated:event(),onRemoved:event(),onMoved:event(),onAttached:event(),onDetached:event(),onActivated:event()},
 windows:{update:async()=>{},onCreated:event()},tabGroups:{query:async()=>[{id:4,title:'Native group'}],update:async()=>{}},
 contextMenus:{removeAll:async()=>{},create:options=>{calls.push(['menu',options]);return options.id;},onClicked:event()},
 action:{setBadgeText:async options=>calls.push(['badge',options]),setBadgeBackgroundColor:async()=>{},setPopup:async options=>calls.push(['popup',options]),onClicked:event()},
 alarms:{get:async()=>undefined,clear:async()=>{},create:async(name,options)=>calls.push(['alarm',name,options]),onAlarm:event()},commands:{onCommand:event()}
};
const {quickSave}=await import('../background.js');
function reset(overrides={}){data[STORAGE_KEY]=createEmptyState();data[PREFS_KEY]={...structuredClone(DEFAULT_SETTINGS),openAfterSave:false,...overrides};liveTabs=[{id:1,title:'Active',url:'https://example.com/a',windowId:1,index:0,groupId:-1,active:true},{id:2,title:'Pinned',url:'https://pinned.test',windowId:1,index:1,pinned:true,groupId:-1,active:false},{id:3,title:'Native A',url:'https://native.test/a',windowId:1,index:2,groupId:4,active:false},{id:4,title:'Native B',url:'https://native.test/b',windowId:1,index:3,groupId:4,active:false},{id:5,title:'Empty',url:'chrome://newtab/',windowId:1,index:4,groupId:-1,active:false}];calls.length=0;}
test('quick save honors URL filters, pinned protection and native grouping',async()=>{reset();await quickSave('all',liveTabs[0]);const groups=data[STORAGE_KEY].groups;assert.equal(groups.length,2);assert.equal(groups.flatMap(g=>g.tabs).length,3);assert.ok(groups.some(g=>g.name==='Native group'));assert.equal(calls.filter(c=>c[0]==='remove').length,0);});
test('per-action closing is applied only after durable saving',async()=>{reset({closeScopes:['current']});await quickSave('current',liveTabs[0]);assert.equal(calls.filter(c=>c[0]==='remove').length,1);assert.equal(data[STORAGE_KEY].groups[0].tabs[0].url,'https://example.com/a');});
test('destination selection queues tabs without closing or saving them',async()=>{reset({askDestination:true,closeAfterSave:true});await quickSave('current',liveTabs[0]);assert.deepEqual(session.pendingCollection.tabIds,[1]);assert.equal(data[STORAGE_KEY].groups.length,0);assert.equal(calls.filter(c=>c[0]==='remove').length,0);assert.ok(calls.some(c=>c[0]==='create'&&c[1].url.includes('collect=1')));});
test('browser native context actions and startup hooks are registered',()=>{assert.equal(chrome.runtime.onStartup.listeners.length,1);assert.equal(chrome.windows.onCreated.listeners.length,1);assert.equal(chrome.alarms.onAlarm.listeners.length,1);assert.equal(chrome.contextMenus.onClicked.listeners.length,1);});
test('new-tab preference redirects only browser new tabs',async()=>{reset({newTabMode:'home'});await chrome.tabs.onCreated.listeners[0]({...liveTabs[4]});await new Promise(r=>setTimeout(r,5));assert.ok(calls.some(c=>c[0]==='update'&&c[2].url==='chrome-extension://test/newtab.html'));});
test('new window preference opens a pinned workspace when requested',async()=>{reset({newWindowOpen:true,pinManager:true});await chrome.windows.onCreated.listeners[0]({id:7,type:'normal'});assert.ok(calls.some(c=>c[0]==='create'&&c[1].windowId===7&&c[1].pinned));});

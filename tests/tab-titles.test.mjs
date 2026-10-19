import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTabTitles,updateTabTitle,applyTabTitles,writeTabTitles,readTabTitles} from '../src/tab-titles.js';
import {BrowserAdapter} from '../src/browser.js';
import {createDemoState} from '../src/data.js';
import {normalizeTab} from '../src/model.js';

test('custom names validate URLs and discard corrupt values without allowing executable URLs',()=>{
 assert.deepEqual(normalizeTabTitles({'https://example.com':' Name ','javascript:alert(1)':'Unsafe','invalid':'Bad','https://empty.test':'   ','https://type.test':32}),{'https://example.com/':'Name'});
 assert.deepEqual(normalizeTabTitles([]),{});
 assert.equal(Object.values(normalizeTabTitles({'https://example.com':'a'.repeat(300)}))[0].length,200);
 assert.throws(()=>updateTabTitle({},'javascript:alert(1)','bad'));
 const many=Object.fromEntries(Array.from({length:1002},(_,i)=>['https://example.com/'+i,'name']));assert.equal(Object.keys(normalizeTabTitles(many)).length,1000);
});
test('aliases are shared by matching URLs and blank names restore each original title',()=>{
 const tabs=[{url:'https://example.com',title:'Original A'},{url:'https://example.com/',title:'Original B'},{url:'https://different.test',title:'Other'}];
 let names=updateTabTitle({},tabs[0].url,' Custom ');applyTabTitles(tabs,names);
 assert.equal(tabs[0].title,'Custom');assert.equal(tabs[1].title,'Custom');assert.equal(tabs[2].title,'Other');
 assert.equal(normalizeTab(tabs[0]).title,'Custom');
 names=updateTabTitle(names,tabs[0].url,'   ');applyTabTitles(tabs,names);
 assert.equal(tabs[0].title,'Original A');assert.equal(tabs[1].title,'Original B');assert.equal(tabs[0].customTitle,false);
});
test('stored names survive fresh adapter queries and do not break demo tab mutations',async()=>{
 const previous=globalThis.localStorage,map=new Map();globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 try{
  const state=createDemoState(),adapter=new BrowserAdapter(state),target=state.demoTabs.find(t=>!t.active);
  await writeTabTitles(updateTabTitle({},target.url,'Saved alias'));assert.equal((await readTabTitles())[target.url],'Saved alias');
  const first=(await adapter.listTabs(true)).tabs.find(t=>t.id===target.id);assert.equal(first.title,'Saved alias');assert.equal(first,target);
  await adapter.sleep(first);assert.equal(target.discarded,true);
  const renamed=new BrowserAdapter(state);assert.equal((await renamed.listTabs(true)).tabs.find(t=>t.id===target.id).title,'Saved alias');
  await writeTabTitles(updateTabTitle(await readTabTitles(),target.url,''));assert.equal((await adapter.listTabs(true)).tabs.find(t=>t.id===target.id).title,target.originalTitle);
 }finally{globalThis.localStorage=previous;}
});
test('native group renaming retains group membership and rejects blank or missing groups',async()=>{
 const state=createDemoState(),adapter=new BrowserAdapter(state),group=state.demoNativeGroups[0],ids=state.demoTabs.filter(t=>t.groupId===group.id).map(t=>t.id);
 await adapter.renameNativeGroup(group.id,' Updated name ');assert.equal(group.title,'Updated name');assert.deepEqual(state.demoTabs.filter(t=>t.groupId===group.id).map(t=>t.id),ids);
 await assert.rejects(()=>adapter.renameNativeGroup(group.id,'  '));await assert.rejects(()=>adapter.renameNativeGroup(-100,'Missing'));
});

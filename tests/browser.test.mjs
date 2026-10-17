import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../src/data.js';
import {BrowserAdapter} from '../src/browser.js';

test('sleep keeps a tab in the strip and wake restores it',async()=>{
  const s=createDemoState(),b=new BrowserAdapter(s),tab=s.demoTabs[0];await b.sleep(tab);assert.equal(tab.discarded,true);assert.equal(s.demoTabs.length,11);await b.wake(tab);assert.equal(tab.discarded,false);
});
test('active tab cannot be discarded',async()=>{
  const s=createDemoState(),b=new BrowserAdapter(s);await assert.rejects(()=>b.sleep(s.demoTabs.find(t=>t.active)),/正在使用/);
});
test('closing a live tab does not remove saved collections',async()=>{
  const s=createDemoState(),b=new BrowserAdapter(s);await b.close(s.demoTabs[0]);assert.equal(s.demoTabs.length,10);assert.equal(s.groups.length,7);
});
test('native group creation and ungrouping preserve tabs',async()=>{
  const s=createDemoState(),b=new BrowserAdapter(s);const tabs=s.demoTabs.slice(0,2);const id=await b.nativeGroup(tabs,'测试分组');assert.ok(tabs.every(t=>t.groupId===id));assert.equal(s.demoNativeGroups.at(-1).title,'测试分组');await b.ungroup(tabs);assert.ok(tabs.every(t=>t.groupId===-1));
});
test('bookmark edit/move/delete keeps the source collection untouched',async()=>{
  const s=createDemoState(),b=new BrowserAdapter(s);await b.saveBookmark({title:'New',url:'https://example.com/'},'bf1');const mark=s.bookmarks.at(-1);await b.saveBookmark({title:'Edited',url:'https://example.org/'},'bf2',mark.id);assert.equal(mark.title,'Edited');assert.equal(mark.parentId,'bf2');await b.deleteBookmark(mark.id);assert.equal(s.bookmarks.length,4);assert.equal(s.groups[0].tabs.length,3);
});

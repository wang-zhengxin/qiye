import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,createEmptyState} from '../src/data.js';
import {safeUrl,parseImport,moveSavedTab,recycle,restoreItem,dedupeTabs} from '../src/model.js';

test('moving a saved tab preserves its identity and does not copy it',()=>{
  const s=createDemoState(),tab=s.groups[0].tabs[0];moveSavedTab(s,tab.id,'g1','g2');
  assert.equal(s.groups[0].tabs.length,2);assert.equal(s.groups[1].tabs.at(-1),tab);
  moveSavedTab(s,tab.id,'g2','stash');assert.equal(s.stash[0],tab);
});
test('locked source and target prevent a move without data loss',()=>{
  const s=createDemoState(),before=JSON.stringify(s);assert.throws(()=>moveSavedTab(s,'s1','g1','g4'),/解锁/);assert.equal(JSON.stringify(s),before);
  assert.throws(()=>moveSavedTab(s,'s8','g4','g1'),/解锁/);assert.equal(JSON.stringify(s),before);
});
test('reordering in a group works in both directions',()=>{
  const s=createDemoState();moveSavedTab(s,'s3','g1','g1','s1');assert.deepEqual(s.groups[0].tabs.map(t=>t.id),['s3','s1','s2']);
  moveSavedTab(s,'s3','g1','g1');assert.deepEqual(s.groups[0].tabs.map(t=>t.id),['s1','s2','s3']);
});
test('deleted groups and orphaned tabs can be recovered',()=>{
  const s=createDemoState(),g=s.groups[0];recycle(s,'group',g);s.groups.shift();restoreItem(s,s.trash[0].id);assert.equal(s.groups.at(-1).id,g.id);assert.equal(s.trash.length,0);
  recycle(s,'tab',g.tabs[0],{groupId:'missing'});restoreItem(s,s.trash[0].id);assert.equal(s.stash[0].id,'s1');
});
test('restored groups whose category was removed go to the inbox',()=>{
  const s=createDemoState();recycle(s,'group',{...s.groups[0],categoryId:'missing'});restoreItem(s,s.trash[0].id);assert.equal(s.groups.at(-1).categoryId,'inbox');
});
test('OneTab text and own JSON backup import with fresh identities',()=>{
  const result=parseImport('https://example.com | Example\nhttps://example.org\tOther');assert.equal(result.groups[0].tabs.length,2);assert.equal(result.groups[0].tabs[0].title,'Example');
  const demo=createDemoState();const imported=parseImport(JSON.stringify(demo));assert.equal(imported.groups.length,7);assert.notEqual(imported.groups[0].id,'g1');assert.equal(imported.categories.length,3);
});
test('unsafe and malformed import is rejected before application',()=>{
  assert.throws(()=>safeUrl('javascript:alert(1)'),/不支持/);assert.throws(()=>parseImport('{"groups":[{"tabs":[{"url":"javascript:alert(1)"}]}]}'));
  assert.throws(()=>parseImport('{"groups":[{}]}'));assert.throws(()=>parseImport('not a url'));
});
test('deduplication keeps the first title and normalizes trailing slash',()=>{
  const tabs=[{title:'First',url:'https://example.com/'},{title:'Second',url:'https://example.com'},{title:'Third',url:'https://example.org/'}];assert.deepEqual(dedupeTabs(tabs).map(t=>t.title),['First','Third']);
});
test('extension starts with no demonstration or foreign bookmarks',()=>{
  const s=createEmptyState();assert.equal(s.groups.length,0);assert.equal(s.demoTabs.length,0);assert.equal(s.bookmarks.length,0);assert.equal(s.categories[0].id,'inbox');
});

test('bookmark-only exports import without writing into native bookmarks',()=>{
  const r=parseImport(JSON.stringify({groups:[],bookmarks:[{title:'Bookmark',url:'https://example.com'}]}));assert.equal(r.groups.length,0);assert.equal(r.bookmarks.length,1);assert.equal(r.bookmarks[0].title,'Bookmark');
});
test('invalid bookmarks abort import before any collection is changed',()=>{
  assert.throws(()=>parseImport(JSON.stringify({groups:[{name:'Good',tabs:[]}],bookmarks:[{url:'data:text/html,test'}]})),/不支持/);
});

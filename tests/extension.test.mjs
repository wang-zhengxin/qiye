import test from 'node:test';
import assert from 'node:assert/strict';
const calls=[];
globalThis.chrome={
  runtime:{id:'test-extension',getURL:path=>`chrome-extension://test-extension/${path}`},
  tabs:{ungroup:async ids=>calls.push(['ungroup',ids]),query:async options=>{calls.push(['query',options]);return [{id:1,url:'https://example.com',windowId:8},{id:2,url:'chrome-extension://test-extension/index.html',windowId:8},{id:3,url:'https://other.test/',windowId:9,active:true,index:0},{id:4,url:'https://third.test/',windowId:9,index:1}].filter(t=>options.windowId===undefined||t.windowId===options.windowId)},discard:async id=>calls.push(['discard',id]),remove:async id=>calls.push(['close',id]),reload:async id=>calls.push(['reload',id]),update:async(id,options)=>calls.push(['update',id,options]),move:async(id,options)=>calls.push(['move',id,options]),group:async options=>{calls.push(['group',options]);return 20;}},
  windows:{getCurrent:async()=>({id:8}),getAll:async()=>[{id:8,focused:true},{id:9,focused:false}],update:async(id,o)=>calls.push(['window',id,o])},
  tabGroups:{query:async()=>[],get:async()=>({id:9,windowId:8}),update:async(id,options)=>calls.push(['groupUpdate',id,options])},
  bookmarks:{getTree:async()=>[{id:'0',children:[{id:'1',title:'Bar',children:[{id:'2',title:'Example',url:'https://example.com',parentId:'1'}]}]}],create:async options=>calls.push(['bookmark',options]),update:async(id,o)=>calls.push(['bookmarkUpdate',id,o]),move:async(id,o)=>calls.push(['bookmarkMove',id,o]),remove:async id=>calls.push(['bookmarkRemove',id])}
};
const {BrowserAdapter,extension}=await import('../src/browser.js');
const b=new BrowserAdapter({});
test('native adapter reads current window and excludes its own manager',async()=>{assert.equal(extension,true);const live=await b.listTabs();assert.equal(live.tabs.length,1);assert.equal(b.currentWindowId,8);});
test('native sleep and close call different APIs',async()=>{await b.sleep({id:1,active:false});await b.close({id:1});assert.ok(calls.some(c=>c[0]==='discard'));assert.ok(calls.some(c=>c[0]==='close'));});
test('native groups handle cross-window pinned tabs',async()=>{await b.nativeGroup([{id:3,windowId:9,pinned:true}],'New',9);assert.ok(calls.some(c=>c[0]==='update'&&c[2].pinned===false));assert.ok(calls.some(c=>c[0]==='move'&&c[2].windowId===8));assert.deepEqual(calls.find(c=>c[0]==='group')[1],{tabIds:[3],groupId:9});});
test('native bookmarks flatten and preserve parent folders',async()=>{const result=await b.listBookmarks();assert.equal(result.bookmarks[0].parentId,'1');assert.equal(result.folders[0].title,'Bar');await b.saveBookmark({title:'Edited',url:'https://example.org'},'1','2');assert.ok(calls.some(c=>c[0]==='bookmarkUpdate'));assert.ok(calls.some(c=>c[0]==='bookmarkMove'));});

test('all-window mode queries every window and keeps native window metadata',async()=>{const live=await b.listTabs(true);assert.equal(live.tabs.length,3);assert.deepEqual([...new Set(live.tabs.map(t=>t.windowId))],[8,9]);assert.equal(live.windows.length,2);assert.deepEqual(calls.filter(c=>c[0]==='query').at(-1)[1],{});assert.ok(!live.tabs.some(t=>t.id===2));});
test('activating another window sends the focus request to the correct browser window',async()=>{await b.focusWindow(9);assert.ok(calls.some(c=>c[0]==='window'&&c[1]===9&&c[2].focused===true));});

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLayout,clampPaneSize,readLayout,LAYOUT_KEY} from '../src/layout.js';

test('pane sizes reject corrupt values and keep known dimensions within usable bounds',()=>{
  assert.deepEqual(normalizeLayout({sidebarWidth:1,browserWidth:900,collectionHeight:550.4,stashHeight:NaN,tabsHeight:'500',sidebarHeight:Infinity,unknown:400}),{sidebarWidth:180,browserWidth:600,collectionHeight:550});
  assert.deepEqual(normalizeLayout(null),{});
  assert.equal(clampPaneSize(500,270,120),120);
  assert.equal(clampPaneSize(100,270,600),270);
});
test('layout loading retains local sizes but safely ignores corrupt and unsupported records',async()=>{
  const previous=globalThis.localStorage;
  try{
    globalThis.localStorage={getItem:key=>key===LAYOUT_KEY?JSON.stringify({version:1,sizes:{browserWidth:450,stashHeight:175}}):null};
    assert.deepEqual(await readLayout(),{browserWidth:450,stashHeight:175});
    globalThis.localStorage.getItem=()=>'{invalid';assert.deepEqual(await readLayout(),{});
    globalThis.localStorage.getItem=()=>JSON.stringify({version:9,sizes:{browserWidth:450}});assert.deepEqual(await readLayout(),{});
  }finally{globalThis.localStorage=previous;}
});

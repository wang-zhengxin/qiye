import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../src/data.js';
import {BrowserAdapter} from '../src/browser.js';
import {flattenBookmarkTree,folderPath,folderIds,folderSnapshot,validateFolderMove,retireCategories} from '../src/bookmarks.js';
import {normalizeSettings} from '../src/settings.js';
import {matchesSearch} from '../src/policies.js';

const setup=()=>{const state=createDemoState();return {state,browser:new BrowserAdapter(state)};};
test('native tree retains nesting, order, protected roots and inherited management',()=>{
  const tree=flattenBookmarkTree([{id:'0',children:[{id:'1',parentId:'0',title:'Bar',children:[{id:'2',parentId:'1',title:'Nested',index:1,children:[{id:'3',parentId:'2',title:'Page',url:'https://example.com/',index:0}]}]},{id:'4',parentId:'0',title:'Managed',unmodifiable:'managed',children:[{id:'5',parentId:'4',title:'Readonly'}]}]}]);
  assert.equal(tree.folders.find(f=>f.id==='1').protected,true);assert.equal(tree.folders.find(f=>f.id==='2').parentId,'1');assert.equal(tree.folders.find(f=>f.id==='5').readOnly,true);assert.equal(folderPath(tree.folders,'2'),'Bar / Nested');assert.deepEqual([...folderIds(tree.folders,'1')],['1','2']);assert.equal(tree.bookmarks[0].parentId,'2');
});
test('folder moves reject protected folders, managed targets and descendant cycles',()=>{
  const folders=[{id:'root',protected:true},{id:'a',parentId:'root'},{id:'b',parentId:'a'},{id:'locked',readOnly:true}];
  assert.throws(()=>validateFolderMove(folders,'root','a'),/内置/);assert.throws(()=>validateFolderMove(folders,'a','b'),/自身/);assert.throws(()=>validateFolderMove(folders,'b','locked'),/可写入/);assert.doesNotThrow(()=>validateFolderMove(folders,'b','root'));
});
test('old categories are archived once without losing groups, links or locks',()=>{
  const {state}=setup(),before=structuredClone(state.groups);retireCategories(state);assert.equal(state.categories.length,1);assert.ok(state.groups.every(g=>g.categoryId==='inbox'));assert.equal(state.groups.length,before.length);assert.deepEqual(state.snapshots[0].groups,before);assert.equal(state.groups[3].locked,true);assert.equal('defaultCategory' in state.settings,false);const count=state.snapshots.length;retireCategories(state);assert.equal(state.snapshots.length,count);
});
test('saving a session creates one named bookmark folder and respects URL deduplication',async()=>{
  const {state,browser}=setup(),before=JSON.stringify(state.groups),items=state.groups[0].tabs;
  const a=await browser.copyToBookmarks(items,'bf1',{name:'Session'});assert.equal(a.count,3);assert.equal(state.bookmarkFolders.find(f=>f.id===a.parentId).parentId,'bf1');const b=await browser.copyToBookmarks(items,'bf1',{name:'Session'});assert.equal(b.count,0);assert.equal(b.parentId,a.parentId);assert.equal(JSON.stringify(state.groups),before);const c=await browser.copyToBookmarks([items[0]],'bf1',{name:'Session',dedupe:false});assert.equal(c.count,1);
});
test('invalid session URLs abort before creating native folders or bookmarks',async()=>{
  const {state,browser}=setup(),before=JSON.stringify(state);await assert.rejects(()=>browser.copyToBookmarks([{title:'Bad',url:'javascript:alert(1)'}],'bf1',{name:'Bad'}),/不支持/);assert.equal(JSON.stringify(state),before);
});
test('failed session copy rolls back only newly created bookmarks and folders',async()=>{
  const {state,browser}=setup(),before=JSON.stringify([state.bookmarks,state.bookmarkFolders]);const save=browser.saveBookmark.bind(browser);let count=0;browser.saveBookmark=async(...args)=>{if(++count===2)throw new Error('disk full');return save(...args);};await assert.rejects(()=>browser.copyToBookmarks(state.groups[0].tabs,'bf1',{name:'Partial'}),/disk full/);assert.equal(JSON.stringify([state.bookmarks,state.bookmarkFolders]),before);
});
test('folder rename/move/deletion and nested restoration leave saved sessions intact',async()=>{
  const {state,browser}=setup(),before=JSON.stringify(state.groups);const parent=await browser.createBookmarkFolder('Parent','bf1'),child=await browser.createBookmarkFolder('Child',parent.id);await browser.saveBookmark({title:'Link',url:'https://example.com/'},child.id);await browser.renameBookmarkFolder(parent.id,'Renamed');await browser.moveBookmarkFolder(parent.id,'bf2');const backup=await browser.snapshotBookmarkFolder(parent.id);assert.equal(backup.parentId,'bf2');assert.equal(backup.children[0].title,'Child');await browser.deleteBookmarkFolder(parent.id);assert.ok(!state.bookmarkFolders.some(f=>f.id===child.id));const restored=await browser.restoreBookmarkFolder(backup);const nested=state.bookmarkFolders.find(f=>f.parentId===restored.id);assert.equal(nested.title,'Child');assert.ok(state.bookmarks.some(b=>b.parentId===nested.id&&b.title==='Link'));assert.equal(JSON.stringify(state.groups),before);
});
test('restoring a folder after its old parent is removed falls back to a writable root',async()=>{
  const {state,browser}=setup();const folder=await browser.createBookmarkFolder('Recovery','bf1'),backup=await browser.snapshotBookmarkFolder(folder.id);await browser.deleteBookmarkFolder('bf1');const restored=await browser.restoreBookmarkFolder(backup);assert.equal(restored.parentId,'bf-root');assert.ok(!state.bookmarkFolders.some(f=>f.id==='bf1'));
});
test('demo root and read-only folders cannot be renamed, moved or removed',async()=>{
  const {state,browser}=setup();await assert.rejects(()=>browser.renameBookmarkFolder('bf-root','Bad'),/内置/);await assert.rejects(()=>browser.deleteBookmarkFolder('bf-root'),/内置/);state.bookmarkFolders.push({id:'managed',title:'Admin',parentId:'bf-root',readOnly:true});await assert.rejects(()=>browser.createBookmarkFolder('Bad','managed'),/可写入/);await assert.rejects(()=>browser.moveBookmarkFolder('bf1','managed'),/可写入/);
});
test('folder snapshots retain mixed child ordering',()=>{
  const folders=[{id:'a',title:'A'},{id:'b',title:'B',parentId:'a',index:1}],bookmarks=[{id:'x',title:'X',url:'https://x.test',parentId:'a',index:0}];assert.deepEqual(folderSnapshot(bookmarks,folders,'a').children.map(n=>n.title),['X','B']);
});
test('legacy category search becomes bookmark path search and obsolete destination is dropped',()=>{
  const settings=normalizeSettings({searchFields:['category'],defaultCategory:'work'});assert.deepEqual(settings.searchFields,['folder']);assert.equal('defaultCategory' in settings,false);assert.equal(matchesSearch({title:'Page'},'Design',settings,'Bar / Design'),true);assert.equal(matchesSearch({title:'Design'},'Design',settings,''),false);
});

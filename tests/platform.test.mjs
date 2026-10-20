import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveExtensionApi,detectCapabilities,syncPermissionRequest,requireSyncConsent,requestSearchConsent,isNewTabUrl} from '../src/platform.js';
import {manifestFor,requestedTargets} from '../scripts/build.mjs';
import {readFile} from 'node:fs/promises';
import {safeUrl} from '../src/model.js';
import {collectableTabs} from '../src/policies.js';
import {DEFAULT_SETTINGS} from '../src/settings.js';
const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url)));
test('Promise browser namespace wins over Chrome compatibility namespace',()=>{const firefox={runtime:{id:'ff'},tabs:{}},chrome={runtime:{id:'cr'},tabs:{}};assert.equal(resolveExtensionApi({browser:firefox,chrome}),firefox);assert.equal(resolveExtensionApi({chrome}),chrome);assert.equal(resolveExtensionApi({browser:{tabs:{}}}),null);});
test('missing optional APIs are detected without pretending they are available',()=>{assert.deepEqual(detectCapabilities({tabs:{}}),{nativeGroups:false,bookmarks:false,sleep:false});});
test('Chromium uses a module worker and Firefox uses a module background script with a stable ID',()=>{const chromium=manifestFor(manifest,'chromium'),firefox=manifestFor(manifest,'firefox');assert.equal(chromium.background.service_worker,'background.js');assert.equal(chromium.background.scripts,undefined);assert.deepEqual(firefox.background,{scripts:['background.js'],type:'module'});assert.equal(firefox.minimum_chrome_version,undefined);assert.equal(firefox.browser_specific_settings.gecko.strict_min_version,'140.0');assert.equal(firefox.browser_specific_settings.gecko.id,'qiye-workspace@qiye.local');assert.ok(firefox.permissions.includes('tabGroups'));assert.equal(manifest.browser_specific_settings,undefined);});
test('Safari source omits unsupported permissions while retaining tab and storage access',()=>{const m=manifestFor(manifest,'safari');assert.ok(!m.permissions.includes('bookmarks'));assert.ok(!m.permissions.includes('tabGroups'));assert.ok(m.permissions.includes('tabs'));assert.ok(m.permissions.includes('storage'));assert.equal(m.background.type,'module');assert.deepEqual(requestedTargets(['--target=safari']),['safari']);assert.throws(()=>requestedTargets(['--target=unknown']));});
test('Firefox requests optional transmission consent only for sync; Chromium requests origins alone',async()=>{const ff={runtime:{getManifest:()=>manifestFor(manifest,'firefox')},permissions:{contains:async()=>false}};assert.deepEqual(syncPermissionRequest(['https://example.com/*'],ff),{origins:['https://example.com/*'],data_collection:['browsingActivity','authenticationInfo','bookmarksInfo','technicalAndInteraction']});await assert.rejects(()=>requireSyncConsent(ff),/授权数据传输/);ff.permissions.contains=async()=>true;await requireSyncConsent(ff);assert.deepEqual(syncPermissionRequest([],{}),{origins:[]});});
test('browser new-tab aliases are explicit and never match arbitrary web pages',()=>{for(const u of ['about:newtab','about:home','brave://newtab/','opera://startpage/','vivaldi://newtab/','favorites://'])assert.equal(isNewTabUrl(u),true);assert.equal(isNewTabUrl('https://example.com/newtab'),false);});
test('cross-browser internal links remain saveable without allowing executable URLs or extension pages',()=>{for(const u of ['about:preferences','brave://settings/','opera://settings/','vivaldi://settings/','favorites://'])assert.ok(safeUrl(u));for(const u of ['javascript:alert(1)','data:text/html,test','file:///tmp/test'])assert.throws(()=>safeUrl(u));assert.equal(collectableTabs([{url:'safari-web-extension://id/index.html'},{url:'https://example.com'}],DEFAULT_SETTINGS).length,1);});

test('Firefox search consent is independent from sync and preferences consent is conditional',async()=>{
 const calls=[],ff={runtime:{getManifest:()=>manifestFor(manifest,'firefox')},permissions:{request:async options=>{calls.push(options);return false;}}};
 const sync=syncPermissionRequest(['https://example.com/*'],ff,{syncPreferences:false});assert.deepEqual(sync.data_collection,['browsingActivity','authenticationInfo','bookmarksInfo']);assert.ok(!sync.data_collection.includes('searchTerms'));
 assert.equal(await requestSearchConsent(ff),false);assert.deepEqual(calls,[{data_collection:['searchTerms']}]);
 assert.equal(await requestSearchConsent({}),true);
 for(const revoked of ['browsingActivity','authenticationInfo','bookmarksInfo','technicalAndInteraction']){ff.permissions.contains=async request=>!request.data_collection.includes(revoked);await assert.rejects(()=>requireSyncConsent(ff,{syncPreferences:true}),/授权数据传输/);}
 ff.permissions.contains=async request=>!request.data_collection.includes('technicalAndInteraction');await requireSyncConsent(ff,{syncPreferences:false});
});

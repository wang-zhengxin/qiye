import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,SETTING_FIELDS,normalizeSettings,validateSettings,exportPreferences,importPreferences,portableSettings,inSyncWindow} from '../src/settings.js';

test('every configured field has a default and a real UI type',()=>{assert.equal(SETTING_FIELDS.length,77);assert.equal(new Set(SETTING_FIELDS.map(f=>f.key)).size,77);for(const f of SETTING_FIELDS)assert.ok(Object.hasOwn(DEFAULT_SETTINGS,f.key));});
test('old three-option preferences migrate and arrays are isolated',()=>{const a=normalizeSettings({theme:'dark',compact:true,closeAfterSave:true}),b=normalizeSettings();assert.equal(a.theme,'dark');assert.equal(a.duplicateTabs,'dedupe');a.contextActions.pop();assert.equal(b.contextActions.length,DEFAULT_SETTINGS.contextActions.length);});
test('unknown fields and credentials cannot enter a preference export',()=>{const data=exportPreferences({...DEFAULT_SETTINGS,password:'secret',token:'secret'});assert.equal(JSON.stringify(data).includes('secret'),false);assert.equal(Object.hasOwn(data.preferences,'password'),false);});
test('preference import is validated and automatic upload stays off',()=>{const source=exportPreferences({...DEFAULT_SETTINGS,syncProvider:'webdav',webdavUrl:'https://example.com/dav.json',autoSync:true});const imported=importPreferences(JSON.stringify(source));assert.equal(imported.autoSync,false);assert.equal(imported.webdavUrl,'https://example.com/dav.json');assert.throws(()=>importPreferences('{}'));});
test('portable sync preferences omit server and device startup behavior',()=>{const p=portableSettings({...DEFAULT_SETTINGS,webdavUrl:'https://private.test/',gistId:'abc',startupOpen:true});for(const key of ['webdavUrl','gistId','syncProvider','autoSync','startupOpen','restoreOnStartup'])assert.equal(Object.hasOwn(p,key),false);assert.equal(p.theme,'light');});
test('search delays accept zero and number fields are bounded',()=>{const s=normalizeSettings({searchDelay:0,searchLimit:100000,syncInterval:-10});assert.equal(s.searchDelay,0);assert.equal(s.searchLimit,200);assert.equal(s.syncInterval,1);});
test('foreground/background key conflicts cannot be saved',()=>{assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,backgroundModifier:'alt',foregroundModifier:'alt'}),/不能相同/);});
test('search always needs a source and a field',()=>{assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,searchSources:[]}),/至少/);assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,searchFields:[]}),/至少/);});
test('copy templates need a URL token',()=>{assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,copyTemplate:'{{title}}'}),/url/);});
test('sensitive URL credentials and invalid automatic sync are rejected',()=>{assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,syncProvider:'webdav',webdavUrl:'https://user:pass@example.com/'}));assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,autoSync:true}));assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,syncProvider:'gist',autoSync:true}),/手动同步/);});
test('multiple and overnight sync time windows work in local time',()=>{const at=(h,m)=>new Date(2026,9,16,h,m);assert.equal(inSyncWindow([{start:'23:00',end:'06:00'}],at(1,30)),true);assert.equal(inSyncWindow([{start:'23:00',end:'06:00'}],at(12,0)),false);assert.equal(inSyncWindow([{start:'09:00',end:'10:00'},{start:'14:00',end:'15:00'}],at(14,30)),true);});

test('WebDAV configuration rejects plaintext endpoints, including loopback and embedded credentials',()=>{
 for(const webdavUrl of ['http://example.com/file.json','http://127.0.0.1:8080/file.json','https://user:pass@example.com/file.json','ftp://example.com/file.json'])assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,syncProvider:'webdav',webdavUrl}));
 assert.equal(validateSettings({...DEFAULT_SETTINGS,syncProvider:'webdav',webdavUrl:'https://example.com/file.json'}).webdavUrl,'https://example.com/file.json');
});

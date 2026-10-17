import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../src/data.js';
import {STORAGE_KEY,PREFS_KEY,SECRETS_KEY,DEFAULT_SETTINGS} from '../src/settings.js';
const old='previous-app',data={[old+'-workspace-v1']:createDemoState(),[old+'-preferences-v2']:{...DEFAULT_SETTINGS,theme:'dark'},[old+'-sync-credentials-v1']:{password:'do-not-edit'}};
let fail=true;const removed=[];
globalThis.chrome={runtime:{id:'migration-test'},tabs:{},storage:{local:{get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,structuredClone(data[key])])),set:async value=>{if(fail)throw Error('storage full');Object.assign(data,structuredClone(value));},remove:async keys=>{for(const key of keys){removed.push(key);delete data[key];}}}}};
const {ensureStorageMigration}=await import('../src/storage.js');
test('failed migrations retain original data and a retry verifies the new copy before cleanup',async()=>{await assert.rejects(()=>ensureStorageMigration(),/storage full/);assert.ok(data[old+'-workspace-v1']);assert.equal(removed.length,0);fail=false;await ensureStorageMigration();assert.equal(data[STORAGE_KEY].groups.length,7);assert.equal(data[PREFS_KEY].theme,'dark');assert.equal(data[SECRETS_KEY].password,'do-not-edit');assert.equal(Object.hasOwn(data,old+'-workspace-v1'),false);assert.equal(removed.length,3);await ensureStorageMigration();assert.equal(removed.length,3);});

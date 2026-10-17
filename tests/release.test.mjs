import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {releaseVersion,releaseArchives,writeReleaseMetadata} from '../scripts/release.mjs';

test('release requires matching package, manifest and optional version tag',()=>{
  assert.equal(releaseVersion('1.5.0','1.5.0'),'1.5.0');
  assert.equal(releaseVersion('1.5.0','1.5.0','v1.5.0'),'1.5.0');
  assert.throws(()=>releaseVersion('1.5.0','1.4.0'),/不一致/);
  for(const tag of ['v1.4.0','1.5.0','v1.5.0-rc.1',''])assert.throws(()=>releaseVersion('1.5.0','1.5.0',tag),/发布标签/);
});

test('release rejects versions that cannot be shipped in browser manifests',()=>{
  for(const version of ['01.5.0','1.5','1.5.0-rc.1','65536.0.0','0.0.0','1.5.0\n',null])assert.throws(()=>releaseVersion(version,version),/版本必须/);
});

test('release checksums include only the three current-version packages and preserve browser caveats',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'qiye-release-'));
  try{
    await mkdir(join(directory,'artifacts'));
    await mkdir(join(directory,'docs/releases'),{recursive:true});
    await writeFile(join(directory,'docs/releases/v1.5.0.md'),'Release-specific changes.');
    await writeFile(join(directory,'artifacts/old-version.zip'),'stale package');
    const names=releaseArchives('1.5.0');
    for(const name of names)await writeFile(join(directory,'artifacts',name),name);
    await writeReleaseMetadata(directory,'1.5.0','example/qiye');
    const sums=await readFile(join(directory,'artifacts/SHA256SUMS'),'utf8');
    assert.equal(sums,names.map(name=>`${createHash('sha256').update(name).digest('hex')}  ${name}\n`).join(''));
    const notes=await readFile(join(directory,'artifacts/RELEASE_NOTES.md'),'utf8');
    assert.match(notes,/Release-specific changes/);
    assert.match(notes,/https:\/\/github.com\/example\/qiye\/blob\/v1\.5\.0\/README.en.md/);
    assert.match(notes,/Unsigned temporary test build/);
    assert.match(notes,/not an installable Safari app/);
    await rm(join(directory,'artifacts',names[2]));
    await rm(join(directory,'artifacts/SHA256SUMS'));
    await assert.rejects(()=>writeReleaseMetadata(directory,'1.5.0'),{code:'ENOENT'});
    await assert.rejects(()=>readFile(join(directory,'artifacts/SHA256SUMS')),{code:'ENOENT'});
  }finally{await rm(directory,{recursive:true,force:true});}
});

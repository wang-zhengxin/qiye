import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(import.meta.dirname,'..');

export function releaseVersion(projectVersion,manifestVersion,tag){
  if(typeof projectVersion!=='string'||projectVersion.trim()!==projectVersion||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(projectVersion)||projectVersion.split('.').some(part=>Number(part)>65535)||projectVersion==='0.0.0')throw new Error('版本必须是浏览器支持的三段数字，例如 1.5.0。');
  if(projectVersion!==manifestVersion)throw new Error('package.json 与 manifest.json 的版本不一致。');
  if(tag!==undefined&&tag!==`v${projectVersion}`)throw new Error(`发布标签必须为 v${projectVersion}，收到：${tag}`);
  return projectVersion;
}

export function releaseArchives(version){
  return ['chromium','firefox','safari-source'].map(target=>`qiye-workspace-${target}-v${version}.zip`);
}

export async function writeReleaseMetadata(directory,version,repository='wang-zhengxin/qiye'){
  const names=releaseArchives(version);
  const checksums=await Promise.all(names.map(async name=>{
    const bytes=await readFile(resolve(directory,'artifacts',name));
    return `${createHash('sha256').update(bytes).digest('hex')}  ${name}`;
  }));
  let changes='';
  try{changes=await readFile(resolve(directory,'docs/releases',`v${version}.md`),'utf8');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const documentation=`https://github.com/${repository}/blob/v${version}`;
  const notes=`# 栖页 Qiye v${version}

${changes.trim()}

## 下载与安装 / Downloads and installation

| 文件 / File | 用途 / Usage |
| --- | --- |
| \`${names[0]}\` | Chrome、Edge、Brave、Opera、Vivaldi（Chromium 120+）。先解压，在扩展管理页选择“加载已解压的扩展程序”。Extract, then choose **Load unpacked**. |
| \`${names[1]}\` | Firefox 140+ 未签名临时测试构建。在 \`about:debugging#/runtime/this-firefox\` 临时载入解压后的 \`manifest.json\`。Unsigned temporary test build; not a signed XPI. |
| \`${names[2]}\` | macOS Safari 转换源，需要另行打包和签名，不能直接安装。Conversion source requiring packaging and signing; not an installable Safari app. |
| \`SHA256SUMS\` | 三个 ZIP 的 SHA-256 校验值 / SHA-256 checksums for the three ZIP files. |

每个 ZIP 的根目录直接包含 \`manifest.json\`。GitHub 自动提供的 **Source code** 是项目源码，需要先构建。
Each extension ZIP has \`manifest.json\` at its root. GitHub's **Source code** archives must be built before loading.

校验下载 / Verify downloads（在下载目录执行 / run in the download directory）：

\`\`\`bash
# macOS
shasum -a 256 -c SHA256SUMS
# Linux
sha256sum -c SHA256SUMS
\`\`\`

校验全部三个文件前请先下载三个 ZIP。Download all three ZIP files before checking the complete checksum file.

[中文说明](${documentation}/README.md) · [English README](${documentation}/README.en.md) · [安装与更新 / Installation](${documentation}/INSTALL.md)

浏览器支持与验证范围见 README；Firefox 和 Safari 构建尚不代表对应商店已审核或签名。
See the README for compatibility and validation scope. Firefox and Safari builds are not store-approved or signed releases.
`;
  await writeFile(resolve(directory,'artifacts/SHA256SUMS'),checksums.join('\n')+'\n');
  await writeFile(resolve(directory,'artifacts/RELEASE_NOTES.md'),notes);
  return names;
}

async function main(args){
  for(const arg of args)if(arg!=='--check'&&!arg.startsWith('--tag='))throw new Error(`未知发布参数：${arg}`);
  const project=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
  const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
  const tag=args.find(arg=>arg.startsWith('--tag='))?.slice(6);
  const version=releaseVersion(project.version,manifest.version,tag);
  console.log(`版本校验通过：v${version}${tag?'（标签一致）':''}。`);
  if(!args.includes('--check')){
    execFileSync(process.execPath,[resolve(root,'scripts/package.mjs'),'--target=all'],{cwd:root,stdio:'inherit'});
    await writeReleaseMetadata(root,version,process.env.GITHUB_REPOSITORY||'wang-zhengxin/qiye');
    console.log('已生成三个发布 ZIP、artifacts/SHA256SUMS 与 artifacts/RELEASE_NOTES.md。');
  }
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`version=${version}\n`);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main(process.argv.slice(2));

import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {buildTargets} from './build.mjs';
const root=resolve(import.meta.dirname,'..');
if(process.platform!=='darwin')throw new Error('Safari 应用打包需要 macOS 和完整 Xcode。');
const tool=['safari-web-extension-packager','safari-web-extension-converter'].find(name=>spawnSync('xcrun',['--find',name],{encoding:'utf8'}).status===0);
if(!tool){console.error('未找到 Safari 扩展打包工具。请先安装完整 Xcode，并在 Xcode 设置中选择 Command Line Tools。dist-safari/ 与 Safari 源包仍可使用。');process.exit(1);}
await buildTargets(['safari']);
const result=spawnSync('xcrun',[tool,resolve(root,'dist-safari'),'--project-location',resolve(root,'safari-project'),'--app-name','Qiye','--bundle-identifier','app.qiye.workspace','--swift','--macos-only','--copy-resources','--no-open','--no-prompt'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
console.log('已生成 safari-project/。在 Xcode 中选择自己的签名团队后构建并运行；本步骤不会安装扩展或发布应用。');

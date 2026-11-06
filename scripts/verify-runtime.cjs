const asar=require('@electron/asar'),path=require('node:path');
function verifyRuntime(archive){
 const entries=new Set(asar.listPackage(archive).map(p=>p.replaceAll('\\','/').replace(/^\//,'')));
 const read=file=>JSON.parse(asar.extractFile(archive,file.split('/').join(path.sep)).toString());
 const seen=new Set();
 function resolvePackage(name,from){
  let dir=from;
  while(true){const file=(dir?dir+'/':'')+'node_modules/'+name+'/package.json';if(entries.has(file))return file;const parent=path.posix.dirname(dir);if(!dir||parent===dir)break;dir=parent==='.'?'':parent}
  throw Error(`安装包缺少运行依赖 ${name}（引用位置：${from||'应用根目录'}）`);
 }
 function visit(file){if(seen.has(file))return;seen.add(file);const pkg=read(file),dir=path.posix.dirname(file);for(const name of Object.keys(pkg.dependencies||{})){if(pkg.optionalDependencies?.[name])continue;visit(resolvePackage(name,dir==='.'?'':dir))}}
 visit('package.json');return seen.size;
}
if(require.main===module)console.log(`Runtime archive verified: ${verifyRuntime(process.argv[2])} package manifests.`);
module.exports={verifyRuntime};

const {execFileSync}=require('node:child_process');const path=require('node:path');
exports.default=async context=>{
 const archive=context.electronPlatformName==='darwin'?path.join(context.appOutDir,'UCatran.app','Contents','Resources','app.asar'):path.join(context.appOutDir,'resources','app.asar');
 console.log(`Verified ${require('./verify-runtime.cjs').verifyRuntime(archive)} runtime package manifests`);
 if(context.electronPlatformName==='darwin'){
  const app=path.join(context.appOutDir,'UCatran.app');
  execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
  execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
 }
};

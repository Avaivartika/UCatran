const {execFileSync}=require('node:child_process');const path=require('node:path');
exports.default=async context=>{
 if(context.electronPlatformName==='darwin'){
  const app=path.join(context.appOutDir,'UCatran.app');
  execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
  execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
 }
};

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pythonExecutable,windowChrome}=require('../desktop/platform.cjs');
test('runtime resolution selects the correct OS and architecture and rejects missing executable',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-platform-'));
 try{
 for(const [folder,exe] of [['cpython-3.12.13-macos-aarch64-none','bin/python3.12'],['cpython-3.12.13-windows-x86_64-none','python.exe']]){const p=path.join(base,'runtime/python',folder,exe);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'fixture')}
 assert.match(pythonExecutable(base,'win32','x64'),/windows.*python.exe$/);
 assert.match(pythonExecutable(base,'darwin','arm64'),/macos.*python3.12$/);
 assert.throws(()=>pythonExecutable(base,'win32','arm64'),/不匹配/);
 fs.unlinkSync(pythonExecutable(base,'win32','x64'));assert.throws(()=>pythonExecutable(base,'win32','x64'),/缺失/);
 }finally{fs.rmSync(base,{recursive:true,force:true})}
});
test('Windows keeps native window controls while macOS keeps traffic lights',()=>{
 assert.equal(windowChrome('win32').titleBarStyle,'hidden');assert.equal(windowChrome('win32').titleBarOverlay.height,35);assert.equal(windowChrome('darwin').titleBarStyle,'hiddenInset');assert.equal(windowChrome('darwin').titleBarOverlay,undefined);
});

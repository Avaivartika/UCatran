const fs=require('node:fs'),path=require('node:path');
function pythonExecutable(base,platform=process.platform,arch=process.arch){
 const dir=path.join(base,'runtime','python');
 const suffix=platform==='win32'?'windows':platform==='darwin'?'macos':'linux';
 const cpu=arch==='x64'?'x86_64':arch==='arm64'?'aarch64':arch;
 const folder=fs.existsSync(dir)&&fs.readdirSync(dir).find(n=>n.startsWith('cpython-')&&n.includes(suffix)&&n.includes(cpu));
 if(!folder)throw Error('连接器运行环境缺失或与系统不匹配，请重新安装应用');
 const exe=path.join(dir,folder,...(platform==='win32'?['python.exe']:['bin','python3.12']));
 if(!fs.existsSync(exe))throw Error('连接器 Python 程序缺失，请重新安装应用');
 return exe;
}
function windowChrome(platform=process.platform){return platform==='darwin'?{titleBarStyle:'hiddenInset'}:{titleBarStyle:'hidden',titleBarOverlay:{color:'#f1f1e7',symbolColor:'#293b29',height:35},autoHideMenuBar:true}}
module.exports={pythonExecutable,windowChrome};

delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron:electron}=require('@playwright/test'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {sse}=require('../tests/pi-response.cjs');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-资料 测试-'));const library=path.join(temp,'Library');fs.mkdirSync(library);const document=path.join(library,'中文 讲义.txt');fs.writeFileSync(document,'阳光照进书页。Windows 与 macOS 的资料读取测试。');
 let keySeen=false,toolSeen=false,app;
 const server=http.createServer((req,res)=>{let body='';req.on('data',x=>body+=x);req.on('end',()=>{try{keySeen=req.headers.authorization==='Bearer fixture-local-key';const d=JSON.parse(body),tool=d.messages.find(m=>m.role==='tool');if(tool){assert.match(tool.content,/阳光照进书页/);toolSeen=true}res.setHeader('Content-Type','text/event-stream');res.end(sse(tool?{role:'assistant',content:'本地中文资料读取成功。'}:{role:'assistant',tool_calls:[{id:'read-1',type:'function',function:{name:'read_document',arguments:JSON.stringify({path:document})}}]}))}catch(e){res.statusCode=500;res.end(e.message)}})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const env={...process.env,UCL_STUDY_TEST_HOME:temp,UCL_STUDY_DEMO:'0'};delete env.ELECTRON_RUN_AS_NODE;
 async function launch(){app=await electron.launch({executablePath:process.env.UCL_STUDY_EXECUTABLE||undefined,args:process.env.UCL_STUDY_EXECUTABLE?[]:[path.resolve(__dirname,'..')],env});const p=await app.firstWindow();await p.locator('.hero').waitFor();return p}
 try{
 let p=await launch();let result=await p.evaluate(()=>window.study.call('status'));assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.data.connected,false);
 await p.evaluate(async port=>{const r=await window.study.call('saveConfig',{baseUrl:`http://127.0.0.1:${port}/v1`,model:'fixture',apiKey:'fixture-local-key',shareData:true});if(!r.ok)throw Error(r.error)},server.address().port);
 assert(!fs.readFileSync(path.join(temp,'model-key')).includes(Buffer.from('fixture-local-key')));await app.close();app=null;
 p=await launch();result=await p.evaluate(()=>window.study.call('chat',{message:'读取本地讲义'}));assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.data,'本地中文资料读取成功。');assert(keySeen&&toolSeen);
 assert(!fs.readFileSync(path.join(temp,'workspace.json'),'utf8').includes('fixture-local-key'));
 console.log('Native bundled Python, Chinese paths/text, actual document tool round trip, encrypted key across restart passed.');
 }finally{if(app)await app.close();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:200})}
})().catch(e=>{console.error(e);process.exit(1)});

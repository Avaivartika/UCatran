delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {sse}=require('../tests/pi-response.cjs');
(async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-lifecycle-'));
 const server=http.createServer((req,res)=>{req.resume();req.on('end',()=>setTimeout(()=>{res.setHeader('Content-Type','text/event-stream');res.end(sse({content:'后台任务完成'}))},400))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const options={executablePath:process.env.UCL_STUDY_EXECUTABLE||process.env.UCL_STUDY_ELECTRON,args:process.env.UCL_STUDY_EXECUTABLE?[]:[path.resolve(__dirname,'..')],env:{...process.env,UCL_STUDY_TEST_HOME:home}};let app=await _electron.launch(options);
 try{
  let page=await app.firstWindow();await page.waitForFunction(()=>!!window.study);
  const call=(method,args)=>page.evaluate(([method,args])=>window.study.call(method,args),[method,args]);
  await call('saveConfig',{baseUrl:`http://127.0.0.1:${server.address().port}/v1`,model:'fixture',shareData:true});
  const pending=call('chat',{message:'后台测试'});await page.waitForTimeout(100);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/index.html')).close());
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.isVisible())),false);
  assert.equal((await pending).data,'后台任务完成');
  const {spawn}=require('node:child_process');
  const second=spawn(options.executablePath,options.args,{env:options.env,windowsHide:true,stdio:'ignore'});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{second.kill();reject(Error('Second instance did not exit'))},10000);second.on('error',reject);second.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Second instance failed'))})});
  assert(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.isVisible())));
  await app.evaluate(({app})=>app.emit('activate'));assert(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.isVisible())));
  const chats=await call('chats');const first=chats.data.find(c=>c.current).id;
  await call('newChat');assert.equal((await call('state')).data.conversations.length,0);
  await call('switchChat',{id:first});assert.equal((await call('state')).data.conversations.length,2);
  await app.close();app=await _electron.launch(options);page=await app.firstWindow();await page.waitForFunction(()=>!!window.study);
  assert.equal((await page.evaluate(()=>window.study.call('state'))).data.conversations.length,2);
  console.log('Close-to-tray during request, background completion, restore, independent chats, restart and explicit exit passed.');
 }finally{await app.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

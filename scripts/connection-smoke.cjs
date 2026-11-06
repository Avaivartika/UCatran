delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron}=require('@playwright/test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {sse}=require('../tests/pi-response.cjs');
(async()=>{
 let mode='success',requests=0;
 const server=http.createServer((req,res)=>{requests++;req.resume();req.on('end',()=>{
  if(mode==='wait')return;
  if(mode==='unauthorized'){res.writeHead(401);res.end('fixture-private-token');return}
  res.setHeader('Content-Type','text/event-stream');res.end(sse({content:'连接成功'}));
 })});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-connection-'));
 const app=await _electron.launch({executablePath:process.env.UCL_STUDY_EXECUTABLE,args:process.env.UCL_STUDY_EXECUTABLE?[]:[path.resolve(__dirname,'..')],env:{...process.env,UCL_STUDY_TEST_HOME:home}});
 try{
  const page=await app.firstWindow();await page.waitForFunction(()=>!!window.study);
  const call=(method,args)=>page.evaluate(([method,args])=>window.study.call(method,args),[method,args]);
  const config={baseUrl:`http://127.0.0.1:${server.address().port}/v1`,model:'fixture'};
  await call('saveConfig',config);
  assert.equal((await call('testConnection')).ok,false);assert.equal(requests,0);
  await call('saveConfig',{...config,shareData:true});
  const success=await call('testConnection');assert.equal(success.data.ok,true);assert.equal(success.data.stages.at(-1),'模型已回复');
  assert.equal((await call('state')).data.conversations.length,0);
  mode='unauthorized';const denied=await call('testConnection');assert.equal(denied.data.ok,false);assert.match(denied.data.error,/401/);assert(!denied.data.error.includes('fixture-private-token'));
  mode='wait';const pending=call('testConnection');
  await page.waitForTimeout(200);assert.equal((await call('saveConfig',config)).ok,false);
  await call('cancel');assert.match((await pending).data.error,/停止/);
  mode='success';assert.equal((await call('testConnection')).data.ok,true);
  await page.locator('nav button[data-view="settings"]').click();
  await page.getByRole('button',{name:'测试已保存的连接',exact:true}).click();
  await page.locator('#notice').filter({hasText:'连接可用'}).waitFor();
  console.log('Connection diagnostics: consent, real request, safe HTTP errors, cancellation, retry, settings lock and UI passed.');
 }finally{await app.close();server.closeAllConnections();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

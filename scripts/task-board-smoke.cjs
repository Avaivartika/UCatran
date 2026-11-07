delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron:electron}=require('@playwright/test'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{sse}=require('../tests/pi-response.cjs');
(async()=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-task-board-'));let app,requests=0;
const server=http.createServer((req,res)=>{let body='';req.on('data',b=>body+=b);req.on('end',()=>{requests++;const data=JSON.parse(body);assert(JSON.stringify(data).includes('报告要求'));assert(!data.tools?.length);res.setHeader('Content-Type','text/event-stream');res.end(sse({role:'assistant',content:'## 任务目标\n提交研究报告，解释方法与结论。来源：[R1]。\n\n## 自检\n- 检查报告结构。'}))})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 async function launch(){app=await electron.launch({executablePath:process.env.UCL_STUDY_EXECUTABLE||undefined,args:process.env.UCL_STUDY_EXECUTABLE?[]:[path.resolve(__dirname,'..')],env:{...process.env,UCL_STUDY_TEST_HOME:home,UCL_STUDY_DEMO:'1'}});const p=await app.firstWindow();await p.locator('.hero').waitFor();return p}
 let p=await launch();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.locator('#refresh').click();await p.locator('#notice').filter({hasText:'同步完成'}).waitFor();await p.locator('nav [data-view=deadlines]').click();await p.locator('.task-note').waitFor();assert.equal(await p.locator('.task-note').count(),1);await p.waitForFunction(()=>document.querySelector('.task-note-image img')?.naturalWidth>0);assert.equal(requests,0);await p.getByText('任务要求与资料',{exact:true}).click();await p.getByRole('heading',{name:'Moodle 原始任务要求',exact:true}).waitFor();await p.getByText('解释研究方法',{exact:true}).waitFor();
 await p.evaluate(async port=>{const result=await window.study.call('saveConfig',{baseUrl:`http://127.0.0.1:${port}/v1`,model:'task-fixture',shareData:true});if(!result.ok)throw Error(result.error)},server.address().port);
 await p.getByRole('button',{name:'✦ 生成任务讲解',exact:true}).click();await p.getByText('任务讲解已生成并保存在本机。',{exact:true}).waitFor();assert.equal(requests,1);assert.equal(((await p.locator('.task-ai .markdown').textContent()).match(/提交研究报告/g)||[]).length,1);await p.locator('.task-ai').getByRole('heading',{name:'任务目标',exact:true}).waitFor();
 const explanation=p.locator('.task-ai');
 await explanation.locator('summary').click();
 await explanation.locator('.markdown').waitFor({state:'hidden'});
 await explanation.locator('summary').press('Enter');
 await explanation.getByRole('heading',{name:'任务目标',exact:true}).waitFor();
 assert.equal(requests,1);
const style=await p.locator('.task-description').evaluate(n=>({font:getComputedStyle(n).fontFamily,color:getComputedStyle(n).color,size:getComputedStyle(n).fontSize}));assert.match(style.font,/system-ui/);assert.equal(style.size,'15px');await p.screenshot({path:'release-validation/task-board-demo.png',fullPage:true});
 for(const size of [{width:1280,height:850},{width:800,height:600}]){await p.setViewportSize(size);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 await app.close();p=await launch();await p.locator('nav [data-view=deadlines]').click();await p.locator('.task-ai summary').waitFor();
 assert.equal(await p.locator('.task-ai').getAttribute('open'),null);
 await p.getByText('展开 AI 任务讲解',{exact:true}).click();
 await p.locator('.task-ai').getByRole('heading',{name:'任务目标',exact:true}).waitFor();
 assert.equal(requests,1);assert.deepEqual(errors,[]);console.log('Task note images, original detail expansion, on-demand model explanation, source rendering, persistence, system fonts and narrow layout passed.');
}finally{if(app)await app.close();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true,maxRetries:10,retryDelay:200})}})().catch(e=>{console.error(e);process.exit(1)});

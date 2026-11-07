const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {createTaskService}=require('../desktop/task-service.cjs'),{sse}=require('./pi-response.cjs');
test('task explanations use isolated sourced context and persist selected evidence without changing chats',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-service-test-'));let seen;
 const server=http.createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{seen=JSON.parse(body);res.setHeader('Content-Type','text/event-stream');res.end(sse({role:'assistant',content:'提交研究报告，引用原始要求 [R1] 和资料 [M1，第1页]。'}))})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const state={config:{baseUrl:`http://127.0.0.1:${server.address().port}/v1`,model:'fixture',shareData:true},conversations:[{role:'user',content:'private unrelated chat'}]};const events=[];
  const service=createTaskService({getState:()=>state,save:()=>{},rpc:async(name,args)=>{assert.equal(name,'task_context');assert.deepEqual(args.materialIds,['file-1']);return {task:{id:'task-1',revision:'r1'},requirements:'原文要求：提交报告。',sources:[{id:'file-1',name:'brief.pdf',url:'https://moodle.ucl.ac.uk/pluginfile.php/a',parts:[{page:1,text:'研究方法与评分标准'}]}],warnings:[],selectedIds:['file-1']}},stopWorker:()=>{},getWindow:()=>null,dialog:{},getKey:()=>'',getFetch:()=>fetch,emit:e=>events.push(e),isChatBusy:()=>false,connectorHome:root});
  const result=await service.handle('summarizeTask',{id:'task-1',materialIds:['file-1']});
  assert.match(result.text,/R1/);assert.equal(result.sources[0].source,'M1');assert.equal(state.taskBriefs['task-1'].revision,'r1');assert.equal(state.conversations.length,1);assert(!JSON.stringify(seen).includes('private unrelated chat'));assert(!seen.tools?.length);assert(events.some(e=>e.type==='taskDelta'));
 }finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true})}
});
test('task model consent is checked before data access and export checks its generated file boundary',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-boundary-test-'));let accessed=false;
 try{
  const state={config:{baseUrl:'https://example.com/v1',model:'fixture',shareData:false}};
  const service=createTaskService({getState:()=>state,save:()=>{},rpc:async()=>{accessed=true;return{}},stopWorker:()=>{},getWindow:()=>null,dialog:{},getKey:()=>'',getFetch:()=>fetch,emit:()=>{},isChatBusy:()=>false,connectorHome:root});
  await assert.rejects(()=>service.handle('summarizeTask',{id:'task-1'}),/允许/);assert.equal(accessed,false);assert.equal(service.busy,false);
  const exports=path.join(root,'task-exports');fs.mkdirSync(exports);const source=path.join(exports,'bundle.zip'),target=path.join(root,'selected.zip');fs.writeFileSync(source,'PK fixture');
  const exporter=createTaskService({getState:()=>state,save:()=>{},rpc:async name=>name==='task_details'?{name:'Task',materials:[],revision:'r1'}:{path:source,included:0,unavailable:[]},stopWorker:()=>{},getWindow:()=>null,dialog:{showSaveDialog:async()=>({canceled:false,filePath:target})},getKey:()=>'',getFetch:()=>fetch,emit:()=>{},isChatBusy:()=>false,connectorHome:root});
  const result=await exporter.handle('exportTask',{id:'task-1',materialIds:[]});assert.equal(result.path,target);assert.equal(fs.readFileSync(target,'utf8'),'PK fixture');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

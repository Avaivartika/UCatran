const {app,BrowserWindow,ipcMain,safeStorage,dialog,shell,Notification,screen,Menu}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');
const {inside,safeLink,modelEndpoint,runAgent}=require('./core.cjs');
const {importCodex,accessToken,CODEX_URL}=require('./codex.cjs');
const {normalizeAppearance,updateAppearance,clampPetPosition}=require('./appearance.cjs');
const {pythonExecutable,windowChrome}=require('./platform.cjs');
const {createModelFetch}=require('./network.cjs');
const {agentOptions,codexModels}=require('./agent-config.cjs');
const {installLifecycle}=require('./lifecycle.cjs');let lifecycle;
const root=path.resolve(__dirname,'..');let petWin,petStatus='陪你读书',positionTimer,petDrag=null;let win,worker,seq=0,controller,chatBusy=false;const pending=new Map();
// Preserve prior workspace and OS encryption identity after the display-name change.
app.setName('UCL Study');
app.setPath('userData',process.env.UCL_STUDY_TEST_HOME||path.join(app.getPath('appData'),'UCL Study'));
const primary=app.requestSingleInstanceLock();if(!primary)app.quit();
const home=app.getPath('userData'), library=path.join(home,'Library'), connectorHome=path.join(home,'Moodle');
for(const p of [home,library,connectorHome])fs.mkdirSync(p,{recursive:true,mode:0o700});
const statePath=path.join(home,'workspace.json');
let state={config:{baseUrl:'',model:'',shareData:false},todos:[],conversations:[],cache:{},notified:[]};
try{state={...state,...JSON.parse(fs.readFileSync(statePath,'utf8'))}}catch{}
state.appearance=normalizeAppearance(state.appearance);
state.chatId ||= crypto.randomUUID();state.savedChats ||= [];
function snapshotChat(){return {id:state.chatId,title:state.conversations.find(m=>m.role==='user')?.content.slice(0,40)||'新对话',conversations:state.conversations,agentSession:state.agentSession,model:state.config.model,protocol:state.config.protocol,baseUrl:state.config.baseUrl,updatedAt:Date.now()}}
function retainChat(){const chat=snapshotChat();state.savedChats=state.savedChats.filter(c=>c.id!==chat.id);if(chat.conversations.length)state.savedChats.push(chat)}
function save(){const temp=statePath+'.tmp';fs.writeFileSync(temp,JSON.stringify(state),{mode:0o600});fs.renameSync(temp,statePath)}
function key(){try{return safeStorage.decryptString(fs.readFileSync(path.join(home,'model-key')))}catch{return ''}}
function visibleState(){return {chatId:state.chatId,appearance:state.appearance,config:{...state.config,hasKey:fs.existsSync(path.join(home,'model-key'))},todos:state.todos,conversations:state.conversations,cache:state.cache,library:files(),demo:process.env.UCL_STUDY_DEMO==='1'}}
function files(dir=library){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);if(e.isSymbolicLink())return [];return e.isDirectory()?files(p):[{name:e.name,path:p,size:fs.statSync(p).size}]})}
function petState(){return {...state.appearance,status:petStatus,busy:chatBusy}}
function sendPet(){if(petWin&&!petWin.isDestroyed())petWin.webContents.send('pet:state',petState())}
function emit(data){if(win&&!win.isDestroyed())win.webContents.send('agent:event',data);if(data.type==='tool'){petStatus=data.status==='running'?'正在查阅资料…':'资料已找到';sendPet()}}
function syncPet(){
 if(!state.appearance.petEnabled){if(petWin&&!petWin.isDestroyed())petWin.close();return}
 if(petWin&&!petWin.isDestroyed()){sendPet();return}
 const saved=state.petPosition;const display=saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)?screen.getDisplayNearestPoint({x:Math.round(saved.x),y:Math.round(saved.y)}):screen.getPrimaryDisplay();
 const position=clampPetPosition(saved,display.workArea);
 const pet=new BrowserWindow({width:210,height:250,...position,frame:false,transparent:true,resizable:false,maximizable:false,minimizable:false,alwaysOnTop:true,skipTaskbar:true,show:false,hasShadow:false,title:'UCatran 桌宠',webPreferences:{preload:path.join(__dirname,'pet-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 petWin=pet;pet.webContents.setWindowOpenHandler(()=>({action:'deny'}));pet.webContents.on('will-navigate',e=>e.preventDefault());
 pet.once('ready-to-show',()=>{if(!pet.isDestroyed())pet.showInactive()});
 pet.on('move',()=>{clearTimeout(positionTimer);positionTimer=setTimeout(()=>{if(!pet.isDestroyed()){const [x,y]=pet.getPosition();state.petPosition={x,y};save()}},250)});
 pet.on('closed',()=>{petDrag=null;clearTimeout(positionTimer);if(petWin===pet)petWin=null});
 pet.loadFile(path.join(root,'renderer/pet.html'));
}
function setAppearance(patch){state.appearance=updateAppearance(state.appearance,patch);save();syncPet();emit({type:'appearance',appearance:state.appearance});return state.appearance}

function pythonPath(){const base=app.isPackaged?process.resourcesPath:root;return {base,python:pythonExecutable(base)}}
function stopWorker(){if(worker){if(process.platform==='win32'&&worker.pid)spawn('taskkill',['/pid',String(worker.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});else worker.kill();}worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('连接器任务已停止'))}pending.clear()}
function getWorker(){
 if(worker)return worker;
 const {base,python}=pythonPath();
 const child=spawn(python,[path.join(base,'scripts/bridge.py')],{env:{...process.env,PYTHONPATH:[path.join(base,app.isPackaged?'moodle-mcp':'vendor/moodle-mcp'),path.join(base,'runtime/site')].join(path.delimiter),MOODLE_BASE_URL:'https://moodle.ucl.ac.uk',MOODLE_MCP_HOME:connectorHome,MOODLE_DOWNLOAD_DIR:library,PYTHONUNBUFFERED:'1',PYTHONIOENCODING:'utf-8',PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'},windowsHide:true,stdio:['pipe','pipe','pipe']});
 worker=child;child.stdout.setEncoding('utf8');let buffer='';child.stdout.on('data',chunk=>{buffer+=chunk;let pos;while((pos=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,pos);buffer=buffer.slice(pos+1);try{const d=JSON.parse(line),p=pending.get(d.id);if(p){clearTimeout(p.timer);pending.delete(d.id);d.error?p.reject(Error(d.error)):p.resolve(d.result)}}catch{}}});
 child.stderr.on('data',()=>{});
 child.on('error',()=>{if(worker===child)stopWorker()});child.on('exit',()=>{if(worker===child)stopWorker()});return child;
}
function demo(method,args){const due=Math.floor(Date.now()/1000)+3*86400;const course={id:101,name:'示例 · Machine Learning',shortname:'DEMO001',url:'https://moodle.ucl.ac.uk'};if(method==='local_status'||method==='status')return {connected:true,name:'演示同学',site:'示例数据'};if(method==='courses')return [course];if(method==='deadlines')return [{id:1,name:'示例 · Coursework 1',course:course.name,timestamp:due,url:course.url}];if(method==='browse')return {course:course.name,sections:[{name:'Week 1 · 示例',items:[{name:'Introduction to learning',type:'resource',description:'示例课程资料，不是真实 UCL 内容。',url:course.url,files:[]}]}]};throw Error('演示模式不执行登录或下载');}
function rpc(method,args={}){if(process.env.UCL_STUDY_DEMO==='1'&&!['read_document','search_library','index_library','logout'].includes(method))return Promise.resolve(demo(method,args));return new Promise((resolve,reject)=>{let child;try{child=getWorker()}catch(e){reject(e);return}const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('连接器超时，请重试'));stopWorker()},method==='login'?330000:180000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({id,method,args})+'\n')})}
const services=[{name:'UCL Moodle',description:'课程、作业、课程资料',url:'https://moodle.ucl.ac.uk'},{name:'UCL Library',description:'图书馆、文献、学习空间',url:'https://www.ucl.ac.uk/library/'},{name:'UCL Students',description:'学生支持、学业与校园事务',url:'https://www.ucl.ac.uk/students/'},{name:'UCL API',description:'学生开发者平台与校园数据接口',url:'https://uclapi.com/'}];
async function callTool(name,args={}){
 if(name==='library')return files();
 if(name==='todos')return state.todos;
 if(name==='services'){const q=String(args.query||'').toLowerCase();return services.filter(s=>!q||(s.name+s.description).toLowerCase().includes(q))}
 if(name==='add_todo'){const title=String(args.title||'').trim();if(!title||title.length>300)throw Error('待办标题需要 1–300 字');const due=String(args.due||'');if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))throw Error('日期格式应为 YYYY-MM-DD');const task={id:crypto.randomUUID(),title,due,done:false};state.todos.push(task);save();emit({type:'workspace'});return task}
 if(!['courses','deadlines','browse','read_document','search_library'].includes(name))throw Error('工具未授权');
 return rpc(name,args);
}
async function action(method,args={}){
 if(method==='chats')return [...state.savedChats.filter(c=>c.id!==state.chatId),snapshotChat()].map(({id,title,updatedAt})=>({id,title,updatedAt,current:id===state.chatId})).sort((a,b)=>b.updatedAt-a.updatedAt);
 if(method==='newChat'||method==='switchChat'){
  if(chatBusy)throw Error('请先停止当前任务，再切换对话');
  const selected=method==='switchChat'?state.savedChats.find(c=>c.id===args.id):null;
  if(method==='switchChat'&&args.id===state.chatId)return true;
  if(method==='switchChat'&&!selected)throw Error('对话不存在');
  retainChat();state.chatId=selected?.id||crypto.randomUUID();state.conversations=selected?.conversations||[];state.agentSession=selected&&['model','protocol','baseUrl'].every(k=>selected[k]===state.config[k])?selected.agentSession:undefined;save();return true;
 }
 if(method==='models')return {models:state.config.authMode==='codex-local'?codexModels():state.modelCatalog?.baseUrl===state.config.baseUrl?state.modelCatalog.models:[],source:state.config.authMode==='codex-local'?'本机 Codex 模型目录':'服务模型目录'};
 if(method==='refreshModels'){
  if(state.config.authMode==='codex-local')return action('models');
  if(!state.config.shareData)throw Error('请先在设置中保存数据发送许可');
  if(!state.config.baseUrl)throw Error('请先配置模型服务');
  modelEndpoint(state.config.baseUrl);
  const apiKey=key();const response=await createModelFetch(win.webContents.session)(state.config.baseUrl.replace(/\/$/,'')+'/models',{headers:apiKey?{Authorization:`Bearer ${apiKey}`}:{},signal:AbortSignal.timeout(15000)});
  const body=await response.json();if(!Array.isArray(body.data))throw Error('服务未返回有效模型列表，可手动填写模型 ID');
  const models=body.data.filter(m=>typeof m.id==='string'&&m.id.length<=200).slice(0,300).map(m=>({id:m.id,name:m.id}));
  state.modelCatalog={baseUrl:state.config.baseUrl,models};save();return action('models');
 }
 if(method==='configureAgent'){
  if(chatBusy)throw Error('请先停止当前任务，再调整助手');
  const model=String(args.model||'').trim();if(!model||model.length>200)throw Error('模型名称需要 1–200 字');
  const options=agentOptions(args);
  const metadata=state.config.authMode==='codex-local'?codexModels().find(m=>m.id===model):undefined;
  if(options.reasoning!=='auto'&&metadata?.reasoningLevels.length&&!metadata.reasoningLevels.includes(options.reasoning))throw Error('该模型不支持所选推理强度');
  if(state.config.model!==model)delete state.agentSession;
  state.config={...state.config,model,...options,modelContextWindow:metadata?.contextWindow||options.modelContextWindow};save();return visibleState().config;
 }
 if(method==='state')return visibleState();
 if(method==='setAppearance')return setAppearance(args);
 if(method==='status')return rpc('local_status');
 if(method==='login'){const r=await rpc('login');if(!r.ok)throw Error('未完成登录。学校可能未开启移动服务，或登录已超时。');return r}
 if(method==='logout'){stopWorker();await rpc('logout');state.cache={};save();return {ok:true}}
 if(method==='refresh'){const result=await Promise.allSettled([rpc('courses'),rpc('deadlines')]);const errors=[];result.forEach((r,i)=>{const k=i?'deadlines':'courses';if(r.status==='fulfilled')state.cache[k]={data:r.value,at:Date.now()};else errors.push(r.reason.message)});save();return {...visibleState(),errors:[...new Set(errors)]}}
 if(method==='browse')return rpc('browse',{course:String(args.course)});
 if(method==='download'){const r=await rpc('download',{url:String(args.url),name:String(args.name)});return r}
 if(method==='import'){const r=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections'],filters:[{name:'学习资料',extensions:['pdf','txt','md','csv']}]});if(r.canceled)return [];for(const f of r.filePaths){let name=path.basename(f),dest=path.join(library,name);if(fs.existsSync(dest))dest=path.join(library,Date.now()+'-'+name);fs.copyFileSync(f,dest,fs.constants.COPYFILE_EXCL)}return files()}
 if(method==='openFile'){const p=fs.realpathSync(String(args.path));if(!inside(library,p))throw Error('仅能打开资料库文件');shell.showItemInFolder(p);return true}
 if(method==='openLink'){await shell.openExternal(safeLink(String(args.url)));return true}
 if(method==='searchLibrary')return rpc('search_library',{query:String(args.query||''),rebuild:args.rebuild===true});
 if(method==='services')return services;
 if(method==='addTodo')return callTool('add_todo',args);
 if(method==='toggleTodo'){const t=state.todos.find(x=>x.id===args.id);if(t)t.done=!t.done;save();return state.todos}
 if(method==='deleteTodo'){state.todos=state.todos.filter(x=>x.id!==args.id);save();return state.todos}
 if(method==='importCodex'){
  if(chatBusy)throw Error('请先停止当前对话');
  const imported=importCodex();
  if(imported.apiKey){if(!safeStorage.isEncryptionAvailable())throw Error('系统密钥加密不可用，未导入');fs.writeFileSync(path.join(home,'model-key'),safeStorage.encryptString(imported.apiKey),{mode:0o600})}
  else fs.rmSync(path.join(home,'model-key'),{force:true});
  const sameService=['baseUrl','protocol','authMode'].every(k=>state.config[k]===imported.config[k]);
  state.config={...agentOptions(),...imported.config,shareData:sameService&&state.config.shareData===true};delete state.agentSession;save();return visibleState().config;
 }
 if(method==='saveConfig'){
  if(chatBusy)throw Error('请先停止当前对话');
  const baseUrl=String(args.baseUrl||'').trim(),model=String(args.model||'').trim();if(baseUrl)modelEndpoint(baseUrl);if(model.length>200)throw Error('模型名称过长');
  const protocol=args.protocol||'openai-completions';
  if(!['openai-completions','openai-responses','openai-codex-responses'].includes(protocol))throw Error('不支持的请求协议');
  const authMode=protocol==='openai-codex-responses'?'codex-local':'api-key';
  if(authMode==='codex-local'&&(state.config.authMode!=='codex-local'||baseUrl!==CODEX_URL||args.apiKey))throw Error('请使用一键接入 Codex 导入登录信息');
  if(args.apiKey){if(!safeStorage.isEncryptionAvailable())throw Error('系统密钥加密不可用，未保存 API key');fs.writeFileSync(path.join(home,'model-key'),safeStorage.encryptString(String(args.apiKey)),{mode:0o600})}
  if(args.clearKey)fs.rmSync(path.join(home,'model-key'),{force:true});
  state.config={...agentOptions(state.config),baseUrl,model,protocol,authMode,shareData:args.shareData===true};delete state.agentSession;save();return visibleState().config;
 }
 if(method==='cancel'){controller?.abort();stopWorker();return true}
 if(method==='clearChat'){if(chatBusy)throw Error('请先停止当前对话');state.conversations=[];delete state.agentSession;save();return true}
 if(method==='testConnection'){
  if(chatBusy)throw Error('请先停止当前对话或连接测试');
  if(!state.config.baseUrl||!state.config.model)throw Error('请先保存模型地址和模型名称');
  // The test sends only a fixed sentence, never history, courses, or documents.
  if(!state.config.shareData)throw Error('请先勾选数据发送许可并保存，再测试连接');
  chatBusy=true;controller=new AbortController();let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller?.abort()},45000);
  const stages=['配置已读取'];
  try{
   const apiKey=state.config.authMode==='codex-local'?accessToken():key();
   stages.push(apiKey?'认证信息可用':'未配置密钥（尝试本地或免密服务）');
   await runAgent({messages:[{role:'user',content:'这是连接测试，请只回答：连接成功'}],config:state.config,apiKey,toolsEnabled:false,signal:controller.signal,fetchImpl:createModelFetch(win.webContents.session)});
   stages.push('服务可达','模型已回复');return {ok:true,stages};
  }catch(e){return {ok:false,stages,error:timedOut?'连接测试超时，请检查系统代理和服务地址':controller.signal.aborted?'连接测试已停止':e.message}}
  finally{clearTimeout(timer);controller=null;chatBusy=false;sendPet()}
 }
 if(method==='chat'){
  if(chatBusy)throw Error('请等待当前回答完成');
  if(!state.config.baseUrl||!state.config.model)throw Error('请先在设置中填写模型 API 地址和模型名称');
  if(!state.config.shareData)throw Error('请先在设置中允许将问题及相关课程资料发送到你配置的模型服务');
  const prompt=String(args.message||'').trim();if(!prompt||prompt.length>12000)throw Error('问题需要 1–12000 字');
  chatBusy=true;petStatus='正在思考…';sendPet();controller=new AbortController();let partialText='',timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller?.abort()},agentOptions(state.config).timeoutSeconds*1000);
  state.conversations.push({role:'user',content:prompt});save();
  try{const result=await runAgent({session:state.agentSession,messages:state.conversations.filter(m=>!m.error).map(m=>({role:m.role,content:m.content})),config:state.config,apiKey:state.config.authMode==='codex-local'?accessToken():key(),callTool,onCheckpoint:session=>{state.agentSession=session;save()},onEvent:event=>{if(event.type==='delta')partialText+=event.text;emit(event)},signal:controller.signal,fetchImpl:createModelFetch(win.webContents.session)});state.agentSession=result.session;state.conversations.push({role:'assistant',content:result.text,meta:result.meta});save();return result.text}
  catch(e){if(e.session)state.agentSession=e.session;const message=controller.signal.aborted?(timedOut?'任务已超时，请调整任务超时设置或缩小范围':'任务已停止'):e.message;state.conversations.push({role:'assistant',content:partialText?partialText+'\n\n—— '+message:message,error:true});save();throw Error(message)}
  finally{clearTimeout(timer);controller=null;chatBusy=false;petStatus='陪你读书';sendPet();lifecycle?.notify()}
 }
 throw Error('未知操作');
}
app.whenReady().then(()=>{
 if(!primary)return;
 if(process.platform==='darwin')app.dock.setIcon(path.join(__dirname,'../renderer/assets/brand/ucatran.png'));
 if(process.platform==='win32')app.setAppUserModelId('local.uclstudy.desktop');
 app.setAboutPanelOptions({applicationName:'UCatran · 猫然',applicationVersion:app.getVersion(),copyright:'Catwarrior · Futuoran'});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'UCatran',submenu:[{role:'about',label:'关于 UCatran'},{type:'separator'},...(process.platform==='darwin'?[{role:'hide',label:'隐藏 UCatran'},{role:'hideOthers'},{role:'unhide'}]:[]),{type:'separator'},{role:'quit',label:'退出 UCatran'}]},{role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}]));
 win=new BrowserWindow({width:1280,height:850,minWidth:800,minHeight:600,title:'UCatran',backgroundColor:'#f4f6f8',...windowChrome(),icon:path.join(root,'renderer/assets/brand/ucatran.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
 ipcMain.handle('app:action',async(event,method,args)=>{if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('请求来源无效');try{return {ok:true,data:await action(method,args)}}catch(e){return {ok:false,error:e.message}}});
 ipcMain.handle('pet:action',async(event,method,args)=>{
  if(!petWin||event.sender!==petWin.webContents||event.senderFrame!==petWin.webContents.mainFrame)throw Error('请求来源无效');
  if(method==='state')return petState();
  if(method==='dragStart'){
   if(!Number.isFinite(args?.x)||!Number.isFinite(args?.y))throw Error('拖动坐标无效');
   const [x,y]=petWin.getPosition();petDrag={x,y,pointerX:args.x,pointerY:args.y};return true;
  }
  if(method==='dragMove'){
   if(!petDrag||!Number.isFinite(args?.x)||!Number.isFinite(args?.y))return false;
   const point={x:Math.round(args.x),y:Math.round(args.y)};
   const pos=clampPetPosition({x:petDrag.x+args.x-petDrag.pointerX,y:petDrag.y+args.y-petDrag.pointerY},screen.getDisplayNearestPoint(point).workArea);
   petWin.setPosition(pos.x,pos.y);return true;
  }
  if(method==='dragEnd'){petDrag=null;return true}
  if(method==='nudge'){
   if(!Number.isFinite(args?.dx)||!Number.isFinite(args?.dy))return false;
   const [x,y]=petWin.getPosition();const pos=clampPetPosition({x:x+Math.max(-24,Math.min(24,args.dx)),y:y+Math.max(-24,Math.min(24,args.dy))},screen.getDisplayNearestPoint({x,y}).workArea);petWin.setPosition(pos.x,pos.y);return true;
  }
  if(method==='hide')return setAppearance({petEnabled:false});
  if(method==='choose')return setAppearance({pet:args?.pet});
  if(method==='openChat'){if(win&&!win.isDestroyed()){win.show();if(win.isMinimized())win.restore();win.focus();emit({type:'navigate',view:'chat'})}return true}
  throw Error('未知桌宠操作');
 });
 win.loadFile(path.join(root,'renderer/index.html'));
 lifecycle=installLifecycle({app,window:win,icon:path.join(root,'renderer/assets/brand/ucatran.png'),onQuit:()=>{controller?.abort();stopWorker();save()},onStop:()=>{controller?.abort();stopWorker()},isBusy:()=>chatBusy});
 win.on('closed',()=>{win=null;if(petWin&&!petWin.isDestroyed())petWin.close()});
 syncPet();
 // Reminders apply only to explicit local tasks, while this app is running.
 setInterval(()=>{const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());for(const t of state.todos){const marker=t.id+':'+today;if(!t.done&&t.due&&t.due<=today&&!state.notified.includes(marker)){if(Notification.isSupported())new Notification({title:'学习待办提醒',body:t.title}).show();state.notified.push(marker)}}state.notified=state.notified.slice(-500);save()},60000).unref();
});
app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>{controller?.abort();stopWorker()});

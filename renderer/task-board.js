const taskDetailsCache=new Map(),taskCardStates=new Map();let activeTaskWork=null,taskBoardSearch='',taskBoardCourse='',taskBoardFilter='upcoming';
const taskTypeNames={...activityNames,coursework:'课程考核',calendar:'日历事项',questionnaire:'问卷',survey:'调查',scorm:'学习单元',hvp:'互动学习',h5pactivity:'互动学习',scheduler:'预约活动',checklist:'学习清单',data:'资料活动',wiki:'协作活动'};
async function getTaskDetails(id){if(!taskDetailsCache.has(id))taskDetailsCache.set(id,api('taskDetails',{id}).catch(error=>{taskDetailsCache.delete(id);throw error}));return taskDetailsCache.get(id)}
function isCourseDeadline(task){
 return task.category==='deadline';
}
function isUpcomingDeadline(task, now=Date.now()/1000){
 return isCourseDeadline(task)&&task.timestamp>=now&&!task.completed;
}
function taskNote(task){
 const card=el('article','task-note'),image=el('div','task-note-image'),body=el('div','task-note-body');image.setAttribute('aria-label',task.course+'课程图片');card.append(image,body);const course=(state.cache.courses?.data||[]).find(c=>String(c.id)===String(task.courseId));
 const meta=el('div','task-note-meta');meta.append(el('span','task-course',task.course),el('span','task-kind',taskTypeNames[task.type]||'课程活动'));body.append(meta,el('h2','task-name',task.name));
 const excerpts=(task.briefEvidence||[]).flatMap(source=>source.lines.map(line=>({...line,source:source.name})));
 const mainExcerpt=excerpts.find(line=>/word limit|word count|字数|\bsubmit\b/i.test(line.text))||excerpts[0];
 const original=(task.description||'').replace(/\s+/g,' ').trim();
 if(mainExcerpt){
  body.append(el('p','task-description',mainExcerpt.text),el('p','hint task-evidence-source',mainExcerpt.source+(mainExcerpt.page?' · 第 '+mainExcerpt.page+' 页':'')));
 }else if(original){
  const brief=original.length>240?original.slice(0,237).replace(/\s+\S*$/,'')+'…':original;
  body.append(el('p','task-description',brief));
 }
 if(task.section)body.append(el('p','hint task-evidence-source','课程章节 · '+task.section));
 const dateRow=el('div','task-date-row');
 const due=el('strong','task-due',task.timestamp?(task.dateLabel||'截止时间')+' · '+date(task.timestamp):'日期待确认');
 if(task.timestamp&&task.timestamp*1000<Date.now()&&!task.completed)due.classList.add('task-past-due');
 dateRow.append(due);
 if(task.completed)dateRow.append(el('span','task-status','课程标记已完成'));
 if(task.stale)dateRow.append(el('span','task-stale','缓存任务 · 本次未完整读取'));
 body.append(dateRow);
 const actions=el('div','row task-actions'),details=el('details','task-details'),detailLabel=el('summary','','任务要求与资料'),detailBody=el('div','task-detail-content'),status=el('p','task-work-status');status.setAttribute('role','status');details.append(detailLabel,detailBody);card.append(details,status);
 const explain=btn('✦ 生成任务讲解',()=>generate(),'small task-explain'),exportButton=btn('导出任务资料 ZIP',()=>exportBundle(),'small'),stop=btn('停止',()=>api('cancelTask',{id:task.id}),'ghost small');stop.hidden=true;
 actions.append(explain,exportButton,stop);if(task.url)actions.append(btn('原任务 ↗',()=>api('openLink',{url:task.url}),'ghost small'));body.append(actions);
 const ai=el('details','task-ai');
 const aiToggle=el('summary','','展开 AI 任务讲解');
 const aiMeta=el('p','hint'),aiText=el('div','markdown'),aiSources=el('p','task-ai-sources');
 ai.append(aiToggle,aiMeta,aiText,aiSources);
 ai.addEventListener('toggle',()=>{
  aiToggle.textContent=ai.open?'收起 AI 任务讲解':'展开 AI 任务讲解';
 });
 card.append(ai);
 ai.hidden=true;
 let loaded=null,selected=new Set(),loading=false,brief=state.taskBriefs?.[task.id];
 function drawBrief(value){if(!value?.text)return;brief=value;ai.hidden=false;aiMeta.textContent=`${value.model} · ${new Date(value.at).toLocaleString('zh-CN')} · 根据原文与资料生成，请核对来源`;aiText.replaceChildren();richText(aiText,value.text);aiSources.textContent='原始任务要求：R1。'+(value.sources?.length?'读取资料：'+value.sources.map(s=>s.source+' '+s.name).join('；'):'仅依据任务原文，未读取附件。')+(value.warnings?.length?'\n读取限制：'+value.warnings.join('；'):'');explain.textContent='✦ 重新生成讲解'}
 drawBrief(brief);
 async function ensureDetails(){
  if(loaded)return loaded;if(loading)return getTaskDetails(task.id);loading=true;detailBody.replaceChildren(el('p','hint','正在读取原始任务要求和资料关联…'));
  try{
   loaded=await getTaskDetails(task.id);selected=new Set(loaded.materials.filter(f=>f.recommended).map(f=>f.id));detailBody.replaceChildren();
   const source=el('div','task-original');source.append(el('h3','','Moodle 原始任务要求'),courseRichContent(loaded.content,loaded.description||'接口未提供完整说明，请核对任务原页面。'));for(const warning of loaded.warnings||[])source.append(el('p','task-error',warning));detailBody.append(source);
   if(loaded.briefEvidence?.length){
    const evidence=el('section','task-brief-evidence');
    evidence.append(el('h3','','作业说明摘录'));
    for(const file of loaded.briefEvidence){
     evidence.append(el('h4','',file.name));
     for(const line of file.lines)evidence.append(el('p','',(line.page?'第 '+line.page+' 页 · ':'')+line.text));
     if(!file.lines.length)evidence.append(el('p','hint',file.unread?'暂未读取正文，原文件仍列在课程资料中。':'请打开原文件核对具体要求。'));
    }
    detailBody.append(evidence);
   }
   if(loaded.schedule?.length){const times=el('section','task-times');times.append(el('h3','','活动相关时间'));for(const item of loaded.schedule)times.append(el('p','',`${item.name} · ${date(item.timestamp)} · ${item.source}`));detailBody.append(times)}
   if(brief&&brief.revision!==loaded.revision)aiMeta.textContent+=' · 任务内容已更新，请重新生成';
   const heading=el('div','task-material-heading');heading.append(el('h3','',`课程资料 · ${loaded.materials.length}`),el('p','hint','默认勾选任务附件、原文引用与同章节考核资料，可补充选择；讲解和 ZIP 使用同一资料范围。'));
   const list=el('div','task-materials'),find=el('input','search');find.placeholder='筛选资料名称、章节或活动';find.setAttribute('aria-label','筛选任务资料');detailBody.append(heading,find,list);
   const count=el('p','task-selection-count');heading.append(count);let visible=30;
   function selectedCount(){count.textContent=`已选 ${selected.size} 份资料 · ${readableBytes(loaded.materials.filter(f=>selected.has(f.id)).reduce((n,f)=>n+f.size,0))}`}
   function drawFiles(){list.replaceChildren();const q=find.value.trim().toLowerCase(),files=loaded.materials.filter(f=>(f.name+' '+f.section+' '+f.activity).toLowerCase().includes(q));for(const f of files.slice(0,visible)){const label=el('label','task-material'),check=el('input');check.type='checkbox';check.checked=selected.has(f.id);check.setAttribute('aria-label','包含资料 '+f.name);check.onchange=()=>{check.checked?selected.add(f.id):selected.delete(f.id);selectedCount();if(brief)aiMeta.textContent='资料选择已调整；现有讲解保留原来源，可重新生成。'};const text=el('div');text.append(el('strong','',f.name),el('small','',`${f.reason} · ${f.section} · ${readableBytes(f.size)}`));label.append(check,text);list.append(label)}if(files.length>visible)list.append(btn(`显示更多资料（余 ${files.length-visible} 份）`,()=>{visible+=30;drawFiles()},'ghost small'));if(!files.length)list.append(el('p','hint','没有匹配的课程资料。'));selectedCount()}
   const bulk=el('div','row');bulk.append(btn('选择推荐资料',()=>{selected=new Set(loaded.materials.filter(f=>f.recommended).map(f=>f.id));drawFiles()},'ghost small'),btn('选择筛选结果',()=>{const q=find.value.trim().toLowerCase();for(const f of loaded.materials.filter(f=>(f.name+' '+f.section+' '+f.activity).toLowerCase().includes(q)))selected.add(f.id);drawFiles()},'ghost small'),btn('清空选择',()=>{selected.clear();drawFiles()},'ghost small'));heading.append(bulk);find.oninput=()=>{visible=30;drawFiles()};drawFiles();
   if(loaded.links?.length){const links=el('details','task-online-links');links.append(el('summary','',`原任务在线参考链接 · ${loaded.links.length}`));for(const link of loaded.links)links.append(btn(link.name+' ↗',()=>api('openLink',{url:link.url}),'ghost small'));detailBody.append(links)}
   return loaded;
  }catch(error){detailBody.replaceChildren(el('p','task-error',error.message),btn('重试读取',()=>ensureDetails(),'small'));throw error}finally{loading=false}
 }
 function busy(value){explain.disabled=value;exportButton.disabled=value;stop.hidden=!value;card.setAttribute('aria-busy',String(value));if(value){activeTaskWork=task.id;taskCardStates.set(task.id,{status,ai,aiText,aiMeta})}else{if(activeTaskWork===task.id)activeTaskWork=null;taskCardStates.delete(task.id)}}
 async function generate(){details.open=true;await ensureDetails();busy(true);ai.hidden=false;ai.open=true;aiMeta.textContent=`使用 ${state.config.model||'当前模型'}，正在读取任务与所选资料…`;aiText.replaceChildren();aiSources.textContent='';status.textContent='正在准备任务讲解…';try{const result=await api('summarizeTask',{id:task.id,materialIds:[...selected]});state.taskBriefs||={};state.taskBriefs[task.id]=result;drawBrief(result);status.textContent='任务讲解已生成并保存在本机。'}catch(error){status.textContent=error.message;aiMeta.textContent='本次讲解未完成；已输出的内容仅供参考。';throw error}finally{busy(false)}}
 async function exportBundle(){await ensureDetails();busy(true);status.textContent='正在准备任务资料包…';try{const result=await api('exportTask',{id:task.id,materialIds:[...selected]});status.textContent=result.canceled?'已取消导出':`ZIP 已导出，包含任务要求及 ${result.included} 份资料。`+(result.unavailable?.length?`有 ${result.unavailable.length} 份未能获取，详见包内资料清单。`:'');}finally{busy(false)}}
 details.ontoggle=()=>{if(details.open&&!loaded&&!loading)ensureDetails().catch(e=>notice(e.message))};requestAnimationFrame(()=>courseCover(image,task.image||course?.image,task.course+'课程图片'));return card;
}
function deadlines(){
 if(activeTaskWork){const banner=el('div','task-active-banner');banner.append(el('span','','任务正在后台处理'),btn('停止当前任务',()=>activeTaskWork?api('cancelTask',{id:activeTaskWork}):notice('任务已结束'),'small'));page.append(banner)}
 const records=state.cache.deadlines?.data||[],coverage=state.cache.taskCoverage;
 const tasks=records.filter(task=>isCourseDeadline(task)||task.category==='action');
 const upcoming=tasks.filter(task=>isUpcomingDeadline(task)).length;
 const summary=el('div','task-board-intro');
 summary.append(el('h2','','课程截止日期'),el('p','',upcoming+' 项即将截止'));
 page.append(summary,source('deadlines'));
 const audit=el('details','task-coverage');
 const courses=coverage?.data||[];
 const issues=(coverage?.warnings||[]).length+courses.reduce((n,c)=>n+(c.ok?0:1)+(c.warnings?.length||0),0);
 audit.append(el('summary','',courses.length?'同步范围 · '+courses.filter(c=>c.ok).length+' / '+courses.length+' 门课程'+(issues?' · '+issues+' 项读取提示':''):'同步范围'));
 if(courses.length){
  audit.append(el('p','',`已从课程活动、完成状态和日历核对。识别出 ${tasks.length} 项截止事项或明确活动。讲义、公告和阅读资料可在「我的课程」查看。`));
  for(const c of courses) audit.append(el('p',c.ok?'':'task-error',c.course+' · '+(c.ok?'已扫描':'读取失败，保留此前记录')+(c.warnings?.length?' · '+c.warnings.join('；'):'')));
  for(const warning of coverage.warnings||[])audit.append(el('p','task-error',warning));
 }
 page.append(audit);
 if(!records.some(task=>task.category)){
  page.append(empty('请重新同步课程任务','点击右上角「同步 Moodle」，按任务证据整理已缓存的课程记录。'));
  return;
 }
 const controls=el('div','task-board-controls'),search=el('input','search'),course=el('select'),filter=el('select');search.placeholder='搜索任务、课程或任务说明';search.value=taskBoardSearch;search.setAttribute('aria-label','搜索课程任务');course.setAttribute('aria-label','任务所属课程');filter.setAttribute('aria-label','任务范围');const all=el('option','','全部课程');all.value='';course.append(all);for(const name of [...new Set(tasks.map(t=>t.course))].sort()){const o=el('option','',name);o.value=name;course.append(o)}course.value=taskBoardCourse;
 for(const [value,label] of [['upcoming','即将截止'],['history','历史截止'],['action','待确认日期'],['completed','已完成']]){
  const option=el('option','',label);option.value=value;filter.append(option);
 }
 filter.value=taskBoardFilter;
 controls.append(search,course,filter);page.append(controls,el('p','task-board-note','伦敦时间 · 历史截止与完成状态分别显示'));
 const list=el('div','task-note-list'),count=el('p','hint');page.append(count,list);
 let shown=30;
 function draw(){
  taskBoardSearch=search.value;taskBoardCourse=course.value;taskBoardFilter=filter.value;
  const query=search.value.trim().toLowerCase(),now=Date.now()/1000;
  const matches=tasks.filter(task=>{
   if(course.value&&task.course!==course.value)return false;
   const searchable=[task.name,task.course,task.description,task.section,...(task.briefEvidence||[]).flatMap(source=>source.lines.map(line=>line.text))].join(' ').toLowerCase();
   if(query&&!searchable.includes(query))return false;
   if(filter.value==='completed')return task.completed;
   if(filter.value==='action')return task.category==='action'&&!task.completed;
   if(filter.value==='history')return isCourseDeadline(task)&&task.timestamp<now;
   return isUpcomingDeadline(task,now);
  });
  const direction=filter.value==='history'?-1:1;
  matches.sort((a,b)=>direction*((a.timestamp||0)-(b.timestamp||0))||a.name.localeCompare(b.name));
  list.replaceChildren();
  count.textContent=matches.length+' 项'+(matches.length>shown?' · 显示前 '+shown+' 项':'');
  for(const task of matches.slice(0,shown))list.append(taskNote(task));
  if(!matches.length)list.append(empty('当前筛选下没有任务','可切换课程、任务范围或搜索词。'));
  if(matches.length>shown)list.append(btn('继续显示任务',()=>{shown+=30;draw()},'ghost'));
 }
 search.oninput=()=>{shown=30;draw()};course.onchange=()=>{shown=30;draw()};filter.onchange=()=>{shown=30;draw()};draw();
}
window.study.onEvent(event=>{
 if(event.type==='taskProgress'){
  if(event.phase==='scan'&&!activeTaskWork){const status=$('#notice');if(status)status.textContent=`正在扫描课程任务：${event.done} / ${event.total} 门课程…`}
  const current=taskCardStates.get(activeTaskWork);if(current)current.status.textContent=`${event.message} ${event.done} / ${event.total}${event.file?' · '+event.file:''}`;
 }
 if(event.type==='taskPhase'){const current=taskCardStates.get(event.id);if(current)current.status.textContent=event.text}
 if(event.type==='taskDelta'){const current=taskCardStates.get(event.id);if(current){current.aiText.textContent+=event.text;current.aiMeta.textContent='AI 正在生成任务讲解…'}}
});

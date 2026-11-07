/* Course and library views. All Moodle content is rendered as safe DOM nodes. */
let courseListQuery='',courseListOrder='recent',courseRequest=0,libraryScope='';
const coverRequests=new Map();
const activityNames={resource:'文件资料',folder:'资料文件夹',url:'外部链接',page:'课程页面',book:'课程书籍',label:'课程说明',assign:'作业',quiz:'测验',forum:'讨论区',feedback:'反馈',choice:'选择活动',lesson:'学习单元',workshop:'互评活动',attendance:'出勤',lti:'外部学习工具',glossary:'术语表'};
function friendlyLibraryPath(value){return String(value||'').split(/[\\/]/).filter(p=>p!=='Moodle').map(p=>p==='Personal'?'个人资料':p.replace(/^\d+ · /,'')).join(' / ')}
function readableBytes(size){return size>=1048576?(size/1048576).toFixed(1)+' MB':size>=1024?(size/1024).toFixed(1)+' KB':(size||0)+' B'}
function courseCover(container,url,alt){
 if(!url)return;
 const img=el('img','course-cover-image');img.alt=alt||'';img.decoding='async';container.append(img);
 const done=data=>{if(container.isConnected){img.src=data;img.onload=()=>container.classList.add('has-course-image');img.onerror=()=>img.remove()}};
 if(url.startsWith('assets/')){done(url);return}
 if(!coverRequests.has(url)){if(coverRequests.size>100)coverRequests.clear();coverRequests.set(url,api('courseImage',{url}).then(r=>r.data).catch(()=>null))}
 coverRequests.get(url).then(data=>{if(data)done(data);else{img.remove();coverRequests.delete(url)}});
}
function courseRichContent(nodes,fallback=''){
 const root=el('div','course-rich');
 const allowed=new Set(['p','div','span','h2','h3','h4','h5','h6','ul','ol','li','strong','b','em','i','u','blockquote','table','thead','tbody','tr','th','td','br','hr','a','img']);
 function append(parent,node){
  if(typeof node?.text==='string'){parent.append(document.createTextNode(node.text));return}
  if(!allowed.has(node?.tag))return;
  if(node.tag==='img'){
   const frame=el('figure','course-inline-image');const alt=el('figcaption','muted',node.alt||'课程图片');frame.append(alt);parent.append(frame);
   if(node.url){courseCover(frame,node.url,node.alt);const link=btn('在原页面查看图片 ↗',()=>api('openLink',{url:node.url}),'ghost small');frame.append(link)}
   return;
  }
  const child=el(node.tag);
  if(node.tag==='a'&&node.url){child.href=node.url;child.onclick=e=>{e.preventDefault();api('openLink',{url:node.url}).catch(e=>notice(e.message))}}
  if(['td','th'].includes(node.tag))for(const attr of ['colspan','rowspan'])if(Number.isInteger(node[attr]))child.setAttribute(attr,String(node[attr]));
  for(const item of node.children||[])append(child,item);
  if(node.tag==='table'){const wrap=el('div','table-scroll');wrap.append(child);parent.append(wrap)}else parent.append(child);
 }
 if(nodes?.length)for(const node of nodes)append(root,node);else if(fallback)for(const paragraph of fallback.split(/\n+/))root.append(el('p','',paragraph));
 return root;
}
function courses(){
 page.append(source('courses'));
 const bar=el('div','course-list-toolbar'),search=el('input','search'),sort=el('select');
 search.placeholder='搜索课程名称或代码';search.setAttribute('aria-label','搜索课程');search.value=courseListQuery;sort.setAttribute('aria-label','课程排序');
 for(const [id,label]of [['recent','最近访问'],['name','课程名称'],['code','课程代码']]){const option=el('option','',label);option.value=id;sort.append(option)}sort.value=courseListOrder;
 const count=el('span','muted'),grid=el('div','course-card-grid');bar.append(search,sort,count);page.append(bar,grid);
 const draw=()=>{
  courseListQuery=search.value;courseListOrder=sort.value;grid.replaceChildren();
  const cs=(state.cache.courses?.data||[]).filter(c=>(c.name+' '+c.shortname).toLowerCase().includes(search.value.toLowerCase()));
  cs.sort((a,b)=>sort.value==='recent'?(b.lastAccess||0)-(a.lastAccess||0):String(sort.value==='code'?a.shortname:a.name).localeCompare(String(sort.value==='code'?b.shortname:b.name),'zh-CN'));
  count.textContent=cs.length+' 门课程';
  if(!cs.length)grid.append(empty('暂无匹配课程','先同步 Moodle，或换一个关键词。'));
  for(const c of cs){
   const card=el('article','course course-card'),cover=el('div','course-card-cover');cover.dataset.variant=String(Number(c.id)%4);cover.append(el('span','course-cover-code',c.shortname||'MOODLE'));card.append(cover);
   const body=el('div','course-card-body');body.append(el('span','code',c.shortname),el('h3','',c.name));if(c.summary)body.append(el('p','course-card-summary',c.summary));
   if(typeof c.progress==='number'){const progress=el('progress');progress.max=100;progress.value=c.progress;progress.setAttribute('aria-label','课程完成进度');const row=el('div','course-progress');row.append(progress,el('small','',Math.round(c.progress)+'%'));body.append(row)}
   const actions=el('div','row');actions.append(btn('浏览课程 →',()=>browse(c),'primary'),btn('Moodle ↗',()=>api('openLink',{url:c.url}),'ghost small'));body.append(actions);card.append(body);grid.append(card);courseCover(cover,c.image,c.name+'课程封面');
  }
 };
 search.oninput=draw;sort.onchange=draw;draw();
}
async function browse(c){
 const request=++courseRequest;notice('正在读取课程章节和资料…');
 const data=await api('browse',{course:String(c.id)});if(view!=='courses'||request!==courseRequest)return;
 notice();currentCourse=data;page.replaceChildren();
 const back=btn('← 返回课程',()=>{++courseRequest;currentCourse=null;render()},'ghost');const links=el('div','row');links.append(back,btn('在 Moodle 打开 ↗',()=>api('openLink',{url:data.url||c.url}),'ghost'));page.append(links);
 const hero=el('section','course-detail-hero'),copy=el('div','course-detail-copy');copy.append(el('small','',data.shortname||c.shortname),el('h2','',data.course));hero.append(copy);page.append(hero);courseCover(hero,data.image||c.image,data.course+'课程封面');
 const sections=data.sections||[],allFiles=sections.reduce((n,s)=>n+s.items.reduce((m,i)=>m+(i.files||[]).length,0),0);copy.append(el('p','',`${sections.length} 个章节 · ${allFiles} 份可下载资料`));
 const toolbar=el('div','course-content-toolbar'),search=el('input','search'),filter=el('select');search.placeholder='搜索这门课的章节、活动或文件';search.setAttribute('aria-label','搜索课程内容');filter.setAttribute('aria-label','课程内容类型');for(const [id,label]of [['all','全部内容'],['files','可下载资料'],['activity','学习活动'],['notes','课程说明']]){const o=el('option','',label);o.value=id;filter.append(o)}toolbar.append(search,filter);page.append(toolbar);
 const layout=el('div','course-content-layout'),outline=el('nav','course-outline'),content=el('div','course-section-content');outline.setAttribute('aria-label','课程章节');layout.append(outline,content);page.append(layout);
 let selected=0,shown=30;
 const fileCounts=s=>(s.items||[]).reduce((n,m)=>n+(m.files||[]).length,0);
 const matches=(s,m)=>{const q=search.value.trim().toLowerCase();return (!q||(s.name+' '+m.name+' '+m.description+' '+(m.files||[]).map(f=>f.name).join(' ')).toLowerCase().includes(q))&&(filter.value==='all'||filter.value==='files'&&(m.files||[]).length||filter.value==='notes'&&['label','page','book'].includes(m.type)||filter.value==='activity'&&!['label','resource','folder'].includes(m.type))};
 function resourceRow(file,module){
  const row=el('div','course-file'),label=el('div','grow'),suffix=(file.name||'').split('.').pop().toUpperCase();label.append(el('strong','',file.name),el('small','muted',`${suffix.length<8?suffix+' · ':''}${readableBytes(file.size)}${file.filepath&&file.filepath!=='/'?' · '+file.filepath:''}`));
  const download=btn('下载到资料库',async()=>{const original=download.textContent;download.textContent='正在下载…';try{const r=await api('download',{...file,courseId:data.id||c.id,moduleId:module.id});download.textContent=r.exists?'已在资料库 ✓':'已下载 ✓';notice(`资料已归档：${r.course||data.course} → ${r.section||'课程资料'}`);await load()}catch(error){download.textContent=original;throw error}},'small');row.append(label,download);return row;
 }
 function moduleCard(module,section){
  const card=el('article','course-module'+(module.type==='label'?' course-note':'')),head=el('div','course-module-head'),title=el('div','grow');title.append(el('span','activity-kind',activityNames[module.type]||'课程活动'),el('h3','',module.name));head.append(title);if(module.completed)head.append(el('span','tag','已完成'));if(module.url)head.append(btn('打开活动 ↗',()=>api('openLink',{url:module.url}),'ghost small'));card.append(head);
  if(search.value.trim())card.prepend(el('small','muted course-result-section',section.name));
  if(module.content?.length||module.description){const rich=courseRichContent(module.content,module.description);if((module.description||'').length>1200){const more=el('details','course-description-more');more.append(el('summary','','阅读完整说明'),rich);card.append(el('p','course-description-preview',(module.description||'').slice(0,260)+'…'),more)}else card.append(rich)}
  const files=module.files||[];if(files.length){const wrap=el('div','course-files');wrap.append(el('h4','',`资料文件 · ${files.length}`));for(const f of files.slice(0,5))wrap.append(resourceRow(f,module));if(files.length>5){const more=el('details','course-more-files');more.append(el('summary','',`展开其余 ${files.length-5} 份资料`));for(const f of files.slice(5))more.append(resourceRow(f,module));wrap.append(more)}card.append(wrap)}
  if(!module.description&&!files.length&&!module.url)card.append(el('p','hint','此活动的详情请在 Moodle 课程页查看。'));
  return card;
 }
 function draw(){
  outline.replaceChildren();sections.forEach((s,index)=>{const b=btn('',()=>{selected=index;search.value='';shown=30;draw()},'course-chapter');b.setAttribute('aria-current',String(index===selected&&!search.value.trim()));b.append(el('span','',s.name||'课程概览'),el('small','',`${(s.items||[]).length} 项 · ${fileCounts(s)} 份资料`));outline.append(b)});
  content.replaceChildren();if(!sections.length){content.append(empty('课程暂未提供可见章节','可打开 Moodle 课程页面查看。'));return}
  const selectedSection=sections[selected]||sections[0],searching=!!search.value.trim(),active=searching?sections:[selectedSection];
  content.append(el('h2','course-section-title',searching?'课程搜索结果':selectedSection.name||'课程概览'));
  if(!searching&&(selectedSection.content?.length||selectedSection.summary))content.append(courseRichContent(selectedSection.content,selectedSection.summary));
  const matched=active.flatMap(s=>(s.items||[]).filter(m=>matches(s,m)).map(m=>({m,s})));content.append(el('p','hint',`${matched.length} 项内容${searching?' · 按原课程章节排序':''}`));
  for(const {m,s}of matched.slice(0,shown))content.append(moduleCard(m,s));
  if(matched.length>shown)content.append(btn(`显示更多（余 ${matched.length-shown} 项）`,()=>{shown+=30;draw()},'ghost'));
  if(!matched.length)content.append(empty(searching?'没有匹配的课程内容':'此章节没有匹配内容','可更换关键词或内容类型。'));
  if(!searching){const row=el('div','course-section-pager');if(selected>0)row.append(btn('← 上一章节',()=>{selected--;shown=30;draw()},'ghost'));if(selected<sections.length-1)row.append(btn('下一章节 →',()=>{selected++;shown=30;draw()},'ghost'));content.append(row)}
 }
 search.oninput=()=>{shown=30;draw()};filter.onchange=()=>{shown=30;draw()};draw();
}
function library(){
 const heading=el('div','library-heading'),copy=el('div');copy.append(el('h2','','我的学习资料'),el('p','hint','按课程、章节和活动归档。支持检索 PDF、TXT、Markdown、CSV 正文。'));heading.append(copy);
 const importer=el('div','library-import'),courseSelect=el('select');courseSelect.setAttribute('aria-label','导入资料所属课程');const personal=el('option','','个人资料');personal.value='';courseSelect.append(personal);for(const c of state.cache.courses?.data||[]){const o=el('option','',c.name);o.value=String(c.id);courseSelect.append(o)}
 importer.append(courseSelect,btn('＋ 导入资料',async()=>{await api('import',{courseId:courseSelect.value||undefined});await load();render()},'primary'));heading.append(importer);page.append(heading);
 const organize=btn('整理旧版 Moodle 下载',async()=>{notice('正在识别旧下载所属课程与章节…');const r=await api('organizeLibrary');await load();render();notice(`已整理 ${r.moved} 份资料。${r.unmatched||r.ambiguous||r.failed?`仍有 ${r.unmatched+r.ambiguous+r.failed} 份或课程需要核对；文件均保留。`:'资料已按课程和章节归档。'}`)},'ghost small');
 const layout=el('div','library-layout'),groups=el('nav','library-groups'),body=el('section','library-content');groups.setAttribute('aria-label','资料课程分类');layout.append(groups,body);page.append(layout);
 const form=el('form','row library-search'),query=el('input','search'),submit=el('button','primary','全文检索');query.placeholder='检索当前分类的正文或文件名';query.setAttribute('aria-label','搜索资料');form.append(query,submit);
 const controls=el('div','library-list-controls'),type=el('select'),order=el('select');type.setAttribute('aria-label','资料类型');order.setAttribute('aria-label','资料排序');for(const [id,name]of [['all','全部文件'],['pdf','PDF'],['text','文本与笔记'],['slides','演示文稿'],['other','其他文件']]){const o=el('option','',name);o.value=id;type.append(o)}for(const [id,name]of [['recent','最近下载'],['name','文件名称']]){const o=el('option','',name);o.value=id;order.append(o)}controls.append(type,order,organize);
 const scopeHeading=el('h3','library-scope-title'),status=el('p','hint'),results=el('div','library-results');body.append(scopeHeading,form,controls,status,results);
 const groupMap=new Map();for(const f of state.library){const key=f.course==='待归档'?'@unfiled':f.scope||'';if(!groupMap.has(key))groupMap.set(key,{name:f.course||'待归档',count:0});groupMap.get(key).count++}
 if(libraryScope&&!groupMap.has(libraryScope))libraryScope='';let shown=50,searchVersion=0;
 function selectedFiles(){return state.library.filter(f=>!libraryScope||(f.course==='待归档'?'@unfiled':f.scope)===libraryScope)}
 function accepted(name){const ext=name.split('.').pop().toLowerCase();return type.value==='all'||type.value==='pdf'&&ext==='pdf'||type.value==='text'&&['txt','md','csv'].includes(ext)||type.value==='slides'&&['ppt','pptx','key'].includes(ext)||type.value==='other'&&!['pdf','txt','md','csv','ppt','pptx','key'].includes(ext)}
 function drawGroups(){groups.replaceChildren();for(const [key,label,count]of [['','全部资料',state.library.length],...[...groupMap].sort((a,b)=>a[1].name.localeCompare(b[1].name,'zh-CN')).map(([key,g])=>[key,g.name.replace(/^\d+ · /,''),g.count])]){const b=btn('',async()=>{libraryScope=key;const courseId=/^Moodle\/(\d+) · /.exec(key)?.[1];courseSelect.value=courseId||'';shown=50;drawGroups();if(query.value.trim())await search();else drawFiles()},'library-group');b.setAttribute('aria-current',String(libraryScope===key));b.append(el('span','',label),el('small','',String(count)));groups.append(b)}}
 function drawFiles(){++searchVersion;results.replaceChildren();const files=selectedFiles().filter(f=>accepted(f.name));files.sort((a,b)=>order.value==='name'?a.name.localeCompare(b.name,'zh-CN'):(b.modified||0)-(a.modified||0));scopeHeading.textContent=libraryScope?(groupMap.get(libraryScope)?.name||'当前分类').replace(/^\d+ · /,''):'全部资料';status.textContent=`${files.length} 份资料 · ${readableBytes(files.reduce((n,f)=>n+f.size,0))}`;
  for(const f of files.slice(0,shown)){const row=el('article','library-file-row'),label=el('div','grow');label.append(el('strong','',f.name),el('small','library-file-path',[f.course||'待归档',f.section].filter(Boolean).join(' / ')),el('small','muted',readableBytes(f.size)+(f.modified?' · '+new Date(f.modified).toLocaleDateString('zh-CN'):'')));const actions=el('div','row');if(/\.(pdf|txt|md|csv)$/i.test(f.name))actions.append(btn('问助手',async()=>{await go('chat');$('#prompt').value=`请读取资料库中的「${f.relativePath||f.name}」，总结核心内容，并注明来源。`},'small'));actions.append(btn('归类',()=>classifyLibraryFile(f),'ghost small'),btn('在文件夹中显示',()=>api('openFile',{path:f.path}),'ghost small'));row.append(label,actions);results.append(row)}
  if(!files.length)results.append(empty('这个分类还没有资料','从课程下载文件，或选择所属课程后导入。'));if(files.length>shown)results.append(btn(`显示更多（余 ${files.length-shown} 份）`,()=>{shown+=50;drawFiles()},'ghost'));
 }
 async function search(){if(!query.value.trim()){drawFiles();return}const request=++searchVersion;submit.disabled=true;status.textContent='正在检索当前分类…';try{const data=await api('searchLibrary',{query:query.value,scope:libraryScope});if(view!=='library'||request!==searchVersion)return;results.replaceChildren();scopeHeading.textContent=libraryScope?(groupMap.get(libraryScope)?.name||'当前分类').replace(/^\d+ · /,''):'全部资料';const hits=data.results.filter(h=>accepted(h.file));status.textContent=`找到 ${hits.length} 个相关片段 · 已索引 ${data.documents} 份资料`+(data.warnings.length?` · ${data.warnings.length} 份文件未能提取正文`:'');for(const hit of hits){const card=el('article','search-hit');card.append(el('strong','',hit.file+' · '+(hit.page?'第 '+hit.page+' 页':'片段 '+hit.part)),el('small','library-file-path',friendlyLibraryPath(hit.relativePath||hit.file)),el('p','',hit.excerpt),btn('基于此资料提问',async()=>{await go('chat');$('#prompt').value=`请阅读「${hit.relativePath||hit.file}」中与「${query.value}」相关的内容，并注明来源页码或片段。`},'small'),btn('显示来源文件',()=>api('openFile',{path:hit.path}),'ghost small'));results.append(card)}if(!hits.length)results.append(empty('没有找到匹配片段','可更换关键词、资料类型或课程分类。'))}catch(error){if(request===searchVersion)status.textContent=error.message}finally{submit.disabled=false}}
 form.onsubmit=e=>{e.preventDefault();search()};type.onchange=()=>query.value.trim()?search():drawFiles();order.onchange=()=>query.value.trim()?search():drawFiles();drawGroups();drawFiles();
}

function classifyLibraryFile(file){const dialog=el('dialog','agent-dialog library-classify-dialog'),heading=el('h2','','归档资料'),select=el('select');select.setAttribute('aria-label','归档到课程');const personal=el('option','','个人资料');personal.value='';select.append(personal);for(const c of state.cache.courses?.data||[]){const option=el('option','',c.name);option.value=String(c.id);select.append(option)}const row=el('div','row');const close=()=>{dialog.close();dialog.remove()};row.append(btn('取消',close,'ghost'),btn('归档资料',async()=>{await api('classifyFile',{path:file.path,courseId:select.value||undefined});close();await load();render();notice('资料已归档')},'primary'));dialog.append(heading,el('p','',file.name),select,row);dialog.oncancel=()=>dialog.remove();page.append(dialog);dialog.showModal()}

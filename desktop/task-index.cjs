function pageNumber(value,fallback,max){const n=value??fallback;if(!Number.isInteger(n)||n<0||n>max)throw Error('分页参数无效');return n}
function taskPage(tasks,coverage,args={}){
 const offset=pageNumber(args.offset,0,Number.MAX_SAFE_INTEGER),limit=pageNumber(args.limit,50,100);if(!limit)throw Error('每页至少一项');
 const list=[...tasks].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 return {total:list.length,offset,nextOffset:offset+limit<list.length?offset+limit:null,tasks:list.slice(offset,offset+limit).map(t=>Object.fromEntries(['id','name','course','courseId','type','timestamp','completed','completionKnown','stale','sources','url'].map(k=>[k,t[k]]))),coverage,note:'包含无日期和过去日期的活动，不等同于全部必交作业；nextOffset 非空时继续读取，不能把一页当作完整任务目录。'};
}
function taskDetailPage(details,args={}){
 const textOffset=pageNumber(args.textOffset,0,Number.MAX_SAFE_INTEGER),materialOffset=pageNumber(args.materialOffset,0,Number.MAX_SAFE_INTEGER),text=details.description||'',limit=40,textLimit=10000;
 return {id:details.id,name:details.name,course:details.course,url:details.url,timestamp:details.timestamp,schedule:details.schedule,requirements:text.slice(textOffset,textOffset+textLimit),requirementsChars:text.length,textOffset,nextTextOffset:textOffset+textLimit<text.length?textOffset+textLimit:null,materials:details.materials.slice(materialOffset,materialOffset+limit),totalMaterials:details.materials.length,materialOffset,nextMaterialOffset:materialOffset+limit<details.materials.length?materialOffset+limit:null,warnings:details.warnings,note:'原始要求与资料均有分页，继续读取剩余页后才能声称已完整查看。'};
}
module.exports={taskPage,taskDetailPage};

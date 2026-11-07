import { Type } from 'typebox';
// First-party connectors only: no arbitrary plugin code is loaded into Electron.
export const connectors = [
 {id:'moodle', tools:[['courses','列出本人 Moodle 课程',{}],['deadlines','分页读取全部课程任务、无日期活动与日历事项；必须沿 nextOffset 继续读取，含覆盖情况，不代表未交作业',{offset:Type.Optional(Type.Integer({minimum:0})),limit:Type.Optional(Type.Integer({minimum:1,maximum:100}))}],['task_details','读取任务原始要求与相关资料目录；按 nextTextOffset 与 nextMaterialOffset 继续读取完整内容',{id:Type.String({minLength:1}),textOffset:Type.Optional(Type.Integer({minimum:0})),materialOffset:Type.Optional(Type.Integer({minimum:0}))}],['browse','读取课程章节、活动和资料',{course:Type.String()}]]},
 {id:'library',tools:[['search_library','全文检索本地资料，返回原文片段、路径、PDF页码或文本片段编号；优先检索再读取',{query:Type.String({minLength:1,maxLength:200})}],['library','列出本地资料库',{}],['read_document','读取资料库 PDF 或文本，可指定 PDF 页码；默认前 60 页 / 60000 字符',{path:Type.String(),page:Type.Optional(Type.Integer({minimum:1}))}]]},
 {id:'tasks',tools:[['todos','列出本地待办',{}],['add_todo','仅当用户明确要求时创建本地待办',{title:Type.String({minLength:1,maxLength:300}),due:Type.String({pattern:'^(|[0-9]{4}-[0-9]{2}-[0-9]{2})$'})}]]},
 {id:'services',tools:[['services','搜索校园服务入口，不执行办理',{query:Type.String()}]]}
];
export function createTools(callTool) {
 return connectors.flatMap(connector=>connector.tools.map(([name,description,properties])=>({
  name,label:description,description,parameters:Type.Object(properties,{additionalProperties:false}),executionMode:'sequential',
  async execute(_id,args,signal) {
   if(signal?.aborted)throw Error('已停止');
   const value=await callTool(name,args,signal);
   if(signal?.aborted)throw Error('已停止');
   if(value?.error)throw Error(value.error);
   return {content:[{type:'text',text:JSON.stringify(value).slice(0,70000)}],details:{connector:connector.id}};
  }
 })));
}

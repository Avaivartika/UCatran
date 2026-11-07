"""Line-delimited JSON bridge around the vendored Moodle connector, read-only."""
import json, sys, os, re, shutil
from pathlib import Path
from urllib.parse import urlparse
from moodle_mcp.config import load_settings
from moodle_mcp.moodle import Moodle, MoodleError, LoginRequired
from moodle_mcp.auth import browser_login
from bs4 import BeautifulSoup
from course_catalog import rich_content, course_image_url, public_url, image_data, download_resource, organize_downloads
from task_board import scan_tasks, task_details, task_context, export_task
s = load_settings()
s.home.mkdir(parents=True, exist_ok=True, mode=0o700)
if os.name != 'nt': os.chmod(s.home, 0o700)

def clean(x): return BeautifulSoup(x or '', 'html.parser').get_text(' ', strip=True)
def run(method, args):
    if method in ('search_library','index_library'):
        from library_index import search_library
        return search_library(s.download_dir,s.home,args.get('query',''),args.get('rebuild',False),args.get('scope',''))
    if method == 'login': return browser_login(s, timeout_s=300)
    if method == 'logout':
        s.token_path.unlink(missing_ok=True)
        shutil.rmtree(s.profile_dir, ignore_errors=True)
        return {'ok': True}
    if method == 'local_status': return {'connected':s.token_path.exists(), 'site':s.base_url}
    if method == 'read_document':
        p = Path(args['path']).resolve()
        if not p.is_relative_to(s.download_dir.resolve()) or not p.is_file(): raise ValueError('只能读取资料库内的文件')
        if p.stat().st_size > 30*1024*1024: raise ValueError('文件超过 30 MB')
        if p.suffix.lower() == '.pdf':
            from pypdf import PdfReader
            reader = PdfReader(p)
            requested=args.get('page')
            if requested is not None and (not isinstance(requested,int) or requested<1 or requested>len(reader.pages)): raise ValueError('PDF 页码超出范围')
            pages=[reader.pages[requested-1]] if requested else reader.pages[:60]
            text = '\n'.join((page.extract_text() or '') for page in pages)
        elif p.suffix.lower() in ('.txt','.md','.csv'): text = p.read_text(encoding='utf-8-sig', errors='replace')
        else: raise ValueError('目前支持 PDF、TXT、Markdown 和 CSV 文本读取')
        return {'file':p.name,'text':text[:60000],'limited':len(text)>60000,'page':args.get('page'),'note':'未指定页码时 PDF 最多读取前 60 页；可按检索结果指定页码；扫描件未提供 OCR'}
    mo = Moodle(s)
    try:
        if method == 'status':
            info = mo.site_info()
            return {'connected': True, 'name':info.get('fullname'), 'site':s.base_url}
        if method == 'course_image': return image_data(mo, args.get('url',''))
        if method == 'organize_downloads': return organize_downloads(mo)
        if method == 'courses': return [{'id':c['id'],'name':c['fullname'],'shortname':c['shortname'],'url':f"{s.base_url}/course/view.php?id={c['id']}", 'image':course_image_url(c,s.base_url),'summary':clean(c.get('summary'))[:400], 'progress':c.get('progress'), 'lastAccess':c.get('lastaccess',0), 'startDate':c.get('startdate')} for c in mo.courses()]
        if method == 'tasks': return scan_tasks(mo,progress)
        if method == 'deadlines': return scan_tasks(mo,progress)['tasks']
        if method == 'task_details': return task_details(mo,str(args['id']))
        if method == 'task_context': return task_context(mo,str(args['id']),args.get('materialIds'),args.get('maxChars',20000),progress)
        if method == 'task_export': return export_task(mo,str(args['id']),args.get('materialIds'),str(args.get('explanation','')),progress)
        if method == 'browse':
            c = mo.find_course(str(args['course']))
            sections = []
            for sec in mo.course_contents(c['id']):
                items=[]
                for m in sec.get('modules',[]):
                    if m.get('uservisible') is False: continue
                    item={'id':m['id'],'name':m['name'],'type':m.get('modname'),'url':public_url(m.get('url'),s.base_url) if m.get('url') else '', 'description':clean(m.get('description'))[:6000], 'indent':min(4,max(0,m.get('indent',0))), 'completed':bool((m.get('completiondata') or {}).get('state')), 'files':[{'name':f.get('filename'),'url':public_url(f.get('fileurl'),s.base_url),'size':f.get('filesize'),'modified':f.get('timemodified'),'mimetype':f.get('mimetype'),'filepath':f.get('filepath')} for f in m.get('contents',[]) if f.get('type')=='file']}
                    if args.get('rich'): item['content']=rich_content(m.get('description'),s.base_url)
                    items.append(item)
                section={'id':sec.get('id'),'number':sec.get('section',len(sections)),'name':sec.get('name'),'summary':clean(sec.get('summary'))[:6000],'items':items}
                if args.get('rich'): section['content']=rich_content(sec.get('summary'),s.base_url)
                if sec.get('uservisible') is not False: sections.append(section)
            return {'id':c['id'],'course':c['fullname'],'shortname':c['shortname'],'url':f"{s.base_url}/course/view.php?id={c['id']}",'image':course_image_url(c,s.base_url),'sections':sections}
        if method == 'download':
            url=args['url']; u=urlparse(url); origin=urlparse(s.base_url)
            if u.scheme!='https' or u.netloc!=origin.netloc or not (u.path.startswith('/webservice/pluginfile.php/') or u.path.startswith('/pluginfile.php/')): raise ValueError('只允许下载当前 Moodle 的课程文件')
            if not args.get('courseId') or not args.get('moduleId'): raise ValueError('请从所属课程中下载资料')
            return download_resource(mo,args)
        raise ValueError('不支持的连接器工具')
    finally: mo._client.close()

def progress(**value):
    print(json.dumps({'id':req['id'],'progress':value},ensure_ascii=False),flush=True)

for line in sys.stdin:
    try:
        req=json.loads(line)
        try: result={'id':req['id'],'result':run(req['method'],req.get('args',{}))}
        except LoginRequired: result={'id':req['id'],'error':'请先连接 UCL Moodle，或重新登录刷新会话。'}
        except (ValueError,MoodleError) as e: result={'id':req['id'],'error':str(e)}
        except Exception: result={'id':req['id'],'error':'连接器执行失败。请检查网络、学校移动服务权限或浏览器是否可用。'}
        print(json.dumps(result,ensure_ascii=False),flush=True)
    except Exception: pass

import unittest,tempfile,sys,json,zipfile
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from task_board import scan_tasks,task_details,task_context,export_task,selected_materials

class TaskBoardTests(unittest.TestCase):
    def moodle(self,root):
        m=Mock();m.settings.home=Path(root);m.settings.base_url='https://moodle.ucl.ac.uk'
        m.site_info.return_value={'userid':123}
        m.courses.return_value=[{'id':1,'fullname':'Course A','overviewfiles':[],'enablecompletion':True},{'id':2,'fullname':'Course B','overviewfiles':[]}]
        m.upcoming.return_value=[{'id':7,'name':'Calendar task','modulename':'coursework','instance':'70','eventtype':'due','timestart':2000000000,'course':{'id':1,'fullname':'Course A'},'url':'https://moodle.ucl.ac.uk/mod/coursework/view.php?id=10','description':'<p>Calendar original requirement</p>'}]
        resource={'type':'file','filename':'brief.txt','filesize':36,'fileurl':'https://moodle.ucl.ac.uk/pluginfile.php/1/brief.txt?token=private-token'}
        sections={1:[{'id':100,'name':'Assessment','modules':[{'id':10,'instance':70,'modname':'coursework','name':'Coursework','description':'<p>Write a report.</p>','url':'https://moodle.ucl.ac.uk/mod/coursework/view.php?id=10'},{'id':11,'modname':'quiz','instance':71,'name':'Undated quiz','description':'<p>Complete the practice.</p>'},{'id':12,'modname':'resource','name':'Assignment brief','contents':[resource]}]}],2:[{'id':200,'name':'Learning','modules':[{'id':20,'modname':'choice','instance':80,'name':'Undated choice'}]}]}
        m.course_contents.side_effect=lambda cid:sections[cid]
        def call(name,**args):
            if name=='core_group_get_course_user_groups':return {'groups':[]}
            if name=='core_calendar_get_calendar_events':return {'events':[{'id':8,'courseid':1,'name':'Manual task','description':'Manual requirement','timestart':2000000100,'eventtype':'user'}]}
            if name=='core_completion_get_activities_completion_status':
                self.assertEqual(args['userid'],123)
                return {'statuses':[{'cmid':11,'tracking':1,'state':1}]}
            if name=='mod_assign_get_assignments':return {'courses':[{'id':2,'assignments':[{'id':90,'coursemodule':21,'name':'API-only assignment','intro':'Submit one report','duedate':2000000200}]}]}
            return {}
        m.call.side_effect=call
        m.download.side_effect=lambda url,dest,**kwargs:(dest.write_text('Assignment material: report methods.',encoding='utf8') or 0)
        return m,sections

    def test_combines_all_courses_undated_api_only_calendar_and_completions(self):
        with tempfile.TemporaryDirectory() as temp:
            m,_=self.moodle(temp);data=scan_tasks(m);tasks=data['tasks']
            self.assertEqual(len(tasks),5);self.assertEqual(len(data['coverage']),2)
            self.assertEqual(sum(t['type']=='coursework' for t in tasks),1)
            self.assertTrue(any(t['name']=='API-only assignment' for t in tasks))
            self.assertTrue(any(t['name']=='Manual task' for t in tasks))
            self.assertTrue(any(not t['timestamp'] and t['type']=='choice' for t in tasks))
            self.assertTrue(next(t for t in tasks if t['type']=='quiz')['completed'])
            m.upcoming.assert_called_once_with(None)
            self.assertFalse(any('_html' in t for t in tasks))

    def test_failure_retains_prior_tasks_and_marks_coverage_incomplete(self):
        with tempfile.TemporaryDirectory() as temp:
            m,sections=self.moodle(temp);scan_tasks(m)
            def read(cid):
                if cid==2:raise RuntimeError('network')
                return sections[cid]
            m.course_contents.side_effect=read;data=scan_tasks(m)
            self.assertFalse(next(c for c in data['coverage'] if c['courseId']==2)['ok'])
            self.assertTrue(next(t for t in data['tasks'] if t['name']=='Undated choice')['stale'])

    def test_bundle_and_model_context_include_requirements_selected_sources_not_tokens(self):
        with tempfile.TemporaryDirectory() as temp:
            m,_=self.moodle(temp);scan_tasks(m);details=task_details(m,'cm:1:10')
            self.assertEqual(len(details['materials']),1);self.assertTrue(details['materials'][0]['recommended'])
            self.assertNotIn('private-token',json.dumps(details))
            context=task_context(m,'cm:1:10');self.assertIn('report methods',context['sources'][0]['parts'][0]['text'])
            with self.assertRaises(ValueError): selected_materials(details,['untrusted-file'])
            bundle=export_task(m,'cm:1:10',explanation='AI explanation [R1]')
            with zipfile.ZipFile(bundle['path']) as archive:
                self.assertIn('任务要求.md',archive.namelist());self.assertIn('AI任务讲解_仅供参考.md',archive.namelist())
                manifest=json.loads(archive.read('资料清单.json'));self.assertEqual(manifest['files'][0]['status'],'included')
                self.assertNotIn('private-token',json.dumps(manifest));self.assertEqual(bundle['included'],1)
            empty=export_task(m,'cm:1:10',ids=[])
            self.assertEqual(empty['included'],0)

    def test_failed_material_is_reported_not_claimed_included(self):
        with tempfile.TemporaryDirectory() as temp:
            m,_=self.moodle(temp);scan_tasks(m);m.download.side_effect=RuntimeError('unavailable')
            bundle=export_task(m,'cm:1:10');self.assertEqual(bundle['included'],0);self.assertEqual(len(bundle['unavailable']),1)
            with zipfile.ZipFile(bundle['path']) as archive:self.assertEqual(json.loads(archive.read('资料清单.json'))['files'][0]['status'],'unavailable')

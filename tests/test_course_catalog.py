import unittest, tempfile, sys
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from course_catalog import rich_content, destination, public_url, organize_downloads, locate_resource, download_resource
from library_index import search_library

class CourseCatalogTests(unittest.TestCase):
    def test_preserves_structure_without_active_html_or_credentials(self):
        nodes=rich_content('<h2>Week 1</h2><p>Read <strong>chapter 2</strong></p><ul><li>Task</li></ul><script>bad()</script><a href="javascript:bad()">bad link</a><a href="/course/view.php?id=1&token=secret">Course</a><table><tr><td colspan="2">Value</td></tr></table>','https://moodle.ucl.ac.uk')
        self.assertEqual(nodes[0]['tag'],'h2')
        self.assertNotIn('secret',str(nodes));self.assertNotIn('script',str(nodes));self.assertNotIn('bad()',str(nodes))
        self.assertIn("'colspan': 2",str(nodes));self.assertIn("'tag': 'li'",str(nodes))
        self.assertEqual(public_url('https://user:password@example.org/a','https://moodle.ucl.ac.uk'),'')

    def test_download_paths_keep_course_section_and_activity_separate(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);course={'id':17,'fullname':'Light / Colour: 学习课程'};section={'id':2,'section':1,'name':'Week 1 / Introduction'}
            first=destination(root,course,section,'a'*200+'.pdf',{'id':50,'name':'Lecture materials'})
            second=destination(root,course,section,'a'*200+'.pdf',{'id':51,'name':'Lecture materials'})
            self.assertTrue(first.is_relative_to(root.resolve()));self.assertNotEqual(first,second)
            self.assertLess(len(str(first)),245);self.assertIn('17 · Light _ Colour_ 学习课程',str(first));self.assertTrue(str(first).endswith('.pdf'))
            self.assertEqual(destination(root,course,section,'CON').name,'_CON')

    def test_scoped_search_does_not_mix_courses_with_same_filename(self):
        with tempfile.TemporaryDirectory() as temp:
            home=Path(temp);root=home/'Library'
            for folder,body in [('Moodle/courseA','apple spectral'),('Moodle/courseB','apple luminous'),('','apple personal')]:
                target=root/folder/'lecture.txt';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(body,encoding='utf8')
            result=search_library(root,home,'apple',scope='Moodle/courseA')
            self.assertEqual(len(result['results']),1);self.assertIn('spectral',result['results'][0]['excerpt']);self.assertIn('relativePath',result['results'][0])
            with self.assertRaises(ValueError): search_library(root,home,'apple',scope='../')

    def test_legacy_organization_moves_unique_files_and_preserves_ambiguous(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)/'Library';legacy=root/'Moodle';legacy.mkdir(parents=True)
            for name in ('unique.pdf','shared.pdf','unknown.pdf'): (legacy/name).write_bytes(b'local user content')
            moodle=Mock();moodle.settings.download_dir=root
            moodle.courses.return_value=[{'id':1,'fullname':'Course A'},{'id':2,'fullname':'Course B'}]
            def section(course):
                names=['shared.pdf']+(['unique.pdf'] if course==1 else [])
                return [{'id':course*10,'section':1,'name':'Week 1','modules':[{'id':course*100,'contents':[{'type':'file','filename':n,'fileurl':f'https://moodle.ucl.ac.uk/pluginfile.php/{course}/{n}'} for n in names]}]}]
            moodle.course_contents.side_effect=section
            result=organize_downloads(moodle)
            self.assertEqual(result,{'moved':1,'unmatched':1,'ambiguous':1,'failed':0});self.assertTrue((legacy/'shared.pdf').exists());self.assertFalse((legacy/'unique.pdf').exists())
            self.assertEqual(next((legacy/'1 · Course A').rglob('unique.pdf')).read_bytes(),b'local user content')

    def test_download_context_must_match_course_activity(self):
        moodle=Mock();moodle.settings.base_url='https://moodle.ucl.ac.uk';moodle.find_course.return_value={'id':1,'fullname':'Course'}
        moodle.course_contents.return_value=[{'id':3,'modules':[{'id':4,'contents':[{'type':'file','filename':'a.pdf','fileurl':'https://moodle.ucl.ac.uk/pluginfile.php/4/a.pdf'}]}]}]
        self.assertEqual(locate_resource(moodle,1,4,'https://moodle.ucl.ac.uk/pluginfile.php/4/a.pdf')[3]['filename'],'a.pdf')
        with self.assertRaises(ValueError): locate_resource(moodle,1,9,'https://moodle.ucl.ac.uk/pluginfile.php/4/a.pdf')

    def test_duplicate_names_and_updated_files_keep_existing_downloads(self):
        with tempfile.TemporaryDirectory() as temp:
            moodle=Mock();moodle.settings.base_url='https://moodle.ucl.ac.uk';moodle.settings.home=Path(temp);moodle.settings.download_dir=Path(temp)/'Library'
            moodle.find_course.return_value={'id':1,'fullname':'Course A'}
            file={'type':'file','filename':'lecture.pdf','fileurl':'https://moodle.ucl.ac.uk/pluginfile.php/4/one/lecture.pdf','timemodified':1}
            module={'id':4,'name':'Week resources','contents':[file]}
            moodle.course_contents.return_value=[{'id':2,'section':1,'name':'Week 1','modules':[module]}]
            def write(url,dest): dest.write_bytes(url.encode()); return dest.stat().st_size
            moodle.download.side_effect=write
            args={'courseId':1,'moduleId':4,'url':file['fileurl']}
            first=download_resource(moodle,args);self.assertTrue(Path(first['path']).exists())
            self.assertTrue(download_resource(moodle,args)['exists']);self.assertEqual(moodle.download.call_count,1)
            file['fileurl']='https://moodle.ucl.ac.uk/pluginfile.php/4/two/lecture.pdf';args['url']=file['fileurl']
            second=download_resource(moodle,args);self.assertNotEqual(first['path'],second['path'])
            file['timemodified']=2;third=download_resource(moodle,args);self.assertNotEqual(second['path'],third['path'])
            self.assertEqual(len(list(moodle.settings.download_dir.rglob('*.pdf'))),3)

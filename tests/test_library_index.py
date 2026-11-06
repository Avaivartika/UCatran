import unittest, tempfile, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from library_index import search_library

class LibraryIndexTests(unittest.TestCase):
    def test_content_short_chinese_update_delete_and_literal_queries(self):
        with tempfile.TemporaryDirectory() as temp:
            home=Path(temp);root=home/'Library';root.mkdir();source=root/'中文资料.txt'
            source.write_text('标题无关键词\n复习应使用间隔检索练习。A 100% literal _ quote " syntax。',encoding='utf8')
            found=search_library(root,home,'复习')
            self.assertEqual(found['documents'],1);self.assertEqual(found['results'][0]['file'],'中文资料.txt')
            self.assertIn('间隔',found['results'][0]['excerpt']);self.assertTrue(search_library(root,home,'100%')['results'])
            self.assertFalse(search_library(root,home,'不存在')['results'])
            source.write_text('新的测试内容',encoding='utf8');self.assertFalse(search_library(root,home,'复习')['results'])
            self.assertTrue(search_library(root,home,'新')['results']);source.unlink();self.assertEqual(search_library(root,home,'新')['documents'],0)
    def test_pdf_page_beyond_old_reader_limit_and_restart(self):
        from pypdf import PdfWriter, PdfReader
        # Use a real text PDF generated with standard PDF content commands.
        from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
        with tempfile.TemporaryDirectory() as temp:
            home=Path(temp);root=home/'Library';root.mkdir();writer=PdfWriter()
            for _ in range(61):writer.add_blank_page(width=200,height=200)
            font=DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')})
            page=writer.pages[60];page[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):writer._add_object(font)})})
            stream=DecodedStreamObject();stream.set_data(b'BT /F1 12 Tf 20 100 Td (rareword retrieval) Tj ET');page[NameObject('/Contents')]=writer._add_object(stream)
            writer.write(root/'lecture.pdf');hit=search_library(root,home,'rareword')['results'][0];self.assertEqual(hit['page'],61)
            self.assertEqual(search_library(root,home,'rareword')['results'][0]['page'],61)

if __name__=='__main__':unittest.main()

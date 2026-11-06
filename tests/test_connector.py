import unittest, tempfile, json, base64, hashlib
from pathlib import Path
from moodle_mcp.config import Settings
from moodle_mcp.auth import _decode_launch_token
from moodle_mcp.moodle import Moodle, MoodleError
class ConnectorTests(unittest.TestCase):
    def test_rejects_cross_site_token(self):
        with tempfile.TemporaryDirectory() as d:
            settings=Settings(base_url='https://moodle.ucl.ac.uk',home=Path(d))
            settings.token_path.write_text(json.dumps({'base_url':'https://other.example','token':'secret'}))
            m=Moodle(settings)
            self.assertEqual(m.token,'');m._client.close()
    def test_callback_signature(self):
        settings=Settings(base_url='https://moodle.ucl.ac.uk')
        signature=hashlib.md5((settings.base_url+'nonce').encode()).hexdigest()
        good=base64.b64encode((signature+':::token').encode()).decode()
        self.assertEqual(_decode_launch_token(good,settings,'nonce'),('token',''))
        with self.assertRaises(RuntimeError): _decode_launch_token(good,settings,'wrong')
    def test_download_refuses_external_host(self):
        m=Moodle(Settings(base_url='https://moodle.ucl.ac.uk'),token='secret')
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(MoodleError):m.download('https://evil.example/pluginfile.php/a',Path(d)/'a')
        m._client.close()
if __name__=='__main__': unittest.main()

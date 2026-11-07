import unittest, tempfile, json, base64, hashlib
from pathlib import Path
from moodle_mcp.config import Settings
from moodle_mcp.auth import _decode_launch_token
from moodle_mcp.moodle import Moodle, MoodleError
class ConnectorTests(unittest.TestCase):
    def test_calendar_paginates_without_exceeding_server_limit(self):
        from unittest.mock import Mock
        m = Moodle(Settings(base_url='https://moodle.ucl.ac.uk'), token='secret')
        try:
            events = [{'id': 200-i, 'timesort': 1234567890} for i in range(100)]
            m.call = Mock(side_effect=[{'events': events[:50]}, {'events': events[50:]}])
            self.assertEqual(m.upcoming(100), events)
            calls = m.call.call_args_list
            self.assertEqual([c.kwargs['limitnum'] for c in calls], [50, 50])
            self.assertEqual([c.kwargs['aftereventid'] for c in calls], [0, 151])
            self.assertEqual(calls[0].kwargs['timesortfrom'], calls[1].kwargs['timesortfrom'])
        finally: m._client.close()

    def test_calendar_short_page_and_invalid_limit(self):
        from unittest.mock import Mock
        m = Moodle(Settings(base_url='https://moodle.ucl.ac.uk'), token='secret')
        try:
            m.call = Mock(return_value={'events': [{'id': 3}]})
            self.assertEqual(m.upcoming(100), [{'id': 3}])
            self.assertEqual(m.call.call_count, 1)
            for limit in (0, -1, True, 1.5):
                with self.assertRaises(ValueError): m.upcoming(limit)
            m.call = Mock(return_value={'events': [{'id': i} for i in range(50)]})
            with self.assertRaises(MoodleError): m.upcoming(100)
        finally: m._client.close()

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

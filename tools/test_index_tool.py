import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
import json
from index_tool import aggregate, collect, publish


class Rules(unittest.TestCase):
    def test_zero_missing_and_equal_weight(self):
        cameras = [{'id': 'a', 'enabled': True}, {'id': 'b', 'enabled': True}]
        rows = [{'camera_id': c, 'local_date': '2026-10-09', 'local_hour': h,
                 'count': value, 'status': status}
                for c, h, value, status in [('a', 6, 0, 'verified'),
                    ('a', 7, 6, 'verified'), ('a', 8, None, 'missing'),
                    ('b', 6, 9, 'verified'), ('b', 7, 100, 'needs_review')]]
        day = aggregate(rows, cameras)['days'][0]
        self.assertEqual(day['value'], 6)  # mean(mean(0,6), mean(9))
        self.assertEqual(day['readings'], 3)
        self.assertFalse(day['complete'])
        self.assertEqual(day['slots']['6'], 4.5)
        self.assertEqual(day['slots']['7'], 6)
        self.assertIsNone(day['slots']['8'])

    def test_no_readings_is_empty(self):
        self.assertEqual(aggregate([], [])['days'], [])

    def test_publish_keeps_zero_and_only_count_metadata(self):
        with __import__('tempfile').TemporaryDirectory() as temp:
            root = Path(temp)
            reading = root / 'captures' / 'a' / '2026-10-09' / '06' / 'reading.json'
            reading.parent.mkdir(parents=True)
            reading.write_text(json.dumps({'camera_id': 'a', 'local_date': '2026-10-09',
                'local_hour': 6, 'count': 0, 'status': 'verified', 'test': False,
                'image': '/private/frame.jpg', 'approval': 'camera_auto_approved'}))
            history = root / 'data' / 'readings.json'
            rows = publish(root / 'captures', history)
            self.assertEqual(rows[0]['count'], 0)
            self.assertNotIn('image', rows[0])
            publish(root / 'captures', history)
            self.assertEqual(len(json.loads(history.read_text())['readings']), 1)

    def test_unreviewed_and_test_counts_never_publish(self):
        with __import__('tempfile').TemporaryDirectory() as temp:
            root = Path(temp)
            for camera, status, test in [('a', 'needs_review', False), ('b', 'verified', True)]:
                reading = root / 'captures' / camera / '2026-10-09' / '06' / 'reading.json'
                reading.parent.mkdir(parents=True)
                reading.write_text(json.dumps({'camera_id': camera, 'local_date': '2026-10-09',
                    'local_hour': 6, 'count': 3, 'status': status, 'test': test}))
            rows = publish(root / 'captures', root / 'data' / 'readings.json')
            self.assertEqual(rows, [])

    def test_auto_count_requires_freshness_evidence(self):
        camera = {'id': 'a', 'enabled': True, 'auto_approve': True,
                  'frame_freshness_verified': True, 'timezone': 'America/Chicago',
                  'url': 'https://camera.example/still.jpg', 'polygon': [[0,0],[1,0],[1,1]]}
        now = datetime(2026, 10, 9, 11, 1, tzinfo=timezone.utc)
        for freshness, expected in [('recent_header', 'verified'),
                                    ('stale_or_invalid_header', 'needs_review')]:
            with __import__('tempfile').TemporaryDirectory() as temp, \
                 patch('index_tool.capture', return_value={'image': '/tmp/frame.jpg', 'freshness': freshness}), \
                 patch('index_tool.detect', return_value=[]):
                record = collect(camera, Path(temp), now=now)
                row = json.loads(record.read_text())
                self.assertEqual(row['status'], expected)
                if expected == 'verified':
                    self.assertEqual(row['count'], 0)
                else:
                    self.assertIsNone(row['count'])

    def test_local_time_and_missed_slot(self):
        camera = {'id': 'a', 'enabled': True, 'timezone': 'America/Chicago'}
        # 10 UTC = 5 AM in October; 6 AM slot must not run early.
        with patch('index_tool.capture') as capture:
            self.assertIsNone(collect(camera, Path('/unused'), datetime(2026,10,9,10,tzinfo=timezone.utc)))
            self.assertIsNone(collect(camera, Path('/unused'), datetime(2026,10,9,11,6,tzinfo=timezone.utc)))
            capture.assert_not_called()


if __name__ == '__main__':
    unittest.main()

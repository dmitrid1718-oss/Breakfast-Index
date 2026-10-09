import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from index_tool import aggregate, collect


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

    def test_no_readings_is_empty(self):
        self.assertEqual(aggregate([], [])['days'], [])

    def test_local_time_and_missed_slot(self):
        camera = {'id': 'a', 'enabled': True, 'timezone': 'America/Chicago'}
        # 10 UTC = 5 AM in October; 6 AM slot must not run early.
        with patch('index_tool.capture') as capture:
            self.assertIsNone(collect(camera, Path('/unused'), datetime(2026,10,9,10,tzinfo=timezone.utc)))
            self.assertIsNone(collect(camera, Path('/unused'), datetime(2026,10,9,11,6,tzinfo=timezone.utc)))
            capture.assert_not_called()


if __name__ == '__main__':
    unittest.main()

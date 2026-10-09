"""Read-only Damnlines connection and breakfast coverage test."""
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from zoneinfo import ZoneInfo

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def get(path, **params):
    token = os.environ.get('DAMNLINES_API_KEY', '').strip()
    if not token:
        raise ValueError('DAMNLINES_API_KEY repository secret is missing or empty')
    url = 'https://api.damnlines.com/v1/' + path
    if params:
        url += '?' + urlencode(params)
    req = Request(url, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
    with build_opener(NoRedirect).open(req, timeout=30) as response:
        body = response.read(4_000_001)
    if len(body) > 4_000_000:
        raise ValueError('API response too large')
    return json.loads(body)

def main():
    me = get('me')
    print(json.dumps({'connection': 'authenticated', 'tier': me.get('tier')}, ensure_ascii=True))
    locations = get('locations').get('data')
    if not isinstance(locations, list):
        raise ValueError('Unexpected locations response')
    print('LOCATIONS ' + str(len(locations)), flush=True)
    for location in locations[:30]:
        status = location.get('status') or {}
        print(json.dumps({k: location.get(k) for k in
            ('slug', 'display_name', 'address', 'timezone', 'hours')}, ensure_ascii=True))
        print(json.dumps({'status': {k: status.get(k) for k in
            ('is_open', 'current_count', 'wait_minutes', 'captured_at')}}), flush=True)
        zone = ZoneInfo(location['timezone'])
        yesterday = datetime.now(zone).date() - timedelta(days=1)
        since = datetime.combine(yesterday, datetime.min.time(), zone).replace(hour=6)
        until = since.replace(hour=9)
        history = get('lines', location=location['slug'], since=since.isoformat(),
                      until=until.isoformat(), interval='raw', limit=1)
        rows = history.get('data_raw')
        if not isinstance(rows, list):
            raise ValueError('Unexpected line-count response')
        # Only real data; no substitute zero for empty arrays or null counts.
        print(json.dumps({'location': location['slug'], 'local_date': str(yesterday),
            'window': '06:00-09:00', 'has_morning_record': bool(rows),
            'sample': [{k: row.get(k) for k in ('captured_at', 'people_count')} for row in rows[:1]]}),
            flush=True)
    print('People counts only. No chart publication performed.')

if __name__ == '__main__':
    try:
        main()
    except HTTPError as exc:
        print('Damnlines HTTP error: ' + str(exc.code), file=sys.stderr)
        sys.exit(1)
    except (URLError, TimeoutError):
        print('Damnlines connection unavailable', file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        # Do not print response bodies, request objects, or credentials.
        print('Connection test failed: ' + type(exc).__name__, file=sys.stderr)
        sys.exit(1)

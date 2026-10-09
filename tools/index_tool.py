#!/usr/bin/env python3
"""Local camera counter. Zero is data; missing or unreviewed is null."""
import argparse
import json
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from snapshot import capture

HOURS = (6, 7, 8)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)


def inside(x, y, polygon):
    """Ray-casting against a polygon in normalized image coordinates."""
    hit = False
    for i, (ax, ay) in enumerate(polygon):
        bx, by = polygon[i - 1]
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay)+ax:
            hit = not hit
    return hit


def detect(image, camera, output):
    from ultralytics import YOLO
    from PIL import Image, ImageDraw
    polygon = camera.get('polygon', [])
    if len(polygon) < 3:
        raise ValueError('Set a counting polygon before counting')
    model = YOLO(camera.get('model', 'yolo11n.pt'))
    result = model.predict(str(image), conf=camera.get('confidence', 0.4),
                           device='cpu', verbose=False)[0]
    picture = Image.open(image).convert('RGB')
    width, height = picture.size
    draw = ImageDraw.Draw(picture)
    points = [(x*width, y*height) for x, y in polygon]
    draw.line(points + [points[0]], fill='orange', width=4)
    detections = []
    for box in result.boxes:
        label = result.names[int(box.cls.item())]
        if label not in camera.get('classes', ['car', 'truck']):
            continue
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        # Bottom center locates the vehicle on the road/lot.
        if not inside((x1+x2)/2/width, y2/height, polygon):
            continue
        detections.append({'label': label, 'confidence': float(box.conf.item()),
                           'box': [x1, y1, x2, y2]})
        draw.rectangle((x1, y1, x2, y2), outline='lime', width=3)
        draw.text((x1, max(0, y1-15)), str(len(detections)), fill='lime')
    picture.save(output)
    return detections


def collect(camera, state, now=None, test=False):
    now = now or datetime.now(timezone.utc)
    local = now.astimezone(ZoneInfo(camera['timezone']))
    if not test and (not camera.get('enabled') or local.hour not in HOURS or local.minute >= 5):
        return None
    slot = local.strftime('%Y-%m-%d/%H') if not test else 'tests/' + now.strftime('%Y%m%dT%H%M%SZ')
    directory = state / camera['id'] / slot
    record = directory / 'reading.json'
    if record.exists():
        return None  # Idempotent: never repeatedly count the same scheduled slot.
    receipt = capture(camera['url'], camera['timezone'], directory)
    receipt.update(camera_id=camera['id'], local_date=local.date().isoformat(),
                   local_hour=local.hour, test=test or camera.get('test_only', False), count=None,
                   status='missing', candidate_count=None)
    if receipt.get('image'):
        try:
            annotated = directory / 'counted.jpg'
            boxes = detect(receipt['image'], camera, annotated)
            receipt.update(candidate_count=len(boxes), detections=boxes,
                           annotated_image=str(annotated), status='needs_review')
        except Exception as exc:
            receipt['count_error'] = str(exc)
    write_json(record, receipt)
    return record


def review(record, count):
    row = json.loads(record.read_text())
    if not row.get('image') or not Path(row['image']).exists():
        raise ValueError('Cannot approve a reading without its saved image')
    if count < 0:
        raise ValueError('Count must be zero or a positive integer')
    row.update(count=count, status='verified',
               reviewed_at=datetime.now(timezone.utc).isoformat())
    write_json(record, row)


def aggregate(rows, cameras):
    """Average valid 6/7/8 readings per camera, then equal-weight cameras."""
    enabled = {c['id'] for c in cameras if c.get('enabled') and not c.get('test_only')}
    grouped = {}
    for row in rows:
        if row.get('test') or row.get('camera_id') not in enabled:
            continue
        count = row.get('count')
        if (row.get('status') != 'verified' or type(count) is not int or count < 0
                or row.get('local_hour') not in HOURS):
            continue
        key = (row['local_date'], row['camera_id'])
        grouped.setdefault(key, {})[row['local_hour']] = count
    days = {}
    for (date, camera_id), readings in sorted(grouped.items()):
        days.setdefault(date, []).append({'camera_id': camera_id,
            'average': statistics.mean(readings.values()), 'readings': len(readings)})
    return {'metric': 'average_visible_vehicles', 'hours_local': list(HOURS),
            'days': [{'date': date, 'value': statistics.mean(r['average'] for r in locations),
                      'locations': len(locations),
                      'readings': sum(r['readings'] for r in locations),
                      'expected_readings': len(enabled)*len(HOURS),
                      'complete': sum(r['readings'] for r in locations) == len(enabled)*len(HOURS)}
                     for date, locations in sorted(days.items())]}


def export(state, cameras, output):
    rows = [json.loads(p.read_text()) for p in state.glob('*/*/*/reading.json')]
    write_json(output, aggregate(rows, cameras))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=Path(__file__).with_name('cameras.json'))
    parser.add_argument('--state', type=Path, default=Path('private-captures'))
    parser.add_argument('--output', type=Path, default=Path('data/breakfast.json'))
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('run', help='Capture any due 6/7/8 local-time slots once')
    commands.add_parser('watch', help='Run continuously on an always-on computer')
    commands.add_parser('export', help='Export verified counts, including zero')
    test = commands.add_parser('test', help='Capture and count now; never enters chart')
    test.add_argument('camera')
    approve = commands.add_parser('review', help='Confirm fresh, clear, correctly framed image and count')
    approve.add_argument('record', type=Path)
    approve.add_argument('--count', type=int, required=True)
    args = parser.parse_args()
    cameras = json.loads(args.config.read_text())['cameras']
    if args.command == 'review':
        review(args.record, args.count)
    elif args.command == 'test':
        camera = next(c for c in cameras if c['id'] == args.camera)
        print(collect(camera, args.state, test=True))
    elif args.command in ('run', 'watch'):
        while True:
            for camera in cameras:
                record = collect(camera, args.state)
                if record:
                    print(record, flush=True)
            export(args.state, cameras, args.output)
            if args.command == 'run':
                break
            time.sleep(30)
    export(args.state, cameras, args.output)


if __name__ == '__main__':
    main()

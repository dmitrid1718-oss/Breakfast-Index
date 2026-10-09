#!/usr/bin/env python3
"""Fetch a public camera still for review; never invent a vehicle count."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

def capture(url, zone, output):
    now = datetime.now(timezone.utc)
    result = {"url": url, "retrieved_at": now.isoformat(), "timezone": zone,
              "status": "unavailable", "vehicle_count": None,
              "eligible_for_index": False}
    try:
        local = now.astimezone(ZoneInfo(zone))
        result["within_breakfast_window"] = 6 <= local.hour < 9
        request = Request(url, headers={"User-Agent": "BreakfastIndexResearch/0.1"})
        with urlopen(request, timeout=20) as response:
            data = response.read(8_000_001)
            modified = response.headers.get("Last-Modified")
        if len(data) > 8_000_000:
            raise ValueError("Image exceeds 8 MB")
        if data.startswith(b"\xff\xd8\xff"):
            ext = ".jpg"
        elif data.startswith(b"\x89PNG\r\n\x1a\n"):
            ext = ".png"
        else:
            raise ValueError("Response is not a JPEG or PNG image")
        result["last_modified"] = modified
        result["freshness"] = "unverified"
        if modified:
            stamp = parsedate_to_datetime(modified)
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=timezone.utc)
            age = (now - stamp).total_seconds()
            result["header_age_seconds"] = round(age)
            result["freshness"] = "recent_header" if -60 <= age <= 900 else "stale_or_invalid_header"
        output.mkdir(parents=True, exist_ok=True)
        image = output / ("snapshot-" + now.strftime("%Y%m%dT%H%M%SZ") + ext)
        image.write_bytes(data)
        result.update(status="downloaded_needs_review", image=str(image),
                      sha256=hashlib.sha256(data).hexdigest())
        # A recent HTTP header is not proof of a fresh camera frame.
        # Review the visible timestamp, image, view, and counting area first.
    except Exception as exc:
        result["error"] = str(exc)
    output.mkdir(parents=True, exist_ok=True)
    manifest = output / ("capture-" + now.strftime("%Y%m%dT%H%M%SZ") + ".json")
    manifest.write_text(json.dumps(result, indent=2) + "\n")
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--timezone", required=True)
    parser.add_argument("--output", type=Path, default=Path("captures"))
    args = parser.parse_args()
    print(json.dumps(capture(args.url, args.timezone, args.output), indent=2))

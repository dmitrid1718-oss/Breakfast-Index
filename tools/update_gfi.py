#!/usr/bin/env python3
"""Refresh the verified Federal Reserve stress history; never synthesize values."""
import csv
import io
import json
import pathlib
import urllib.request
from datetime import datetime, timezone

URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=STLFSI4&cosd=2008-01-01"
request = urllib.request.Request(URL, headers={"User-Agent": "BreakfastIndexResearch/1.0 (historical public data)"})
with urllib.request.urlopen(request, timeout=35) as response:
    body = response.read().decode("utf-8-sig")
reader = csv.DictReader(io.StringIO(body))
if not reader.fieldnames or "STLFSI4" not in reader.fieldnames:
    raise RuntimeError("Unexpected FRED data schema")
date_key = "DATE" if "DATE" in reader.fieldnames else "observation_date"
if date_key not in reader.fieldnames:
    raise RuntimeError("Missing date column")
points = []
for row in reader:
    day = row[date_key].strip()
    val = row["STLFSI4"].strip()
    if day >= "2008-01-01" and val not in ("", "."):
        points.append({"date": day, "value": float(val)})
if len(points) < 500 or points[0]["date"][:4] != "2008":
    raise RuntimeError("Incomplete historical download — refusing to replace data")
points.sort(key=lambda x: x["date"])
output = {"source": "Federal Reserve Bank of St. Louis · STLFSI4", "source_url": "https://fred.stlouisfed.org/series/STLFSI4", "retrieved_utc": datetime.now(timezone.utc).isoformat(), "points": points}
destination = pathlib.Path("data/gfi-stress.json")
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(output, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Wrote {len(points)} verified weeks from {points[0]['date']} to {points[-1]['date']}")

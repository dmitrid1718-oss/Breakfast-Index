#!/usr/bin/env python3
"""Refresh sourced monthly breakfast purchasing-power history from FRED public CSV.
No extrapolation; only matched BLS wage and restaurant CPI observation months.
"""
import csv, io, json, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "purchasing-power.json"
SERIES = {
    "wages": "CES0500000003",       # private nonfarm average hourly earnings
    "restaurant_cpi": "CUSR0000SEFV", # food away from home SA
}
BASE_MONTH = "2025-01"
UA = "BreakfastIndex-DataCollector/1.0 (public FRED CSV; cite BLS/FRED)"

def observations(series_id):
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + series_id
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/csv"})
    with urllib.request.urlopen(req, timeout=35) as response:
        decoded = response.read().decode("utf-8-sig")
    values = {}
    for line in csv.DictReader(io.StringIO(decoded)):
        date = (line.get("DATE") or line.get("observation_date") or "").strip()
        value = (line.get(series_id) or "").strip()
        if not date or value in {"", "."}:
            continue
        try:
            number = float(value)
        except ValueError:
            continue
        if number > 0:
            values[date[:7]] = number
    if BASE_MONTH not in values:
        raise RuntimeError(f"{series_id} lacks baseline {BASE_MONTH}")
    return values

def main():
    wages = observations(SERIES["wages"])
    cpi = observations(SERIES["restaurant_cpi"])
    baseline = wages[BASE_MONTH] / cpi[BASE_MONTH]
    months = sorted(set(wages) & set(cpi))
    # Keep monthly history since the baseline; do not fill missing observations.
    points = []
    for month in months:
        if month < BASE_MONTH:
            continue
        ratio = wages[month] / cpi[month]
        points.append({"month": month,
                       "value": round(100 * ratio / baseline, 3),
                       "wage_hourly": round(wages[month], 3),
                       "restaurant_cpi": round(cpi[month], 3)})
    if len(points) < 2:
        raise RuntimeError("Fewer than two matched real observations; refusing to overwrite")
    doc = {
        "metric": "restaurant_food_purchasing_power_proxy",
        "label": "Restaurant-food purchasing power",
        "base": BASE_MONTH,
        "base_value": 100,
        "frequency": "monthly",
        "description": "Average private-sector hourly earnings divided by CPI food away from home, normalized to 100 in January 2025; not a national breakfast menu-price index or household disposable income measure.",
        "latest_observation": points[-1]["month"],
        "updated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": [
            {"id": SERIES["wages"], "label": "BLS average hourly earnings, total private",
             "url": "https://fred.stlouisfed.org/series/CES0500000003"},
            {"id": SERIES["restaurant_cpi"], "label": "BLS CPI food away from home, seasonally adjusted",
             "url": "https://fred.stlouisfed.org/series/CUSR0000SEFV"}
        ],
        "points": points
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    old = {}
    if OUT.exists():
        try: old = json.loads(OUT.read_text())
        except (ValueError, OSError): pass
    # Avoid gratuitous commits when no source values changed.
    old_comparable = [(p["month"], p["value"],p["wage_hourly"],p["restaurant_cpi"]) for p in old.get("points", [])]
    new_comparable = [(p["month"], p["value"],p["wage_hourly"],p["restaurant_cpi"]) for p in points]
    if old_comparable == new_comparable:
        print("No revised or new monthly readings. No change.")
        return
    OUT.write_text(json.dumps(doc, indent=2) + "\n")
    print(f"Updated {len(points)} monthly points, latest {points[-1]['month']}: {points[-1]['value']}")

if __name__ == "__main__":
    main()

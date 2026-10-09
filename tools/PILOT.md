# Breakfast camera tool

The page is unchanged. This is a camera/counting pilot, not a live national index.

## What runs

GitHub Actions runs a test on changes to the tools and provides a manual Run workflow button. Scheduled runs target 06:00, 07:00 and 08:00 in each camera's IANA timezone. The tool accepts captures only during the first five minutes of each target hour. GitHub can delay jobs: a late job skips the slot instead of pretending a later picture was taken on time. For punctual collection use `watch` on an always-on host.

The current Roscoe Diner camera is explicitly **test only**. Its restaurant site links to this public Axis camera. Retrieval works; its view includes parking/charging spaces, and its displayed clock disagreed with retrieval time. It is not approved as a breakfast queue measurement. No pilot number enters the chart, even after review. Additional camera selection and reuse checks remain open.

The detector counts cars and trucks whose bottom-center lies inside the configured polygon. Confidence, polygon, classes and model are tunable in `cameras.json`. Counts are estimates until checked against the annotated picture. A detector returning no boxes is a candidate zero, not proof that a dark, stale or obstructed view was empty.

## Run locally

Use Python 3.11 or newer in a virtual environment:

```sh
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r tools/requirements.txt
python tools/index_tool.py test roscoe-test
python tools/index_tool.py watch
```

Review the saved original and `counted.jpg`. Check freshness, visibility and the counting area, then confirm an actual scheduled reading:

```sh
python tools/index_tool.py review private-captures/CAMERA/DATE/HOUR/reading.json --count 0
python tools/index_tool.py export
```

Zero is valid and included. Missing, unreadable and unreviewed readings are excluded. Each location averages its available 6/7/8 counts, then locations get equal weight. The export includes coverage and completeness. Empty data produces an empty series, never fabricated zeroes. Missing dates should remain gaps in any chart. This measures vehicles visible at observation times, not total cars served.

`data/readings.json` is the durable count-only ledger; `data/breakfast.json` is the chart-ready export. Scheduled GitHub runs append approved counts to those files and commit them. Images and annotated evidence remain in seven-day Actions artifacts and are not committed to the public repository.

New cameras start with automatic approval off. Set `auto_approve: true` only after checking the saved originals and annotated counts across several real mornings. If the camera lacks a fresh `Last-Modified` header, also set `frame_freshness_verified: true` only after verifying that source during setup. A stale header always blocks automatic approval. Test-only cameras and unreviewed counts never enter the ledger. The tool treats zero as a valid count; failed, stale, unreadable, and missing images do not become zero. Manual review with `--count 0` is supported.

The chart reads `data/breakfast.json`. Line view shows each daily average. Candles use the per-location average at 6 a.m. as open, 8 a.m. as close, and the observed 6/7/8 values for high and low. Day, week, and month select the latest 1, 7, or 30 available dates. Gaps remain gaps.

Ultralytics code/model licensing applies (AGPL-3.0 or an appropriate commercial license); see https://www.ultralytics.com/license. No paid AI API or API key is used. Standard GitHub-hosted runners are free for this public repository; artifacts have their own storage allowances. Keep evidence small and retention short.

## Camera search status

`camera-candidates.json` records the 14 named camera leads and six camera directories supplied for the pilot. They are discovery leads, not 20 verified drive-through cameras. Hyrum is the only lead with a directly verified current still endpoint so far; its image shows the McDonald’s area but not a clearly identifiable drive-through queue. Ironwood’s owner describes a view toward McDonald’s, but the public Nest player was blank during review. The other road feeds are nearby traffic views or still need a specific camera identified. None is enabled for collection yet.

Before adding a camera to `cameras.json`, verify that the drive-through lane is visible, the image is current at the intended local sampling times, and the source permits scheduled capture and analysis. Broad EarthCam views are not eligible for automated capture without permission. Keep the chart empty until a camera passes these checks and its counts are reviewed.

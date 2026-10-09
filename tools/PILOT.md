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

`data/breakfast.json` is the chart-ready export. Workflow artifacts retain each run's evidence for seven days; they are not a persistent production history store. The current pilot does not combine different workflow runs, automatically approve counts, or publish to the page. The `watch` command keeps history locally across runs. Before production, establish reliable camera views, validate their counts, and connect durable history and publication.

Ultralytics code/model licensing applies (AGPL-3.0 or an appropriate commercial license); see https://www.ultralytics.com/license. No paid AI API or API key is used. Standard GitHub-hosted runners are free for this public repository; artifacts have their own storage allowances. Keep evidence small and retention short.

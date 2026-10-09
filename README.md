# Breakfast Index™

The economy before the numbers.

A small experiment following visible breakfast vehicle counts from a limited sample of locations. It is not a nationally representative or official economic measure.

## Data path

The camera tool checks configured public still-image URLs at 6, 7, and 8 a.m. in each camera's local time. It saves each image and an annotated vehicle count for review. Cameras begin in test or review mode; only enabled, validated cameras can contribute approved counts.

Approved counts are written to `data/readings.json`, a count-only history ledger. The same run updates `data/breakfast.json`, which the static chart reads. Images stay in short-lived GitHub Actions artifacts and are not published in the repository. A clear image with no vehicles is recorded as zero. Missing or stale images are not converted to zero.

See [`tools/PILOT.md`](tools/PILOT.md) for setup, review, and calibration steps.

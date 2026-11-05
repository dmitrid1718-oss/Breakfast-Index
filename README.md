# Breakfast Index™

**The economy before the numbers.**

Breakfast Index is an independent economic-observation experiment by Useless Instruments LLC. It examines everyday purchasing power, grocery prices, consumer confidence and experimental signals of financial and household stress. The historical trend matters more than any single headline.

## What the page measures

- **Breakfast purchasing power:** average private-sector hourly earnings divided by the official restaurant-food CPI, indexed to January 2025 = 100. It is not a literal breakfast receipt or measure of take-home pay.
- **Grocery prices:** published BLS average prices for selected U.S. grocery items, with an indexed historical comparison.
- **Household mood:** consumer sentiment and current-conditions measurements, with source dates.
- **Affordability scenarios:** illustrative breakfast budget calculator, not a representative household estimate.
- **GFI (Global Fracture Index):** an experimental composite calculated from public economic series, with monthly history from January 2008. Its separate financial-stress and household-pressure views are research instruments, not validated predictors or investment signals.
- **Morning activity pilot:** an optional camera-based vehicle-count experiment; shown separately from the economic indicators and not included in GFI.

## GFI research methodology and limitations

The calculated research index uses trailing historical percentiles of observed public series, including corporate high-yield spreads, a Federal Reserve financial stress proxy, broad consumer-loan delinquencies, VIX, currency moves, inflation and unemployment. The chart is our own computation, not a republished Federal Reserve chart.

**Important:** the current prototype is U.S.-heavy, has incomplete coverage of global market breadth and cross-border contagion, and does not yet include a dedicated auto-loan delinquency input. Some indicators overlap, creating double-counting risk. Source series can be revised, and the historical exercise is not yet a fully vintage-correct backtest. The index should not be interpreted as a proven early-warning system or a forecast.

The GFI data generator lives at `tools/build_gfi.py`, with output `data/gfi.json`. The site renders it using `gfi.js`. GitHub Actions refresh the dataset when the upstream sources are available; failed refreshes must not be replaced by invented values.

## Morning activity pilot — data path

The camera tool checks configured public still-image URLs at 6, 7, and 8 a.m. in each camera's local time. It saves each image and an annotated vehicle count for review. Cameras begin in test or review mode; only enabled, validated cameras can contribute approved counts.

Approved counts are written to `data/readings.json`, a count-only history ledger. The same run updates `data/breakfast.json`, which the static chart reads. Images stay in short-lived GitHub Actions artifacts and are not published in the repository. A clear image with no vehicles is recorded as zero. Missing or stale images are not converted to zero.

See [`tools/PILOT.md`](tools/PILOT.md) for setup, review, and calibration steps.

## Disclaimer

An independent research experiment, not an official economic measure, prediction, or financial advice. Sources may lag or be revised. Features using insufficient verified observations must identify that limitation.

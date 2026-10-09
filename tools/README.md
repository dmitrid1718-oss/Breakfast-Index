# Camera tools

`python3 tools/snapshot.py URL --timezone America/Indiana/Indianapolis --output captures`

Python 3.9+, standard library only. Downloads one JPEG/PNG and a JSON receipt, including URL, retrieval time, server modification time, hash, and breakfast-window flag. Counts remain null until reviewed. This does not count cars automatically, schedule captures, publish a report, or update the chart. Do not commit camera images to this public repository.

## Verified capture test — October 9, 2026

Source: https://content.trafficwise.org/cctv/01-002-073-cam1.jpg
Directory: https://content.trafficwise.org/cctv/

Two distinct stills successfully retrieved. First frame visibly stamped 2026-10-09 06:18:12, labeled SR930 (Coliseum Rd & Goshen Rd), Indiana. Second retrieval 10:21:57 UTC had a Last-Modified header 47 seconds old and a different SHA-256. The first image was visually inspected and vehicles were visible. This is a working transport test, NOT an approved breakfast location: the main view is an intersection. No count was admitted to the Breakfast Index.

The provider states images update every two minutes. Check frame timestamps independently; HTTP freshness alone does not prove current footage. Check applicable reuse terms before scheduled collection or redistribution.

## Restaurant camera leads

- Northeast: Grist Mill Restaurant, Parish NY, https://thegristmillrestaurant.com/ — official page links a YouTube live channel and lists opening at 6:30 a.m. YouTube retrieval returned HTTP 429; no frame obtained. Do not bypass the limit.
- Northeast: Roscoe Diner — webcam directory leads found; one returned 403 and another yielded no usable image endpoint. Not verified.
- West: 59er Diner, https://59erdiner.com/ — old parking-camera listings exist, but no current webcam link was found on the official home page. Official weekday opening is 9 a.m., making it a poor fit for 6–9 weekday sampling.
- Southeast: Patrona Coastal Cafe, https://www.patronacoastalcafe.com/ — official site advertises a YouTube waterfront/patio camera; vehicle counting view not established. Not verified.
- Midwest/Southwest: no breakfast-facing source verified yet.

## Next acceptance step

Find a fixed breakfast-facing view with readable timestamp and repeatable counting area. Keep the panel stable. Exclude unavailable/stale/obscured views, never replace them with zero. Average only reviewed counts in the local 6–9 a.m. window. No schedule is active yet.

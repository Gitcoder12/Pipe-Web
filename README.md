# Pipe-Web

**Global path and movement intelligence.** Explore connected networks, inspect geographic data, and compare candidate paths by time, distance, cost, or energy.

## 2D map and online geographic data

Pipe-Web uses Leaflet as its map engine. The map-first landing page opens directly into a 2D world map using OpenStreetMap tiles. External datasets load at runtime; availability depends on the network, provider uptime, CORS policy, and usage limits.

| Dataset | Source | Current use |
|---|---|---|
| Base map tiles | [OpenStreetMap tile service](https://tile.openstreetmap.org/) | Global 2D map background |
| Road geometry | [OpenStreetMap via Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Fetch a bounded area, build a routable road graph, cache locally |
| Vessel positions | [OpenSeaFeed AIS stream](https://openseafeed.com/) | Live ship position observations in the flow explorer when the stream is reachable |

The schematic network view remains available alongside the Leaflet 2D Map and World flows views. Pipe-Web no longer initializes a 3D globe renderer.

## Current landing map data integration

The map-first landing page queries the public OpenStreetMap Overpass API for infrastructure geometry inside the current map viewport:

| Landing layer | Current query | Data meaning |
|---|---|---|
| Sea | Mapped ferry-route ways | Infrastructure/service geometry, not live vessel positions |
| Road | Motorway, trunk, and primary road ways | Mapped road geometry, not live congestion |
| Rail | Railway and narrow-gauge ways | Mapped railway geometry |
| Pipe | Ways tagged as pipelines | Mapped pipeline geometry; coverage may be sparse |
| Air | Not connected on the landing map | No fabricated flight paths |
| Digital | Not connected on the landing map | No fabricated submarine cable or backbone paths |

Queries are viewport-bounded and run after zooming in. Map movement requests the visible area again. Overpass availability, response time, and coverage depend on public infrastructure and service limits. Do not poll aggressively.

This landing-map integration is separate from the AIS layer in the lower flow explorer. The map-first landing page shows mapped infrastructure plus schematic ribbons; it does not display live vessel or aircraft positions. The Overpass timestamp indicates when the query completed; it does not mean the underlying OpenStreetMap edits were made at that time.

## Animated 2D flow ribbons

Global hub-to-hub examples are rendered as animated Bézier ribbons using [Leaflet.bezier](https://github.com/lifeeka/leaflet.bezier) v2.1.0 (MIT; no runtime dependencies beyond Leaflet). Ribbon colour identifies the selected transport layer: maritime, road, air, rail, pipeline, or digital. A small directional token travels along each segment; reduced-motion preferences disable movement.

**Data boundary:** the curated hub-to-hub ribbon examples are schematic/illustrative. Their animation does not mean a vehicle, shipment, or data packet was observed, and ribbon colour is not a fastest/slowest ranking. On supported zoom levels, OpenStreetMap Overpass geometry is drawn separately as mapped infrastructure. Those OSM ways are not live traffic or verified end-to-end routing paths.

## Network coverage and honest status

- **Roads:** geographic OpenStreetMap road graph can be loaded for a searched area in the route planner. Requests are bounded to protect public Overpass services.
- **Ships:** live AIS positions are source-dependent and currently use the provider's default Europe/North Atlantic bounding box.
- **Rail, pipelines, and digital infrastructure:** layer concepts exist, but verified global geometry and live telemetry are not yet fully integrated.
- **Aircraft:** the Worker integration remains in the repository, but the current 2D interface does not render an aircraft-position overlay.
- **Terrain, satellite imagery, global freight volumes, and corridor speeds:** not yet integrated as live analysis datasets.
- **Schematic networks:** illustrative only. Their weights are not real-world measurements.

A public dataset is not automatically live telemetry. Pipe-Web labels source, coverage, date, and limitations rather than presenting estimates or schematic connections as observed movement.

## Route optimization

The route planner supports:

- Fastest-time, shortest-distance, lowest-cost, and lowest-energy objectives
- Alternative paths and optional congestion penalties
- GeoJSON and GPX network import
- OpenStreetMap road graph loading for a selected area
- A Web Worker for path search so larger graphs do not block the interface

For imported OSM roads, distance is calculated from geographic coordinates. Time and cost values are estimates derived from available road tags and configured assumptions; they are not measured traffic or commercial costs.

## Run

This repository is a browser-based application. Serve the repository root over HTTP (rather than opening `index.html` as a local file) so scripts, workers, and browser data APIs can load correctly.

For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Data attribution

- OpenStreetMap data is © OpenStreetMap contributors and is available under the Open Database License (ODbL).
- AIS and aircraft data remain subject to their respective provider terms and coverage limitations.

## Development priorities

1. Keep the Leaflet 2D map reliable and retain the schematic view as a fallback.
2. Make every visible layer load a named, documented source or clearly show that it is unavailable.
3. Add rail, pipeline, waterways, terrain, and satellite sources with explicit geographic coverage.
4. Add source timestamps, freshness indicators, and provenance to every dataset.
5. Validate route weights against real measurements before making performance claims.

## License

See [LICENSE](LICENSE). Third-party datasets retain their own licenses and attribution requirements.

---

## Repository navigation

[Alphabetical file index](FILE_INDEX.md)

# Pipe-Web

**Global path and movement intelligence.** Explore connected networks, inspect geographic data, and compare candidate paths by time, distance, cost, or energy.

## Earth and online geographic data

The 3D Earth view uses the Globe.gl renderer with an online Blue Marble texture. It loads public vector overlays when the providers are reachable:

| Dataset | Source | Current use |
|---|---|---|
| Country boundaries | [Natural Earth via World Atlas TopoJSON](https://github.com/topojson/world-atlas) | Global country outlines on the 3D globe |
| Major rivers | [Natural Earth 1:110m physical vectors](https://www.naturalearthdata.com/downloads/110m-physical-vectors/) | Global river paths on the 3D globe |
| Road geometry | [OpenStreetMap via Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Fetch a bounded area, build a routable road graph, cache locally |
| Vessel positions | [OpenSeaFeed AIS stream](https://openseafeed.com/) | Live ship position observations when the stream is reachable |
| Aircraft positions | OpenSky-compatible Worker endpoint | Requires a user-deployed endpoint in `config.js`; not enabled by default |

The globe falls back to the 2D map if the 3D renderer cannot initialize. External datasets are loaded at runtime; availability depends on the user's network, provider uptime, CORS policy, and usage limits.

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

This landing-map integration is separate from the legacy AIS and aircraft modules described below. Those modules are not currently rendered by the map-first landing page. The Overpass timestamp indicates when the query completed; it does not mean the underlying OpenStreetMap edits were made at that time.

## Network coverage and honest status

- **Roads:** geographic OpenStreetMap road graph can be loaded for a searched area in the route planner. Requests are bounded to protect public Overpass services.
- **Ships:** live AIS positions are source-dependent and currently use the provider's default Europe/North Atlantic bounding box.
- **Rail, pipelines, and digital infrastructure:** layer concepts exist, but verified global geometry and live telemetry are not yet fully integrated.
- **Aircraft:** requires a configured Worker endpoint; no synthetic aircraft are displayed.
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

- Natural Earth geographic data is public domain; World Atlas redistributes Natural Earth boundaries as TopoJSON.
- OpenStreetMap data is © OpenStreetMap contributors and is available under the Open Database License (ODbL).
- AIS and aircraft data remain subject to their respective provider terms and coverage limitations.

## Development priorities

1. Keep the Earth renderer reliable and provide a 2D fallback.
2. Make every visible layer load a named, documented source or clearly show that it is unavailable.
3. Add rail, pipeline, waterways, terrain, and satellite sources with explicit geographic coverage.
4. Add source timestamps, freshness indicators, and provenance to every dataset.
5. Validate route weights against real measurements before making performance claims.

## License

See [LICENSE](LICENSE). Third-party datasets retain their own licenses and attribution requirements.

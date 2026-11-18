# Pipe-Web

**Every path. Clearly connected.**

Pipe-Web is a path-first network exploration and optimization interface. It helps users discover, compare and understand routes through connected systems. The path is the primary object; the thing moving through it is context.

> Discover. Compare. Optimize. Visualize.

## Current status

The repository contains a browser-based path explorer with five deterministic demonstration network domains plus real geographic network ingestion:

- Road networks
- Fluid pipelines
- Rail corridors
- Data transport networks
- Robot navigation grids

The routing engine calculates routes over weighted graphs, ranks alternatives against a selected objective, and visualizes the selected flow. Demo presets use simulated values. The geographic workflow can download real OpenStreetMap road geometry or accept user-provided GeoJSON / GPX files; travel-time and other derived metrics remain estimates, not live traffic or operational telemetry.

## Run locally

No package installation or build step is required. The schematic presets work locally; map/globe libraries, map tiles and OpenStreetMap downloads require an internet connection.

1. Clone the repository.
2. Open `index.html` in a modern browser, or serve the folder with a local static server:

```bash
python -m http.server 8000
```

3. Visit `http://localhost:8000`.

## Features

- **Path-first interface:** origin, destination and optimization objective.
- **Five network presets:** switch domains without changing the core graph engine.
- **Weighted shortest path:** Dijkstra's algorithm over an undirected graph.
- **Alternative routes:** generates and ranks alternate candidates by temporarily excluding edges from the primary route.
- **Multi-objective metrics:** time, distance, cost and energy.
- **Congestion-aware routing:** optional penalty for flagged links.
- **Flow visualization:** network nodes, links, highlighted routes and animated movement.
- **Responsive layout:** desktop and mobile-friendly explorer.

## Architecture

| File | Responsibility |
|---|---|
| `index.html` | Semantic application structure and controls |
| `styles.css` | Dark responsive interface and network visualization styles |
| `app.js` | Domain data, network import, graph construction, routing, ranking and SVG rendering |
| `geo-view.js` | Leaflet map and Globe.gl rendering using actual imported coordinates when available |

The graph model is deliberately domain-independent. Each domain supplies nodes, links and metric weights; the same pathfinding engine operates on all of them.

### Edge model

Each link stores:

`[from, to, time, distance, cost, energy, directed]` (the final flag is optional; when true, travel is allowed only from `from` to `to`)

The route engine selects the edge weight associated with the chosen objective. Congestion avoidance applies a configurable penalty to flagged links during path search. Reported route metrics are summed from the underlying edge values.

## Important limitations

This is an interactive prototype, not yet a production routing service.

- Demo graphs and metrics are hand-authored and deterministic.
- The congestion model is a simple penalty, not a live capacity or queueing model.
- Alternative-path generation is an MVP heuristic, not a complete implementation of Yen's K-shortest-path algorithm.
- The SVG map is schematic and not geographically accurate.
- No persistence, user accounts, backend service, live traffic feed, pipeline telemetry, or browser end-to-end test suite is included yet. The CI workflow checks JavaScript syntax and required entry points.
- A route marked optimal is optimal only for the selected objective and current demo graph/constraints.

## Next engineering milestones

1. Add unit and browser integration tests for graph construction, route correctness, one-way edges, disconnected graphs and objective metrics.
2. Implement a formally correct K-shortest loopless paths algorithm (Yen's algorithm).
3. Add capacities, flow rates, closures and domain-specific constraints to the imported network model.
4. Separate graph data, optimization algorithms and UI into independently testable modules.
5. Add real network adapters and source attribution; never present simulated values as live data.
6. Add large-graph performance strategies and reproducible benchmarks.
7. Add accessibility, keyboard interaction and automated browser tests.
8. Deploy the static explorer and document a reliable release process.

## Design principle

**The path is the product.** Pipe-Web should make every candidate route understandable: where it starts, where it goes, what it costs, why it wins, and what trade-offs it makes.

## License

MIT. See [LICENSE](LICENSE).

---

## Examples Used
- Finding a fastest route through a road network
- Comparing flow paths through a fluid pipeline
- Routing data through a network while balancing time, cost, and energy
- Navigating a robot grid around blocked cells


## Geospatial visualization milestone

The geospatial visualization layer adds three interchangeable views over the same path graph:

- **Schematic:** the original topology view.
- **2D Map:** an interactive Leaflet map with zoom, pan, node markers and route polylines.
- **3D Globe:** an interactive globe with network nodes and animated route arcs.

The current demo projects its schematic node layout into an illustrative coordinate area around Vijayawada so the map and globe can be exercised immediately. These are synthetic demonstration coordinates, **not surveyed infrastructure, actual roads, live traffic, or operational pipeline locations**. OpenStreetMap tiles are used only as geographic visual context and are attributed in the map.

The visualization layer is isolated in `geo-view.js`; route computation remains in the existing graph engine. Both geographic views respond to domain changes and route selection.

### Run and network requirements

Open the app through a local static server as described above. The geographic views load Leaflet, Globe.gl and map tiles from their respective CDNs, so an internet connection is required for those views. The schematic explorer remains the local fallback.

### Next geospatial milestones

1. Import real GeoJSON / OpenStreetMap road graphs and preserve source attribution.
2. Add coordinate-aware graph routing rather than projecting schematic coordinates.
3. Support user-imported GeoJSON, GPX and network datasets.
4. Add globe-to-map transitions, route elevation and time-aware flow playback.
5. Add domain adapters for real transport, utility and data-network feeds.


## Real geographic network ingestion

- **OpenStreetMap area loader:** search a place, download nearby road ways through Nominatim and Overpass, build a coordinate-aware graph in the browser, then optimize routes over the downloaded road segments.
- **GeoJSON / GPX import:** load LineString or MultiLineString GeoJSON networks, or GPX tracks/routes, and route over their actual coordinates.
- **Geographic rendering:** the map fits imported network bounds; the globe uses the same coordinates and selected route.

OSM road distances use the haversine formula. Travel-time weights use road-class speed defaults or tagged maxspeed where available; these are estimates, not live traffic ETAs. One-way OSM roads are directed. GeoJSON/GPX estimated time, cost and energy are derived from distance. Public geocoding and Overpass services have usage limits; retry later or import a local file if unavailable. OSM data is © OpenStreetMap contributors. Internet access is required for OSM downloads, map tiles and globe assets.

The shortest-path engine uses a binary min-heap Dijkstra traversal. Alternative paths remain bounded heuristic candidates rather than a complete K-shortest-path guarantee. Networks above 500 nodes are explored in map/globe views rather than the schematic SVG.

 
## Planet-scale world visualizer

The **World flows** view is a global, interactive 3D globe with selectable illustrative layers:

- Air connectivity
- Digital backbone
- Maritime corridors
- Energy connections

Each layer plots named hubs across multiple continents and draws animated arcs between them. This global visualization mode does not depend on importing a local road network. The hub-to-hub connections are conceptual examples for exploring the visual system; they are **not** a verified map of actual airline schedules, submarine cables, shipping tracks, power interconnectors, or live traffic.

Use **World flows** in the view switch, then change the global flow layer. The existing **2D Map** and **3D Globe** views continue to show the currently loaded local/imported network. A future data-adapter milestone can replace illustrative layers with attributed, validated global datasets and timestamps.


## Live data: free first, paid optional

Pipe-Web's live-data policy and source inventory are documented in [LIVE-DATA.md](LIVE-DATA.md). The first free live adapter is an optional Cloudflare Worker proxy for anonymous OpenSky aircraft positions:

- Deploy `workers/live-api.js` as a Cloudflare Worker and route `/api/aircraft` to it.
- It normalizes aircraft positions and caches the global response for 15 minutes to respect OpenSky's anonymous quota (400 credits/day; a global request costs 4 credits).
- It requires no API secret. Coverage is incomplete and the feed must not be described as every aircraft worldwide.
- The static app remains usable without deploying the worker; the current World flows are illustrative until a live feed is connected and verified.

AISStream offers a free live AIS feed but requires a server-side API key and backend WebSocket proxy; direct browser connections are not permitted. We will keep that integration optional and never expose its key in frontend code. Commercial AIS, higher-rate aircraft, live traffic and operational internet / energy telemetry are listed as paid or approval-required upgrades where applicable.

**Data integrity rule:** every real-time layer must display its provider, timestamp, connection state and coverage caveats. Simulated connections remain labelled illustrative.

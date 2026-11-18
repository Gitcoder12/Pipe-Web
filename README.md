# Pipe-Web

**Every path. Clearly connected.**

Pipe-Web is a path-first network exploration and optimization interface. It helps users discover, compare and understand routes through connected systems. The path is the primary object; the thing moving through it is context.

> Discover. Compare. Optimize. Visualize.

## Current status

The repository now contains a working, dependency-free browser MVP with five deterministic demonstration network domains:

- Road networks
- Fluid pipelines
- Rail corridors
- Data transport networks
- Robot navigation grids

The demo calculates routes over a weighted graph, ranks alternatives against a selected objective, and visualizes the network and selected flow. All displayed network values are simulated; this version does not connect to live maps, traffic, pipeline telemetry, railway feeds, or network measurements.

## Run locally

No package installation or build step is required.

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
| `app.js` | Domain data, graph construction, routing, ranking and SVG rendering |

The graph model is deliberately domain-independent. Each domain supplies nodes, links and metric weights; the same pathfinding engine operates on all of them.

### Edge model

Each undirected link currently stores:

`[from, to, time, distance, cost, energy]`

The route engine selects the edge weight associated with the chosen objective. Congestion avoidance applies a configurable penalty to flagged links during path search. Reported route metrics are summed from the underlying edge values.

## Important limitations

This is an interactive prototype, not yet a production routing service.

- Demo graphs and metrics are hand-authored and deterministic.
- The congestion model is a simple penalty, not a live capacity or queueing model.
- Alternative-path generation is an MVP heuristic, not a complete implementation of Yen's K-shortest-path algorithm.
- The SVG map is schematic and not geographically accurate.
- No persistence, user accounts, external APIs, backend service, live telemetry or automated test suite is included yet.
- A route marked optimal is optimal only for the selected objective and current demo graph/constraints.

## Next engineering milestones

1. Add unit tests for graph construction, route correctness, disconnected graphs and objective metrics.
2. Implement a formally correct K-shortest loopless paths algorithm (Yen's algorithm).
3. Add directed links, capacities, flow rates, closures and domain-specific constraints.
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

# Pipe-Web

**Every path. Clearly connected.**

Pipe-Web is an interactive path-intelligence workspace for exploring networks, comparing alternative routes and understanding why one path performs better than another.

<p align="center">
  <strong>Discover · Compare · Optimize · Visualize</strong>
</p>

**Website:** [Open Pipe-Web](https://gitcoder12.github.io/Pipe-Web/) — the public URL after GitHub Pages is enabled and the first deployment succeeds.

## What it does

- **Path-first optimization:** select an origin, destination and objective.
- **Three ranked alternatives:** compare the best available paths instead of seeing only one answer.
- **Color-coded ranking:** green = fastest / best, yellow = medium, red = slowest for the selected objective.
- **Interactive flow:** select a route card to emphasize that path on the schematic, 2D map and 3D globe.
- **Network domains:** roads, fluid pipelines, rail, data transport and robot navigation.
- **Geographic input:** import GeoJSON / GPX or load road geometry from OpenStreetMap.
- **Live Earth:** plot observed aircraft positions from the OpenSky Network on a rotatable 3D Earth, with source, refresh time and feed status.
- **World flows:** explore illustrative digital, maritime and energy connections; these remain clearly separated from live telemetry.

## Route ranking

| Color | Meaning |
|---|---|
| <span style="color:#35d39a">Green</span> | Rank 1 — fastest / best for the selected objective |
| <span style="color:#e8b94e">Yellow</span> | Rank 2 — medium alternative |
| <span style="color:#ef6262">Red</span> | Rank 3 — slowest of the displayed alternatives |

The optimizer ranks candidates using the selected metric: time, distance, cost or energy. The colors follow rank order and do not change when a user selects a different card. Selecting a card changes visual emphasis, not its rank.

The current alternative-path generator is a bounded edge-exclusion heuristic; it is not a formal guarantee of the global top three loopless paths. Demo network weights are illustrative.

## Run locally

No package installation or build step is required.

```bash
git clone https://github.com/Gitcoder12/Pipe-Web.git
cd Pipe-Web
python -m http.server 8000
```

Open http://localhost:8000.

The schematic view works locally. Map tiles, the 3D globe assets, geocoding and OpenStreetMap downloads require an internet connection. Route search runs in `workers/path-worker.js`, keeping Dijkstra calculations off the UI thread. Imported networks support up to 100,000 nodes; map rendering can still be the limiting factor for very large graphs.

## Views

- **Schematic:** clear network topology with ranked, animated route overlays.
- **2D Map:** geographic network geometry, origin / destination markers and three ranked route overlays.
- **Live Earth:** rotate a 3D Earth showing aircraft positions observed by OpenSky. The browser refreshes at a conservative 15-minute interval and displays LIVE / OFFLINE state.
- **World flows:** conceptual global connections across digital, maritime and energy domains. These are not live operational feeds.

World-flow arcs are illustrative examples, not verified live flight paths, vessel tracks, submarine cables, energy interconnectors or operational traffic.

## Network data

- OpenStreetMap road geometry can be fetched for a searched area.
- GeoJSON LineString / MultiLineString and GPX routes can be imported.
- Road travel times are estimated from road class or tagged speed limits.
- Demo data is deterministic and must not be mistaken for live telemetry.

See [LIVE-DATA.md](LIVE-DATA.md) for the free-first data-source inventory, working OpenSky proxy and optional paid integrations.

## Architecture

| File | Responsibility |
|---|---|
| `index.html` | Application structure and controls |
| `config.js` | Public data endpoint configuration (no secrets) |
| `styles.css` | Responsive interface, route palette and motion |
| `app.js` | Graph data, route UI, ranking and schematic rendering |\n| `workers/path-worker.js` | Off-main-thread Dijkstra search and alternative-path calculation |
| `geo-view.js` | Leaflet map and Globe.gl visualization |
| `LIVE-DATA.md` | Free and paid data-source inventory, quotas and integrity rules |
| `workers/live-api.js` | Cached anonymous OpenSky aircraft proxy |
| `.github/workflows/ci.yml` | JavaScript syntax and entry-point checks |
| `.github/workflows/deploy.yml` | Automatic GitHub Pages deployment |

## Deployment

The repository includes a GitHub Actions workflow that publishes the static site on pushes to `main`.

One-time setup: open **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**, and save. After the deployment workflow succeeds, the website is available at:

https://gitcoder12.github.io/Pipe-Web/

GitHub Pages is free for public repositories. See the [official deployment guide](https://docs.github.com/en/pages/getting-started-with-github-pages).

## Data integrity

- Never label simulated data as live.
- Geographic geometry is not live traffic.
- Global conceptual arcs are not verified operational routes.
- Real feeds must show provider, timestamp, connection state and coverage limitations.
- Respect upstream provider quotas, licences and attribution requirements.

## License

MIT. See [LICENSE](LICENSE).

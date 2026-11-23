# Pipe-Web — interview demonstration

## 30-second explanation

Pipe-Web is a browser-based network and path-exploration interface. It combines a map-first view, viewport-bounded OpenStreetMap geometry, a route planner, and alternative schematic network views. The planner compares candidate paths using configurable objectives such as time, distance, cost, or energy.

The key engineering story is the separation of mapped geographic data, estimated route weights, and illustrative flow ribbons.

## 90-second live demo

### 1. Start locally

From the repository root:

~~~bash
python -m http.server 8000
~~~

Open http://localhost:8000 in a browser. Do not open index.html directly as a file; the app loads scripts, workers, and browser APIs over HTTP.

### 2. Demonstrate the interface

1. Show the map-first landing page and switch between the available map/network views.
2. Select a layer and explain what source backs it.
3. Open the route planner and compare fastest-time, shortest-distance, lowest-cost, and lowest-energy objectives.
4. Show alternative paths and the route weights used in the comparison.
5. Open the flow explorer and explain which ribbons are illustrative rather than observed movements.

### 3. Explain the data boundaries

| Data | What it means | What it does not mean |
|---|---|---|
| OpenStreetMap Overpass road geometry | Mapped road ways within a bounded viewport | Live traffic or congestion |
| OSM ferry/rail/pipeline ways | Mapped infrastructure/service geometry | Live transport or pipeline telemetry |
| OpenSeaFeed AIS layer | Provider-sourced ship position observations when reachable | Global, guaranteed live vessel coverage |
| Curated hub-to-hub ribbons | Animated schematic examples | Observed vehicle, freight, or data movement |
| Route time/cost/energy weights | Estimates from available tags and configured assumptions | Measured commercial cost or verified travel time |

The README documents coverage and provider dependencies. Be explicit when an external source is unavailable.

## Engineering points to explain

- Leaflet provides the 2D map interface.
- Overpass requests are bounded by viewport size and use timeout/fallback behavior.
- OSM road geometry is fetched and cached separately from the schematic network examples.
- Route search is moved to a Web Worker so pathfinding does not block the main interface.
- The app separates live/source-backed observations, mapped infrastructure, estimates, and illustrative animation.

## Likely interview questions

**Is every animated line live traffic?**  
No. The README explicitly identifies hub-to-hub ribbons as schematic/illustrative. OSM geometry is shown separately and is not live traffic.

**How does the app handle an Overpass outage?**  
The road loader tries configured endpoints, enforces a timeout, and can return cached data as stale when available. Demonstrate the unavailable-data message rather than claiming all providers are always reachable.

**Are the route times and costs measured?**  
No. They are estimates based on available tags and configured assumptions; validate them against real measurements before making performance claims.

## Before sharing with an interviewer

- Run the app from a clean checkout over HTTP.
- Test the map with network access and with external data unavailable.
- Test all objective selectors and alternative route behavior.
- Check the browser console for errors.
- Explain provider limits and all schematic data labels.
- Capture a short screen recording showing one complete route-planning task.

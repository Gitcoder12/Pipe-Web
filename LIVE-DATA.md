# Pipe-Web live data: free first, paid clearly optional

This document is the source-of-truth inventory for real-world data integrations. A layer must never be labelled **LIVE** unless it is currently receiving and timestamping real provider data. Illustrative arcs stay labelled **DEMO / ILLUSTRATIVE**.

## Free integrations

| Layer | Provider / dataset | Free access | Limitations and implementation |
|---|---|---|---|
| Aircraft positions | [OpenSky Network REST API](https://openskynetwork.github.io/opensky-api/rest.html) | Anonymous API access | Global `/states/all` costs 4 credits; anonymous quota is 400 credits/day. Budget for no more than 100 global requests/day (about one every 14.4 minutes). Coverage depends on volunteer ADS-B receivers; oceanic and remote coverage is incomplete. The optional Cloudflare Worker in `workers/live-api.js` proxies and caches this feed without credentials. |
| Ship positions | [AISStream](https://aisstream.io/) | Provider advertises a free real-time AIS WebSocket API; create a free API key | API key must remain server-side. Direct browser connections are explicitly disallowed. Add a backend WebSocket proxy before enabling this layer. AIS is event-driven and coverage varies; it is not a complete view of every vessel. |
| Roads and geographic context | [OpenStreetMap](https://www.openstreetmap.org/) | Open data under ODbL | Existing Nominatim / Overpass importer and map tiles are subject to public-service usage policies. Geometry is not live traffic. Attribute OpenStreetMap contributors. |
| Internet infrastructure | [PeeringDB](https://www.peeringdb.com/) and public IX / submarine-cable datasets | Publicly accessible datasets / APIs, subject to each source's terms | Use to map known data centres, internet exchanges and cable landing points. These are infrastructure inventories, not live packet flows or bandwidth telemetry. |
| Energy infrastructure | OpenStreetMap and public government / grid-operator datasets | Depends on jurisdiction and dataset licence | Map published lines, substations and interconnectors where licences permit. Static topology is not real-time power flow, generation or grid telemetry. |

### OpenSky anonymous quota calculation

The current OpenSky documentation lists 400 daily credits for anonymous users. A global `/states/all` query costs 4 credits, so the theoretical ceiling is 100 global calls per day. A 15-minute cache interval uses at most 96 calls/day, leaving a small buffer. This is a deliberately slow live layer, not a second-by-second tracker. Do not poll more frequently unless the account's quota and provider policy support it.

### AISStream implementation gate

AISStream requires a free API key and says browser-direct connections are not permitted. Do not put the key in `index.html`, browser JavaScript, Git history, issues or chat. Add a server-side WebSocket proxy with an environment secret, bounded subscriptions, reconnect/backoff, message validation and a client-facing feed before switching on live ships.

## Paid / approval-required integrations

These are optional upgrades, not prerequisites for the free MVP:

- Commercial-grade AIS feeds, satellite AIS and higher-confidence global vessel coverage.
- Higher-rate / licensed aircraft data, historical flight datasets and commercial redistribution rights.
- Live road traffic, incident, congestion and travel-time APIs.
- Commercial internet traffic, backbone capacity and network telemetry.
- Grid-operator / utility telemetry and real-time energy-market or power-flow feeds.
- Higher-volume hosting, managed streaming, durable storage and observability if usage outgrows free tiers.

Provider pricing and licensing change. Confirm current terms directly before selecting or displaying a paid provider. Do not describe a provider as paid or free beyond what its current terms establish.

## Display and data-integrity rules

Every live layer must show:
- Provider and source link.
- Last successful provider timestamp and last refresh time.
- Connection state: LIVE, STALE, OFFLINE or DEMO.
- Coverage / quota caveats.
- A visible distinction between observed positions, published infrastructure and illustrative routes.

Never interpolate a missing aircraft or vessel position and present it as observed. Never draw a conceptual route and call it a live movement. Preserve provider attribution and comply with data licences.

## Deployment

The static app can still run without a backend. The current Live Earth client queries the OpenSky `/states/all` endpoint directly and refreshes at most once every 15 minutes per open tab. Anonymous global queries cost 4 credits each, so a shared Cloudflare Worker cache is strongly recommended before broad public traffic. To enable the anonymous OpenSky proxy, deploy `workers/live-api.js` as a Cloudflare Worker and route `/api/aircraft` to it on the app's origin (or configure a same-origin reverse proxy). The worker uses no secret because it uses anonymous access, and caches global results for 15 minutes to respect the documented quota. The current UI's illustrative World flows remain the fallback until a live adapter is connected and verified.

AISStream requires a separate server-side WebSocket proxy and a server environment variable named `AISSTREAM_API_KEY`; this is not included as an active browser integration.

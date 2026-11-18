/**
 * Pipe-Web anonymous OpenSky proxy for Cloudflare Workers.
 *
 * Route: GET /api/aircraft
 * Uses anonymous OpenSky access and a 15-minute edge cache.
 * Global /states/all costs 4 credits; anonymous quota is 400 credits/day.
 * No credentials are required. Do not increase the cache refresh frequency
 * without checking the provider's current quota and terms.
 */
const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const CACHE_SECONDS = 15 * 60;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=0, s-maxage=${CACHE_SECONDS}`,
      "access-control-allow-origin": "*",
      ...extra
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      });
    }
    if (request.method !== "GET" || url.pathname !== "/api/aircraft") {
      return json({ error: "Not found" }, 404);
    }

    const cache = caches.default;
    const cacheKey = new Request(new URL("/__pipeweb_cache/aircraft", url.origin));
    const cached = await cache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("x-pipeweb-cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }

    try {
      const upstream = await fetch(OPENSKY_URL, {
        headers: { "accept": "application/json" },
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }
      });
      if (!upstream.ok) {
        return json({
          status: "OFFLINE",
          source: "OpenSky Network",
          error: `Provider returned HTTP ${upstream.status}`,
          fetchedAt: new Date().toISOString()
        }, upstream.status === 429 ? 503 : upstream.status);
      }

      const payload = await upstream.json();
      const states = Array.isArray(payload.states) ? payload.states : [];
      const aircraft = states.flatMap((s) => {
        const longitude = s[5], latitude = s[6];
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
        return [{
          icao24: s[0],
          callsign: (s[1] || "").trim(),
          originCountry: s[2] || null,
          longitude,
          latitude,
          altitudeM: Number.isFinite(s[7]) ? s[7] : null,
          onGround: Boolean(s[8]),
          velocityMs: Number.isFinite(s[9]) ? s[9] : null,
          headingDeg: Number.isFinite(s[10]) ? s[10] : null,
          verticalRateMs: Number.isFinite(s[11]) ? s[11] : null,
          lastContact: Number.isFinite(s[4]) ? s[4] : null
        }];
      });

      const body = {
        status: "LIVE",
        source: "OpenSky Network",
        sourceUrl: "https://opensky-network.org/",
        fetchedAt: new Date().toISOString(),
        providerTime: Number.isFinite(payload.time) ? payload.time : null,
        count: aircraft.length,
        coverageNote: "ADS-B receiver coverage is incomplete; this is not every aircraft worldwide.",
        quotaNote: "Anonymous global polling is cached for 15 minutes to stay within the documented 400-credit daily quota.",
        aircraft
      };
      const response = json(body);
      const stored = new Response(response.clone().body, {
        status: response.status,
        headers: response.headers
      });
      stored.headers.set("cache-control", `public, max-age=${CACHE_SECONDS}`);
      ctx.waitUntil(cache.put(cacheKey, stored));
      const headers = new Headers(response.headers);
      headers.set("x-pipeweb-cache", "MISS");
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      return json({
        status: "OFFLINE",
        source: "OpenSky Network",
        error: "Could not retrieve aircraft positions.",
        detail: error instanceof Error ? error.message : String(error),
        fetchedAt: new Date().toISOString()
      }, 502);
    }
  }
};

/* Optional same-origin or Cloudflare Worker data endpoints. Keep secrets out of this file. */
window.PIPEWEB_CONFIG = {
  // After deploying workers/live-api.js, replace this with
  // https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api/aircraft
  aircraftApi: "https://opensky-network.org/api/states/all"
};

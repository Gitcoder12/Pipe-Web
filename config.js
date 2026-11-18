/* Optional same-origin or Cloudflare Worker data endpoints. Keep secrets out of this file. */
window.PIPEWEB_CONFIG = {
  // After deploying workers/live-api.js, replace this with
  // https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api/aircraft
  aircraftApi: "https://opensky-network.org/api/states/all",
  // Set this to a same-origin Cloudflare Worker endpoint backed by a licensed AIS provider.
  // Never put an AIS provider secret in this public client-side file.
  vesselsApi: ""
};

/* Public client configuration. Never put provider credentials here. */
window.PIPEWEB_CONFIG = Object.freeze({
  // Configure after deploying workers/live-api.js. Example: https://your-worker.workers.dev/api/aircraft
  aircraftApi: "",
  // Licensed AIS integrations must be configured server-side.
  vesselsApi: ""
});

/* Pipe-Web globe-first landing controller. Live data only; no synthetic traffic. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const MOBILE_QUERY = "(max-width: 767px)";
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const state = { view: isMobile() ? "2d" : "3d", ships: new Map(), air: [], map: null, markers: new Map(), globe: null, unsubscribe: null, tiltEnabled: false, toastTimer: null };
  const shipColor = speed => {
    const value = Number.isFinite(speed) ? Math.max(0, Math.min(35, speed)) : 0;
    const ratio = value / 35;
    const red = Math.round(40 + ratio * 215), green = Math.round(145 - ratio * 105), blue = Math.round(235 - ratio * 190);
    return "rgb(" + red + "," + green + "," + blue + ")";
  };
  function toast(message) {
    const el = $("landingToast"); if (!el) return;
    el.textContent = message; el.classList.add("show");
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function status(message, mode) {
    $("liveCounts").textContent = message;
    $("feedPulse").className = "feed-pulse" + (mode === "live" ? " is-live" : mode === "error" ? " is-error" : "");
  }
  function updateCounts() {
    const shipCount = state.ships.size;
    const airCount = state.air.length;
    const airConfigured = Boolean(window.PIPEWEB_CONFIG && window.PIPEWEB_CONFIG.aircraftApi && !/opensky-network\.org\/api/i.test(window.PIPEWEB_CONFIG.aircraftApi));
    const shipLabel = shipCount.toLocaleString() + " ships";
    const airLabel = airConfigured ? airCount.toLocaleString() + " aircraft" : "air unavailable";
    status(shipCount ? "🚢 " + shipLabel + " · ✈️ " + airLabel : "Connecting to live feed…", shipCount ? "live" : "connecting");
  }
  function initGlobe() {
    if (isMobile() || !window.Globe || state.globe) return;
    const host = $("liveGlobe");
    state.globe = Globe()(host)
      .rendererConfig({ preserveDrawingBuffer: true, antialias: true, alpha: false })
      .backgroundColor("#0a0a0a")
      .showAtmosphere(true).atmosphereColor("#287da3").atmosphereAltitude(0.16)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .showGraticules(false)
      .pointLat(d => d.lat).pointLng(d => d.lng)
      .pointColor(d => d.color).pointRadius(d => d.radius || 0.14)
      .pointAltitude(0.002).pointResolution(8)
      .pointLabel(d => d.label)
      .onPointClick(d => toast(d.label || "Observed vessel"));
    state.globe.width(host.clientWidth).height(host.clientHeight);
    state.globe.controls().autoRotate = true;
    state.globe.controls().autoRotateSpeed = 0.3;
    state.globe.controls().enableDamping = true;
    state.globe.controls().dampingFactor = 0.08;
    state.globe.pointOfView({ lat: 22, lng: 10, altitude: 2.1 }, 0);
  }
  function initMap() {
    if (!window.L || state.map) return;
    state.map = L.map("liveMap", { zoomControl: false, worldCopyJump: true, preferCanvas: true, attributionControl: true }).setView([24, 8], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 8, attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(state.map);
  }
  function toPoint(ship) {
    const speed = Number.isFinite(ship.sog) ? ship.sog : null;
    const name = ship.name || ("Vessel " + (ship.mmsi || "unknown"));
    const speedText = speed == null ? "Speed unavailable" : speed.toFixed(1) + " kn";
    return { lat: ship.lat, lng: ship.lon, color: shipColor(speed), radius: 0.16, label: escapeHtml(name) + " · " + speedText };
  }
  function renderGlobe() {
    if (!state.globe) return;
    const points = [...state.ships.values()].filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon)).map(toPoint);
    state.globe.pointsData(points);
  }
  function renderMap() {
    if (!state.map) return;
    const active = new Set();
    for (const ship of state.ships.values()) {
      if (!Number.isFinite(ship.lat) || !Number.isFinite(ship.lon)) continue;
      const id = String(ship.mmsi); active.add(id);
      const color = shipColor(ship.sog);
      let marker = state.markers.get(id);
      const html = '<span class="live-ship-dot" style="color:' + color + ';background:' + color + '"></span>';
      if (!marker) {
        marker = L.marker([ship.lat, ship.lon], { icon: L.divIcon({ className: "live-ship-marker", html, iconSize: [9,9], iconAnchor: [4,4] }) }).addTo(state.map);
        state.markers.set(id, marker);
      } else {
        marker.setLatLng([ship.lat, ship.lon]);
        marker.setIcon(L.divIcon({ className: "live-ship-marker", html, iconSize: [9,9], iconAnchor: [4,4] }));
      }
      marker.bindTooltip(escapeHtml(ship.name || ("Vessel " + id)) + " · " + (ship.sog == null ? "Speed n/a" : ship.sog.toFixed(1) + " kn"));
    }
    for (const [id, marker] of state.markers) if (!active.has(id)) { state.map.removeLayer(marker); state.markers.delete(id); }
  }
  function render() { renderGlobe(); renderMap(); updateCounts(); }
  function showView(view) {
    state.view = view;
    $("liveGlobe").hidden = view !== "3d";
    $("liveMap").hidden = view !== "2d";
    $("viewToggle").innerHTML = view === "3d" ? "🌐 <span>3D</span>" : "🗺️ <span>2D</span>";
    $("viewToggle").setAttribute("aria-label", view === "3d" ? "Switch to 2D map" : "Switch to 3D globe");
    if (view === "3d") { initGlobe(); renderGlobe(); }
    else { initMap(); renderMap(); requestAnimationFrame(() => state.map && state.map.invalidateSize()); }
  }
  function connectSea() {
    const feed = window.PipeWebMaritime;
    if (!feed) { status("Live ship feed unavailable", "error"); return; }
    if (state.unsubscribe) state.unsubscribe();
    state.unsubscribe = feed.subscribe(snapshot => {
      state.ships = new Map((snapshot.ships || []).map(ship => [String(ship.mmsi), ship]));
      render();
      if (!state.ships.size && snapshot.status !== "LIVE") status("Connecting to live feed…", "connecting");
      else if (!state.ships.size) status("Connected · waiting for ship positions…", "connecting");
    });
    feed.connect();
  }
  function openMenu(open) {
    $("landingMenu").hidden = !open;
    $("menuToggle").setAttribute("aria-expanded", String(open));
  }
  function openSettings(open) {
    $("landingSettings").hidden = !open;
    $("settingsToggle").setAttribute("aria-expanded", String(open));
  }
  function setLayer(name, enabled) {
    const button = document.querySelector('.layer-pill[data-layer="' + name + '"]');
    if (button) { button.classList.toggle("active", enabled); button.setAttribute("aria-pressed", String(enabled)); }
    if (name === "sea") {
      if (enabled) connectSea();
      else if (window.PipeWebMaritime) { window.PipeWebMaritime.disconnect(false); if (state.unsubscribe) state.unsubscribe(); state.unsubscribe = null; }
      return;
    }
    if (name === "air") {
      const endpoint = window.PIPEWEB_CONFIG && window.PIPEWEB_CONFIG.aircraftApi;
      if (!endpoint || /opensky-network\.org\/api/i.test(endpoint)) {
        if (button) { button.classList.remove("active"); button.setAttribute("aria-pressed", "false"); }
        toast("Aircraft feed is not configured. Deploy the Worker first.");
      } else {
        toast("Aircraft endpoint detected; aircraft rendering is not enabled in this landing build yet.");
        if (button) { button.classList.remove("active"); button.setAttribute("aria-pressed", "false"); }
      }
      return;
    }
    if (enabled) toast(name.charAt(0).toUpperCase() + name.slice(1) + " layer has no verified live feed connected yet.");
  }
  function syncMobileLayers() {
    const source = $("layerTray"), target = $("mobileLayerButtons");
    if (!source || !target || target.childElementCount) return;
    source.querySelectorAll(".layer-pill").forEach(button => {
      const clone = button.cloneNode(true);
      clone.addEventListener("click", () => {
        const original = source.querySelector('[data-layer="' + clone.dataset.layer + '"]');
        const enabled = !original.classList.contains("active");
        if (clone.dataset.layer !== "sea" && clone.dataset.layer !== "air") {
          toast(clone.dataset.layer.charAt(0).toUpperCase() + clone.dataset.layer.slice(1) + " layer has no verified live feed connected yet.");
          return;
        }
        setLayer(clone.dataset.layer, enabled);
        clone.classList.toggle("active", enabled);
      });
      target.appendChild(clone);
    });
  }
  async function enableTilt() {
    if (!isMobile()) { toast("Phone tilt navigation is available on mobile."); return; }
    if (typeof DeviceOrientationEvent === "undefined") { toast("Motion sensors are not available in this browser."); return; }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") throw new Error("Motion permission was not granted.");
      }
      state.tiltEnabled = true;
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
      toast("Tilt navigation enabled.");
    } catch (error) { toast(error.message || "Could not enable motion sensors."); $("tiltToggle").checked = false; }
  }
  let lastTiltAt = 0;
  function onOrientation(event) {
    if (!state.tiltEnabled || !state.map) return;
    const now = Date.now(); if (now - lastTiltAt < 100) return; lastTiltAt = now;
    const gamma = Math.max(-25, Math.min(25, Number(event.gamma) || 0));
    const beta = Math.max(-25, Math.min(25, (Number(event.beta) || 0) - 35));
    const center = state.map.getCenter();
    state.map.panTo([center.lat - beta * 0.002, center.lng + gamma * 0.002], { animate: false });
  }
  function takeScreenshot() {
    if (state.view !== "3d" || !state.globe) { toast("Switch to 3D to capture the globe."); return; }
    try {
      const canvas = state.globe.renderer().domElement;
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a"); link.href = image; link.download = "pipe-web-globe.png";
      document.body.appendChild(link); link.click(); link.remove();
      toast("Globe screenshot saved.");
    } catch (_) { toast("Screenshot blocked by browser graphics security."); }
  }
  function route() {
    const hash = location.hash || "#/";
    if (hash === "#/" || hash === "#" || hash === "") {
      document.body.classList.remove("legacy-route");
      $("legacyWorkspace").setAttribute("aria-hidden", "true");
      openMenu(false); openSettings(false); return;
    }
    const routes = {
      "#/route-planner": "route-planner",
      "#/corridors": "intelligence",
      "#/bottlenecks": "intelligence",
      "#/sankey": "flowMap",
      "#/statistics": "flowMetrics"
    };
    const target = routes[hash];
    if (!target) { toast("Unknown section. Returning to the live globe."); location.hash = "#/"; return; }
    document.body.classList.add("legacy-route");
    $("legacyWorkspace").setAttribute("aria-hidden", "false");
    openMenu(false);
    requestAnimationFrame(() => {
      const el = $(target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target === "flowMap" && window.dispatchEvent) window.dispatchEvent(new Event("resize"));
    });
  }
  $("menuToggle").addEventListener("click", () => openMenu($("landingMenu").hidden));
  $("settingsToggle").addEventListener("click", () => openSettings($("landingSettings").hidden));
  $("viewToggle").addEventListener("click", () => {
    if (isMobile()) { showView("2d"); toast("3D globe is disabled on small screens for performance."); }
    else showView(state.view === "3d" ? "2d" : "3d");
  });
  $("screenshotBtn").addEventListener("click", takeScreenshot);
  $("tiltToggle").addEventListener("change", event => { if (event.target.checked) enableTilt(); else { state.tiltEnabled = false; window.removeEventListener("deviceorientation", onOrientation); } });
  $("layerTray").addEventListener("click", event => {
    const button = event.target.closest(".layer-pill"); if (!button) return;
    const name = button.dataset.layer, enabled = !button.classList.contains("active");
    if (name === "air" || name === "sea") setLayer(name, enabled);
    else { button.classList.toggle("active", enabled); button.setAttribute("aria-pressed", String(enabled)); if (enabled) setLayer(name, true); }
  });
  $("layerSheetBackdrop").addEventListener("click", () => { $("layerSheet").hidden = true; $("layerSheetBackdrop").hidden = true; });
  $("mobileLayersToggle").addEventListener("click", () => { $("layerSheet").hidden = false; $("layerSheetBackdrop").hidden = false; });
  $("menuToggle").addEventListener("contextmenu", event => event.preventDefault());
  document.addEventListener("click", event => {
    if (!event.target.closest("#landingMenu,#menuToggle")) openMenu(false);
    if (!event.target.closest("#landingSettings,#settingsToggle")) openSettings(false);
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => {
    if (isMobile()) { $("viewToggle").disabled = true; showView("2d"); }
    else { $("viewToggle").disabled = false; if (!state.globe) showView("3d"); else if (state.view === "2d") { if (state.map) state.map.invalidateSize(); } else state.globe.width($("liveGlobe").clientWidth).height($("liveGlobe").clientHeight); }
  });
  syncMobileLayers();
  if (isMobile()) { $("viewToggle").disabled = true; $("viewToggle").title = "3D is disabled on mobile"; }
  showView(state.view);
  connectSea();
  route();
  status("Connecting to live feed…", "connecting");
})();
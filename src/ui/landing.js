/* Pipe-Web map-first landing controller. Leaflet only; no WebGL globe on the landing page. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const state = { map: null, ships: new Map(), markers: new Map(), unsubscribe: null, toastTimer: null, railLayer: null, railBusy: false, railTimer: null, railAbort: null };
  const shipColor = speed => {
    const value = Number.isFinite(speed) ? Math.max(0, Math.min(35, speed)) : 0;
    const ratio = value / 35;
    return "rgb(" + Math.round(40 + ratio * 215) + "," + Math.round(145 - ratio * 105) + "," + Math.round(235 - ratio * 190) + ")";
  };
  function toast(message) {
    const el = $("landingToast"); if (!el) return;
    el.textContent = message; el.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function status(message, mode) {
    const counts = $("liveCounts"), pulse = $("feedPulse");
    if (counts) counts.textContent = message;
    if (pulse) pulse.className = "feed-pulse" + (mode === "live" ? " is-live" : mode === "error" ? " is-error" : "");
  }
  function initMap() {
    if (state.map) return true;
    if (!window.L) {
      status("Map library unavailable · check connection and reload", "error");
      console.error("Pipe-Web: Leaflet (window.L) did not load.");
      return false;
    }
    const host = $("liveMap");
    if (!host) return false;
    // Leaflet must measure a visible container during construction.
    host.hidden = false;
    $("liveGlobe").hidden = true;
    try {
      state.map = L.map(host, {
        zoomControl: false, worldCopyJump: true, preferCanvas: true,
        attributionControl: true, minZoom: 2, maxZoom: 18
      }).setView([22, 15], 2);
      L.control.zoom({ position: "bottomright" }).addTo(state.map);
      // OpenStreetMap's public raster tiles need no API key. Keep attribution visible.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 2, maxZoom: 19, crossOrigin: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
      }).addTo(state.map);
      state.railLayer = L.layerGroup().addTo(state.map);
      state.map.on("moveend", () => {
        const railButton = document.querySelector('.layer-pill[data-layer="rail"]');
        if (railButton && railButton.classList.contains("active")) scheduleRailLoad();
      });
      requestAnimationFrame(() => state.map && state.map.invalidateSize());
      return true;
    } catch (error) {
      console.error("Pipe-Web map initialization failed:", error);
      status("Map failed to initialize · " + (error.message || "unknown error"), "error");
      state.map = null;
      return false;
    }
  }
  function renderShips() {
    if (!state.map || !window.L) return;
    const active = new Set();
    for (const ship of state.ships.values()) {
      const lat = Number(ship.lat), lng = Number(ship.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      const id = String(ship.mmsi || ship.id || lat + "," + lng);
      active.add(id);
      const color = shipColor(Number.isFinite(ship.sog) ? ship.sog : null);
      const html = '<span class="live-ship-dot" style="background:' + color + ';box-shadow:0 0 10px ' + color + '"></span>';
      const icon = L.divIcon({ className: "live-ship-marker", html, iconSize: [12,12], iconAnchor: [6,6] });
      let marker = state.markers.get(id);
      if (!marker) {
        marker = L.marker([lat,lng], { icon, keyboard: true, title: ship.name || "Observed vessel" }).addTo(state.map);
        state.markers.set(id, marker);
      } else {
        marker.setLatLng([lat,lng]);
        marker.setIcon(icon);
      }
      const name = String(ship.name || ("Vessel " + id)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
      const speed = Number.isFinite(ship.sog) ? ship.sog.toFixed(1) + " kn" : "Speed unavailable";
      marker.bindTooltip(name + " · " + speed);
    }
    for (const [id, marker] of state.markers) {
      if (!active.has(id)) { state.map.removeLayer(marker); state.markers.delete(id); }
    }
  }
  function updateCounts() {
    const count = state.ships.size;
    status(count ? "🚢 " + count.toLocaleString() + " observed ships" : "Map online · connecting to maritime feed…", count ? "live" : "connecting");
  }
  function render() { renderShips(); updateCounts(); }
  function connectSea() {
    const feed = window.PipeWebMaritime;
    if (!feed) { status("Map online · maritime feed unavailable", "error"); return; }
    if (state.unsubscribe) state.unsubscribe();
    state.unsubscribe = feed.subscribe(snapshot => {
      state.ships = new Map((snapshot.ships || []).map(ship => [String(ship.mmsi), ship]));
      render();
      if (!state.ships.size && snapshot.status === "LIVE") status("Connected · waiting for vessel positions…", "connecting");
    });
    feed.connect();
  }
  async function loadRailways() {
    if (!state.map || !state.railLayer || state.railBusy) return;
    const bounds = state.map.getBounds();
    const south = Math.max(-85, bounds.getSouth()), west = Math.max(-180, bounds.getWest());
    const north = Math.min(85, bounds.getNorth()), east = Math.min(180, bounds.getEast());
    // Avoid enormous global Overpass requests; rail lines load for the visible map area.
    if ((north - south) * (east - west) > 1800) {
      toast("Zoom in to load railway lines for this region.");
      return;
    }
    state.railBusy = true;
    if (state.railAbort) state.railAbort.abort();
    state.railAbort = new AbortController();
    const query = '[out:json][timeout:20];(way["railway"~"^(rail|light_rail|subway|tram)$"](' +
      south.toFixed(4) + "," + west.toFixed(4) + "," + north.toFixed(4) + "," + east.toFixed(4) +
      '););out geom;';
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: "data=" + encodeURIComponent(query), signal: state.railAbort.signal
      });
      if (!response.ok) throw new Error("Rail data HTTP " + response.status);
      const data = await response.json();
      state.railLayer.clearLayers();
      (data.elements || []).forEach(way => {
        if (!Array.isArray(way.geometry) || way.geometry.length < 2) return;
        const coords = way.geometry.map(p => [p.lat, p.lon]);
        L.polyline(coords, { color: "#f0b45f", weight: 2.2, opacity: 0.88, lineCap: "round" }).addTo(state.railLayer);
      });
      status("🚆 " + (data.elements || []).length.toLocaleString() + " railway segments · " + state.ships.size.toLocaleString() + " ships", state.ships.size ? "live" : "connecting");
    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Pipe-Web railway overlay unavailable:", error);
        toast("Railway data temporarily unavailable. Try again shortly.");
      }
    } finally { state.railBusy = false; }
  }
  function scheduleRailLoad() {
    clearTimeout(state.railTimer);
    state.railTimer = setTimeout(loadRailways, 700);
  }
  function setLayer(name, enabled) {
    const button = document.querySelector('.layer-pill[data-layer="' + name + '"]');
    if (button) { button.classList.toggle("active", enabled); button.setAttribute("aria-pressed", String(enabled)); }
    if (name === "sea") {
      if (enabled) connectSea();
      else if (window.PipeWebMaritime) {
        window.PipeWebMaritime.disconnect(false);
        if (state.unsubscribe) state.unsubscribe();
        state.unsubscribe = null; state.ships.clear(); render();
      }
      return;
    }
    if (name === "rail") {
      if (enabled) scheduleRailLoad();
      else { if (state.railAbort) state.railAbort.abort(); if (state.railLayer) state.railLayer.clearLayers(); }
      return;
    }
    if (button) { button.classList.remove("active"); button.setAttribute("aria-pressed", "false"); }
    toast(name.charAt(0).toUpperCase() + name.slice(1) + " overlay is not connected yet.");
  }
  function syncMobileLayers() {
    const source = $("layerTray"), target = $("mobileLayerButtons");
    if (!source || !target || target.childElementCount) return;
    source.querySelectorAll(".layer-pill").forEach(button => {
      const clone = button.cloneNode(true);
      clone.addEventListener("click", () => {
        const original = source.querySelector('[data-layer="' + clone.dataset.layer + '"]');
        setLayer(clone.dataset.layer, !original.classList.contains("active"));
        clone.classList.toggle("active", original.classList.contains("active"));
        clone.setAttribute("aria-pressed", original.getAttribute("aria-pressed"));
      });
      target.appendChild(clone);
    });
  }
  function openMenu(open) {
    $("landingMenu").hidden = !open;
    $("menuToggle").setAttribute("aria-expanded", String(open));
  }
  function openSettings(open) {
    $("landingSettings").hidden = !open;
    $("settingsToggle").setAttribute("aria-expanded", String(open));
  }
  function enableTilt() {
    toast("Tilt navigation is not available in map-only mode yet.");
    $("tiltToggle").checked = false;
  }
  function route() {
    const hash = location.hash || "#/";
    if (hash === "#/" || hash === "#" || hash === "") {
      document.body.classList.remove("legacy-route");
      $("legacyWorkspace").setAttribute("aria-hidden", "true");
      openMenu(false); openSettings(false); return;
    }
    const routes = { "#/route-planner":"route-planner", "#/corridors":"intelligence", "#/bottlenecks":"intelligence", "#/sankey":"flowMap", "#/statistics":"flowMetrics" };
    const target = routes[hash];
    if (!target) { toast("Unknown section. Returning to the live map."); location.hash = "#/"; return; }
    document.body.classList.add("legacy-route");
    $("legacyWorkspace").setAttribute("aria-hidden", "false");
    openMenu(false);
    requestAnimationFrame(() => {
      const el = $(target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target === "flowMap") window.dispatchEvent(new Event("resize"));
    });
  }
  $("menuToggle").addEventListener("click", () => openMenu($("landingMenu").hidden));
  $("settingsToggle").addEventListener("click", () => openSettings($("landingSettings").hidden));
  $("viewToggle").hidden = true;
  $("screenshotBtn").addEventListener("click", () => { if (state.map) state.map.setView([22, 15], 2, { animate: true }); });
  $("tiltToggle").addEventListener("change", enableTilt);
  $("layerTray").addEventListener("click", event => {
    const button = event.target.closest(".layer-pill"); if (!button) return;
    setLayer(button.dataset.layer, !button.classList.contains("active"));
  });
  $("layerSheetBackdrop").addEventListener("click", () => { $("layerSheet").hidden = true; $("layerSheetBackdrop").hidden = true; });
  $("mobileLayersToggle").addEventListener("click", () => { $("layerSheet").hidden = false; $("layerSheetBackdrop").hidden = false; });
  document.addEventListener("click", event => {
    if (!event.target.closest("#landingMenu,#menuToggle")) openMenu(false);
    if (!event.target.closest("#landingSettings,#settingsToggle")) openSettings(false);
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => { if (state.map) state.map.invalidateSize(); });
  syncMobileLayers();
  if (!initMap()) return;
  connectSea();
  route();
  status("Map online · connecting to live maritime feed…", "connecting");
})();
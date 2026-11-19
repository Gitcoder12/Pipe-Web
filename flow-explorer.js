/* Pipe-Web flow explorer.
 * Reported trade statistics and observed movement are deliberately separate layers.
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  if (!$("flowMap") || !window.L) return;

  const taxonomy = window.PipeWebTradeTaxonomy;
  if (!taxonomy) {
    $("flowFeedStatus").textContent = "Trade taxonomy did not load · refresh the page";
    return;
  }

  const map = L.map("flowMap", { worldCopyJump: true, zoomControl: true, minZoom: 2 })
    .setView([22, 12], 2);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 8,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);

  const reporters = {
    "356": { name: "India", lat: 20.59, lng: 78.96 },
    "156": { name: "China", lat: 35.86, lng: 104.19 },
    "842": { name: "United States", lat: 37.09, lng: -95.71 },
    "276": { name: "Germany", lat: 51.16, lng: 10.45 },
    "392": { name: "Japan", lat: 36.2, lng: 138.25 }
  };

  // UN Comtrade partner codes are numeric; normalising removes occasional leading zeroes.
  const rawPartnerCoords = {
    "156":[35.86,104.19],"842":[37.09,-95.71],"784":[23.42,53.85],"702":[1.35,103.82],
    "682":[23.89,45.08],"410":[35.91,127.77],"392":[36.2,138.25],"276":[51.16,10.45],
    "528":[52.13,5.29],"826":[55.37,-3.43],"250":[46.23,2.21],"380":[41.87,12.56],
    "724":[40.46,-3.75],"356":[20.59,78.96],"360":[-0.79,113.92],"458":[4.21,101.98],
    "764":[15.87,100.99],"704":[14.05,108.27],"36":[-25.27,133.77],"76":[-14.23,-51.92],
    "124":[56.13,-106.35],"484":[23.63,-102.55],"710":[-30.56,22.94],"566":[9.08,8.67],
    "818":[26.82,30.8],"12":[28.03,1.66],"504":[31.79,-7.09],"364":[32.43,53.69],
    "634":[25.35,51.18],"414":[29.31,47.48],"512":[21.47,55.98],"792":[38.96,35.24],
    "643":[61.52,105.32],"616":[51.92,19.15],"203":[49.82,15.47],"208":[56.26,9.5],
    "752":[60.12,18.64],"578":[60.47,8.47],"32":[-38.42,-63.62]
  };
  const partnerCoords = new Map(Object.entries(rawPartnerCoords).map(([code, point]) => [String(Number(code)), point]));

  const modeLabels = {
    ships: "SEA", road: "ROAD", aircraft: "AIR", rail: "RAIL",
    pipelines: "PIPELINE", digital: "DIGITAL"
  };
  const modeColours = {
    ships: "#1687b2", road: "#d55b35", aircraft: "#23945e",
    rail: "#168d8e", pipelines: "#c27b22", digital: "#8b5bb4"
  };
  // UN Comtrade mode-of-transport codes (goods tariffline preview).
  const goodsModeCodes = {
    ships: "2100", road: "3200", aircraft: "1000", rail: "3100", pipelines: "9110"
  };
  // EBOPS 2010 service categories are service classifications, not physical vehicle telemetry.
  const serviceModeDefaults = {
    ships: ["transport", "3.1"],
    road: ["transport", "3.7"],
    aircraft: ["transport", "3.2"],
    rail: ["transport", "3.6"],
    pipelines: ["transport", "3.9"],
    digital: ["telecom-it", "9"]
  };

  let kind = "goods";
  let network = "ships";
  let reportedLayers = [];
  let tradeController = null;
  let lastTradeRows = [];
  let lastMaritimeBox = "";
  let maritimeMoveTimer = null;
  let aircraftTimer = null;
  let aircraftController = null;
  let aircraftCache = [];
  let aircraftFetchedAt = 0;
  const vesselLayer = L.layerGroup().addTo(map);
  const aircraftLayer = L.layerGroup().addTo(map);

  const number = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const money = (value) => {
    const amount = Number(value || 0);
    if (amount >= 1e12) return "$" + (amount / 1e12).toFixed(2) + "T";
    if (amount >= 1e9) return "$" + (amount / 1e9).toFixed(2) + "B";
    if (amount >= 1e6) return "$" + (amount / 1e6).toFixed(1) + "M";
    return "$" + number(amount);
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[char]));

  function setStatus(message, live = false) {
    $("flowFeedStatus").textContent = message;
    $("flowFeedStatus").style.color = live ? "#168b61" : "#b27a50";
  }

  function selectedLabel(selectId) {
    return $(selectId).selectedOptions[0]?.textContent || "";
  }

  function appendOption(select, value, label) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    select.appendChild(option);
  }

  function selectedGroup() {
    const list = kind === "goods" ? taxonomy.goods.groups : taxonomy.services.groups;
    return list.find((group) => group.id === $("flowCategory").value) || list[0];
  }

  function fillSubcategories(group, preferredCode) {
    const select = $("flowCommodity");
    select.replaceChildren();

    if (kind === "goods") {
      appendOption(select, "all", "All chapters in this family · preview capped at 500 rows");
      group.chapters.forEach((item) => appendOption(select, item.code, item.code + " · " + item.label));
    } else {
      appendOption(select, group.code, "All " + group.label.toLowerCase());
      (group.children || []).forEach((item) => appendOption(select, item.code, item.code + " · " + item.label));
    }

    const desired = preferredCode || group.defaultChild || (kind === "goods" ? group.chapters[0]?.code : group.code);
    const available = Array.from(select.options).some((option) => option.value === String(desired));
    select.value = available ? String(desired) : select.options[0]?.value || "";
  }

  function fillCategories(preferredId, preferredSubcategory) {
    const groups = kind === "goods" ? taxonomy.goods.groups : taxonomy.services.groups;
    const category = $("flowCategory");
    category.replaceChildren();
    groups.forEach((group) => appendOption(category, group.id, group.label));
    const target = groups.find((group) => group.id === preferredId) || groups[0];
    category.value = target.id;
    fillSubcategories(target, preferredSubcategory);
    updateFilterCaptions();
  }

  function updateFilterCaptions() {
    $("flowCategoryCaption").textContent = kind === "goods" ? "GOODS FAMILY" : "SERVICE FAMILY";
    $("flowCommodityCaption").textContent = kind === "goods" ? "HS 2022 CHAPTER" : "EBOPS 2010 SUBCATEGORY";
    updateTitle();
  }

  function updateTitle() {
    $("flowMapTitle").textContent =
      modeLabels[network] + " / " + selectedLabel("flowCommodity").toUpperCase();
  }

  function updateSourceNote() {
    const modeName = modeLabels[network].toLowerCase();
    if (kind === "goods") {
      const hasModeBreakdown = Boolean(goodsModeCodes[network]);
      $("flowSourceNote").textContent = hasModeBreakdown
        ? "UN Comtrade reported goods exports/imports filtered by " + modeName +
          " where the reporter publishes mode-of-transport data. Annual customs statistics, not live cargo telemetry."
        : "UN Comtrade goods trade is reported by partner. No cable/digital goods transport filter is applied. Annual statistics, not live data.";
    } else {
      $("flowSourceNote").textContent = network === "digital"
        ? "EBOPS 2010 category 9 covers telecommunications, computer and information services. These are reported service exports/imports, not live packet volumes."
        : "EBOPS 2010 records trade in services. Transport-service categories describe the service sold, not observed vehicle movement or live delivery.";
    }
  }

  function modeOfTransportDescription() {
    const labels = {
      ships: "sea (2100)", road: "road (3200)", aircraft: "air (1000)",
      rail: "railway (3100)", pipelines: "pipelines (9110)"
    };
    return labels[network] || "not filtered by physical mode";
  }

  function stopAircraftPolling() {
    if (aircraftTimer) clearInterval(aircraftTimer);
    aircraftTimer = null;
    if (aircraftController) aircraftController.abort();
    aircraftController = null;
    aircraftLayer.clearLayers();
  }

  function drawAircraft(payload) {
    aircraftLayer.clearLayers();
    const aircraft = Array.isArray(payload.aircraft) ? payload.aircraft : [];
    aircraft.forEach((plane) => {
      if (!Number.isFinite(plane.latitude) || !Number.isFinite(plane.longitude)) return;
      const color = plane.onGround ? "#d29a3b" : "#25895e";
      const marker = L.circleMarker([plane.latitude, plane.longitude], {
        radius: plane.onGround ? 3.5 : 4.2,
        color: "#ffffff", weight: 1, fillColor: color, fillOpacity: 0.92
      }).addTo(aircraftLayer);
      const speed = Number.isFinite(plane.velocityMs) ? Math.round(plane.velocityMs * 3.6) + " km/h" : "speed unavailable";
      const altitude = Number.isFinite(plane.altitudeM) ? Math.round(plane.altitudeM).toLocaleString() + " m" : "altitude unavailable";
      marker.bindTooltip(
        escapeHtml(plane.callsign || plane.icao24 || "Unknown aircraft") +
        "<br>" + escapeHtml(plane.originCountry || "Unknown country") +
        "<br>" + altitude + " · " + speed +
        "<br>ADS-B observation · not a scheduled route"
      );
    });
    $("flowVesselCount").textContent = number(aircraft.length);
    $("flowVesselNote").textContent = "OpenSky ADS-B state vectors · incomplete receiver coverage";
  }

  async function fetchAircraft() {
    const api = window.PIPEWEB_CONFIG?.aircraftApi || "";
    if (!api) {
      setStatus("AIRCRAFT POSITIONS NOT CONFIGURED · deploy the included OpenSky Worker");
      $("flowVesselCount").textContent = "NOT CONFIGURED";
      $("flowVesselNote").textContent = "No synthetic aircraft shown. Configure aircraftApi in config.js.";
      return;
    }
    if (aircraftController) aircraftController.abort();
    const controller = new AbortController();
    aircraftController = controller;
    setStatus("REQUESTING OPEN SKY ADS-B POSITIONS");
    try {
      const response = await fetch(api, { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Aircraft Worker HTTP " + response.status);
      const payload = await response.json();
      if (payload.status !== "LIVE" || !Array.isArray(payload.aircraft)) {
        throw new Error(payload.error || "Aircraft provider is not live");
      }
      if (controller.signal.aborted || network !== "aircraft") return;
      aircraftCache = payload.aircraft;
      aircraftFetchedAt = payload.fetchedAt ? Date.parse(payload.fetchedAt) : Date.now();
      drawAircraft(payload);
      setStatus("LIVE ADS-B · " + number(aircraftCache.length) + " observed aircraft · cached " +
        new Date(aircraftFetchedAt).toLocaleTimeString(), true);
      $("flowMapSource").textContent = "SOURCE: OPEN SKY NETWORK · ADS-B STATE VECTORS";
      $("flowMapPeriod").textContent = "FETCHED: " + new Date(aircraftFetchedAt).toLocaleString();
    } catch (error) {
      if (error.name === "AbortError") return;
      setStatus("AIRCRAFT FEED UNAVAILABLE · " + (error.message || "network error"));
      $("flowVesselCount").textContent = aircraftCache.length ? number(aircraftCache.length) + " STALE" : "OFFLINE";
      $("flowVesselNote").textContent = "Last successful snapshot is retained only in this page session.";
      if (aircraftCache.length) drawAircraft({ aircraft: aircraftCache });
    } finally {
      if (aircraftController === controller) aircraftController = null;
    }
  }

  function startAircraftPolling() {
    stopAircraftPolling();
    fetchAircraft();
    // The included Worker caches global OpenSky calls for 15 minutes to stay inside
    // the documented anonymous quota. Do not increase this polling frequency.
    aircraftTimer = setInterval(() => {
      if (network === "aircraft") fetchAircraft();
    }, 15 * 60 * 1000);
  }

  function drawVessels(feed) {
    vesselLayer.clearLayers();
    if (network !== "ships") return;

    (feed.ships || []).forEach((ship) => {
      const color = ship.sog == null ? "#2383ab" : ship.sog > 15 ? "#d49b35" : ship.sog > 5 ? "#168b72" : "#4e9cc5";
      const trail = Array.isArray(ship.trail) ? ship.trail : [];
      if (trail.length > 1) {
        const line = L.polyline(trail.map((point) => [point.lat, point.lon]), {
          color, weight: 2.4, opacity: 0.78, lineCap: "round", lineJoin: "round"
        }).addTo(vesselLayer);
        line.bindTooltip(escapeHtml(ship.name || "Vessel " + ship.mmsi) + " · observed AIS trail · " + trail.length + " positions");
      }
      const marker = L.circleMarker([ship.lat, ship.lon], {
        radius: 4.4, color: "#ffffff", weight: 1, fillColor: color, fillOpacity: 0.95
      }).addTo(vesselLayer);
      marker.bindTooltip(
        escapeHtml(ship.name || "Vessel " + ship.mmsi) +
        "<br>" + (ship.sog == null ? "Speed unavailable" : ship.sog.toFixed(1) + " kn") +
        " · " + (ship.cog == null ? "Heading unavailable" : ship.cog.toFixed(0) + "°") +
        "<br>Observed AIS position · " + escapeHtml(ship.time || "timestamp unavailable")
      );
    });
  }

  function connectMaritime() {
    if (!window.PipeWebMaritime) return;
    const bounds = map.getBounds();
    const south = Math.max(-85, bounds.getSouth()), north = Math.min(85, bounds.getNorth());
    const west = bounds.getWest(), east = bounds.getEast();
    const ratio = Math.max(0.01, (east - west) / Math.max(0.01, north - south));
    const area = (north - south) * (east - west);
    let box = [south, west, north, east];
    // OpenSeaFeed anonymous subscriptions are capped at 30,000 square degrees.
    if (area > 30000) {
      const width = Math.sqrt(30000 * ratio), height = Math.sqrt(30000 / ratio);
      const latitude = (south + north) / 2, longitude = (west + east) / 2;
      box = [latitude - height / 2, longitude - width / 2, latitude + height / 2, longitude + width / 2];
    }
    const key = box.map((value) => value.toFixed(2)).join(",");
    if (key === lastMaritimeBox && window.PipeWebMaritime.status === "LIVE") return;
    lastMaritimeBox = key;
    window.PipeWebMaritime.connect([[box[0], box[1]], [box[2], box[3]]]);
  }

  function chooseNetwork(next) {
    network = next;
    document.querySelectorAll(".network-card").forEach((button) => {
      button.classList.toggle("active", button.dataset.network === next);
    });
    stopAircraftPolling();
    vesselLayer.clearLayers();
    if (window.PipeWebMaritime && next !== "ships") {
      window.PipeWebMaritime.disconnect();
      lastMaritimeBox = "";
    }

    if (next === "ships") {
      $("flowVesselCount").textContent = "CONNECTING";
      $("flowVesselNote").textContent = "Live AIS observations · OpenSeaFeed · coverage varies";
      setStatus("CONNECTING TO LIVE AIS · OPENSEAFEED");
      connectMaritime();
    } else if (next === "aircraft") {
      startAircraftPolling();
    } else {
      $("flowVesselCount").textContent = "NO LIVE FEED";
      $("flowVesselNote").textContent = "No verified global live movement provider is configured for this layer.";
      const notices = {
        road: "ROAD: OSM provides mapped roads, not live traffic. No global live vehicle feed is connected.",
        rail: "RAIL: mapped railway geometry is not live train movement. Regional GTFS-Realtime feeds can be added where public.",
        pipelines: "PIPELINE: mapped pipeline geometry is not throughput telemetry. No global public live flow feed is connected.",
        digital: "DIGITAL: reported telecom/computing services are available below; live packet volumes are not public globally."
      };
      setStatus(notices[next] || next.toUpperCase() + " LIVE FEED NOT CONNECTED");
    }

    if (kind === "services") {
      const [groupId, code] = serviceModeDefaults[next] || [];
      if (groupId) fillCategories(groupId, code);
    }
    updateTitle();
    updateSourceNote();
    $("flowMapSource").textContent = kind === "goods"
      ? "SOURCE: UN COMTRADE · MODE-FILTERED REPORTED GOODS TRADE"
      : "SOURCE: UN COMTRADE · EBOPS 2010 SERVICES";
  }

  function clearReportedLayers() {
    reportedLayers.forEach((layer) => map.removeLayer(layer));
    reportedLayers = [];
  }

  function plotReportedTrade(rows, reporterCode) {
    clearReportedLayers();
    const origin = reporters[reporterCode] || reporters["356"];
    const mapped = rows.filter((row) => partnerCoords.has(String(Number(row.partnerCode))) && Number(row.primaryValue) > 0)
      .sort((a, b) => Number(b.primaryValue) - Number(a.primaryValue))
      .slice(0, 35);
    const arcs = [];
    const color = modeColours[network] || "#1687b2";

    mapped.forEach((row) => {
      const [lat, lng] = partnerCoords.get(String(Number(row.partnerCode)));
      const line = L.polyline([[origin.lat, origin.lng], [lat, lng]], {
        color,
        weight: Math.max(1.5, Math.min(6, 1.4 + Math.log10(Number(row.primaryValue) + 1) * 0.38)),
        opacity: 0.8,
        className: "flow-map-line"
      }).addTo(map);
      line.bindTooltip(
        escapeHtml(origin.name) + " → " + escapeHtml(row.partnerDesc || "Partner") +
        "<br>" + money(row.primaryValue) + " reported trade value" +
        (kind === "goods" ? "<br>Mode filter: " + modeOfTransportDescription() : "<br>EBOPS service trade")
      );
      reportedLayers.push(line);
      arcs.push(line);

      const marker = L.circleMarker([lat, lng], {
        radius: 3.5, color: "#ffffff", weight: 1, fillColor: color, fillOpacity: 0.92
      }).addTo(map);
      marker.bindTooltip(escapeHtml(row.partnerDesc || "Trade partner"));
      reportedLayers.push(marker);
    });

    const reporterMarker = L.circleMarker([origin.lat, origin.lng], {
      radius: 7, color: "#fff0d5", weight: 2, fillColor: "#d7a77b", fillOpacity: 1
    }).addTo(map);
    reporterMarker.bindTooltip("Reporting economy: " + escapeHtml(origin.name));
    reportedLayers.push(reporterMarker);

    if (arcs.length) map.fitBounds(L.featureGroup(arcs).getBounds().pad(0.25), { maxZoom: 3 });
    else map.setView([origin.lat, origin.lng], 2);

    return mapped;
  }

  function renderTradeTable(rows, period, payload) {
    const html = rows.slice(0, 15).map((row, index) =>
      "<tr><td>" + String(index + 1).padStart(2, "0") + "</td>" +
      "<td>" + escapeHtml(row.partnerDesc || "Partner") + "</td>" +
      "<td>" + (row.netWgt ? number(row.netWgt) + " kg" : "—") + "</td>" +
      "<td>" + money(row.primaryValue) + "</td></tr>"
    ).join("");

    $("flowTable").innerHTML = html
      ? '<table class="flow-table"><thead><tr><th>RANK</th><th>TRADE PARTNER</th><th>NET WEIGHT</th><th>REPORTED VALUE (USD)</th></tr></thead><tbody>' + html + "</tbody></table>"
      : '<div class="flow-empty">No partner records are available for this filter. Check whether this reporter publishes the selected category and mode-of-transport breakdown.</div>';

    $("flowTableNote").textContent = rows.length + " returned records · public preview limit applies";
    $("flowTotalValue").textContent = money(rows.reduce((sum, row) => sum + Number(row.primaryValue || 0), 0));
    $("flowPartnerCount").textContent = number(rows.length);
    $("flowDataPeriod").textContent = period;
    $("flowFreshness").textContent = "Official reported data · not live telemetry";
    $("flowMapPeriod").textContent = "REPORTED PERIOD: " + period;
    const classification = kind === "goods" ? "HS 2022 (H6)" : "EBOPS 2010 (EB10)";
    $("flowMapSource").textContent = "SOURCE: UN COMTRADE · " + classification +
      (kind === "goods" && goodsModeCodes[network] ? " · MOT " + goodsModeCodes[network] : "");
    if (payload && payload.elapsedTime) $("flowFreshness").textContent = "UN Comtrade response " + payload.elapsedTime + " · reported period " + period;
  }

  async function loadTrade() {
    const reporter = $("flowReporter").value;
    const period = $("flowPeriod").value;
    const code = $("flowCommodity").value;
    const direction = $("flowDirection").value;
    const button = $("loadTradeFlows");

    if (tradeController) tradeController.abort();
    const controller = new AbortController();
    tradeController = controller;
    button.disabled = true;
    button.textContent = "FETCHING DATA…";
    setStatus("REQUESTING UN COMTRADE REPORTED TRADE");
    $("flowTable").innerHTML = '<div class="flow-empty">Requesting official reported trade records…</div>';

    const typePath = kind === "goods" ? "C/A/H6" : "S/A/EB10";
    const endpoint = kind === "goods" ? "previewTariffline" : "preview";
    const params = new URLSearchParams({
      reporterCode: reporter,
      period,
      flowCode: direction
    });
    if (code !== "all") params.set("cmdCode", code);
    if (kind === "goods" && goodsModeCodes[network]) params.set("motCode", goodsModeCodes[network]);

    const url = "https://comtradeapi.un.org/public/v1/" + endpoint + "/" + typePath + "?" + params.toString();

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("UN Comtrade returned HTTP " + response.status);
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error);
      if (controller.signal.aborted) return;

      const rows = Array.isArray(payload.data) ? payload.data : [];
      if (!rows.length) {
        clearReportedLayers();
        throw new Error("No records returned. The reporter may not publish this category or mode-of-transport breakdown.");
      }
      lastTradeRows = rows;
      const mapped = plotReportedTrade(rows, reporter);
      renderTradeTable(rows, period, payload);
      updateTitle();
      setStatus("UN COMTRADE · " + rows.length + " REPORTED RECORDS · " + direction, true);
      if (!mapped.length) $("flowTableNote").textContent = rows.length + " records · partner coordinates unavailable for map; see table";
      if (kind === "goods" && goodsModeCodes[network]) {
        $("flowSourceNote").textContent = "Mode-of-transport filter: " + modeOfTransportDescription() +
          ". UN Comtrade only supplies this breakdown where the reporting country publishes it. Values are annual reported trade, not live shipments.";
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      setStatus("TRADE DATA UNAVAILABLE");
      $("flowTable").innerHTML = '<div class="flow-empty">' + escapeHtml(error.message || "Data request failed") + "</div>";
      $("flowTotalValue").textContent = "—";
      $("flowPartnerCount").textContent = "—";
      $("flowDataPeriod").textContent = "—";
      $("flowFreshness").textContent = "No successful source response";
      clearReportedLayers();
    } finally {
      if (tradeController === controller) tradeController = null;
      button.disabled = false;
      button.textContent = "SHOW FLOWS ↗";
    }
  }

  // --- UI wiring ---
  document.querySelectorAll(".network-card").forEach((button) => {
    button.addEventListener("click", () => chooseNetwork(button.dataset.network));
  });

  document.querySelectorAll(".flow-toggle button").forEach((button) => {
    button.addEventListener("click", () => {
      kind = button.dataset.kind;
      document.querySelectorAll(".flow-toggle button").forEach((item) => item.classList.toggle("active", item === button));
      fillCategories(kind === "goods" ? "energy" : (serviceModeDefaults[network]?.[0] || "transport"),
        kind === "goods" ? "27" : (serviceModeDefaults[network]?.[1] || undefined));
      updateSourceNote();
      updateTitle();
    });
  });

  $("flowCategory").addEventListener("change", () => {
    fillSubcategories(selectedGroup());
    updateTitle();
  });
  $("flowCommodity").addEventListener("change", updateTitle);
  $("flowDirection").addEventListener("change", updateTitle);
  $("loadTradeFlows").addEventListener("click", loadTrade);

  if (window.PipeWebMaritime) {
    window.PipeWebMaritime.subscribe((feed) => {
      if (network !== "ships") return;
      drawVessels(feed);
      $("flowVesselCount").textContent = number(feed.count);
      $("flowVesselNote").textContent = feed.status === "LIVE"
        ? "Observed AIS positions · OpenSeaFeed · last report " + (feed.lastMessageAt ? new Date(feed.lastMessageAt).toLocaleTimeString() : "waiting")
        : "OpenSeaFeed status: " + feed.status + " · coverage varies";
      setStatus(feed.status === "LIVE" ? "LIVE AIS · " + feed.count + " OBSERVED VESSELS" : "AIS · " + feed.status, feed.status === "LIVE");
    });
  }

  map.on("moveend", () => {
    if (network !== "ships" || !window.PipeWebMaritime) return;
    if (maritimeMoveTimer) clearTimeout(maritimeMoveTimer);
    maritimeMoveTimer = setTimeout(connectMaritime, 900);
  });
  window.addEventListener("resize", () => map.invalidateSize());

  fillCategories("energy", "27");
  updateSourceNote();
  chooseNetwork("ships");
  setStatus("SELECT A MODE TO EXPLORE LIVE OBSERVATIONS AND REPORTED TRADE");
  $("flowTable").innerHTML = '<div class="flow-empty">Choose a goods or services family and subcategory, then load official annual trade statistics. AIS vessel positions are shown separately when the live stream is connected.</div>';
  $("flowFreshness").textContent = "Waiting for source response";
})();

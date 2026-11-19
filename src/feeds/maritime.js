/* Pipe-Web observed AIS flow feed. Anonymous OpenSeaFeed tier; position reports only. */
(() => {
  "use strict";
  const URL = "wss://stream.openseafeed.com/v1/stream";
  // Seven non-overlapping ocean regions total 28,600 square degrees (free-tier cap: 30,000).
  const DEFAULT_BBOXES = [
    [[0,-75],[60,10]], [[-50,-60],[5,10]], [[-35,25],[25,105]],
    [[5,115],[65,175]], [[5,-175],[65,-120]], [[-50,120],[5,180]],
    [[25,-10],[55,45]]
  ];
  const FLUSH_MS = 5000, STALE_MS = 30 * 60 * 1000, MAX_GAP_MS = 20 * 60 * 1000;
  const MAX_POINTS = 10, MAX_RECONNECT_MS = 30000;
  function normalizeBoxes(value) {
    if (!Array.isArray(value) || !value.length) return DEFAULT_BBOXES;
    const single = Array.isArray(value[0]) && typeof value[0][0] === "number";
    const boxes = single ? [value] : value;
    return boxes.filter(box => Array.isArray(box) && box.length === 2 &&
      box.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)));
  }
  class MaritimeFeed {
    constructor() {
      this.ws = null; this.ships = new Map(); this.tracks = new Map(); this.listeners = new Set();
      this.flushTimer = null; this.reconnectTimer = null; this.retry = 0;
      this.active = false; this.intentionalClose = false; this.lastMessageAt = 0;
      this.status = "DISCONNECTED"; this.bboxes = DEFAULT_BBOXES;
    }
    subscribe(listener) { this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener); }
    snapshot() {
      return { status: this.status, ships: [...this.ships.values()],
        tracks: [...this.tracks.entries()].map(([id, points]) => ({
          id, shipType: this.ships.get(id)?.shipType ?? null, points: points.slice()
        })), count: this.ships.size, lastMessageAt: this.lastMessageAt };
    }
    emit() {
      const value = this.snapshot();
      this.listeners.forEach(fn => { try { fn(value); } catch (_) {} });
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function")
        window.dispatchEvent(new CustomEvent("pipeweb:maritime:update", { detail: value }));
    }
    connect(bboxes = DEFAULT_BBOXES) {
      this.disconnect(false); this.intentionalClose = false; this.active = true;
      this.bboxes = normalizeBoxes(bboxes); this.status = "CONNECTING"; this.emit();
      if (!(typeof window !== "undefined" && "WebSocket" in window)) { this.status = "UNSUPPORTED"; this.emit(); return; }
      try {
        this.ws = new window.WebSocket(URL);
        this.ws.onopen = () => {
          if (!this.active) return;
          this.retry = 0; this.status = "LIVE";
          this.ws.send(JSON.stringify({ BoundingBoxes: this.bboxes, FilterMessageTypes: ["PositionReport"], InitialState: true }));
          this.emit();
        };
        this.ws.onmessage = event => {
          if (typeof event.data !== "string") return;
          try {
            const message = JSON.parse(event.data);
            if (message.MessageType !== "PositionReport") return;
            const report = message.Message?.PositionReport || {}, meta = message.MetaData || {};
            const lat = Number(meta.latitude ?? report.Latitude), lon = Number(meta.longitude ?? report.Longitude);
            const mmsi = String(meta.MMSI ?? report.UserID ?? report.MMSI ?? "");
            if (!mmsi || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
            const speed = Number(report.Sog ?? report.SpeedOverGround), course = Number(report.Cog ?? report.CourseOverGroundTrue);
            const parsedTime = Date.parse(meta.time_utc || report.time_utc || "");
            const timestamp = Number.isFinite(parsedTime) ? parsedTime : Date.now();
            const ship = { mmsi, lat, lon, sog: Number.isFinite(speed) ? speed : null,
              cog: Number.isFinite(course) ? course : null, name: meta.ShipName || report.Name || "",
              shipType: meta.ShipType ?? null, time: new Date(timestamp).toISOString(), receivedAt: Date.now() };
            const points = this.tracks.get(mmsi) || [], last = points[points.length - 1];
            if (!last || timestamp > last.timestamp) {
              if (last && timestamp - last.timestamp > MAX_GAP_MS) points.length = 0;
              const previous = points[points.length - 1];
              if (!previous || previous.lat !== lat || previous.lon !== lon) {
                points.push({ lat, lon, timestamp, time: ship.time });
                if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
              }
              this.tracks.set(mmsi, points);
            }
            this.ships.set(mmsi, ship); this.lastMessageAt = Date.now();
            if (window.PipeWebRecorder) window.PipeWebRecorder.record("ship", ship).catch(() => {});
          } catch (_) { /* Malformed upstream frames are ignored. */ }
        };
        this.ws.onerror = () => { if (this.active) { this.status = "ERROR"; this.emit(); } };
        this.ws.onclose = () => { this.ws = null; if (this.active && !this.intentionalClose) this.scheduleReconnect(); };
      } catch (_) { this.scheduleReconnect(); }
      if (!this.flushTimer) this.flushTimer = setInterval(() => {
        const cutoff = Date.now() - STALE_MS;
        for (const [id, ship] of this.ships) if (ship.receivedAt < cutoff) {
          this.ships.delete(id); this.tracks.delete(id);
        }
        this.emit();
      }, FLUSH_MS);
    }
    scheduleReconnect() {
      if (!this.active || this.reconnectTimer) return;
      this.status = "RECONNECTING"; this.emit();
      const delay = Math.min(MAX_RECONNECT_MS, 2000 * (2 ** this.retry++));
      this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; if (this.active) this.connect(this.bboxes); }, delay);
    }
    disconnect(clear = true) {
      this.active = false; this.intentionalClose = true;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      if (this.ws) { const socket = this.ws; this.ws = null; socket.onclose = null; socket.close(); }
      if (this.flushTimer) clearInterval(this.flushTimer);
      this.flushTimer = null;
      if (clear) { this.ships.clear(); this.tracks.clear(); }
      this.status = "DISCONNECTED"; this.emit();
    }
  }
  window.PipeWebMaritime = new MaritimeFeed();
})();

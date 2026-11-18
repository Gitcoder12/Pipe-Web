/* Pipe-Web live AIS vessel feed. OpenSeaFeed anonymous free tier. */
(() => {
  "use strict";
  const URL = "wss://stream.openseafeed.com/v1/stream";
  const DEFAULT_BBOX = [[54, -5], [72, 32]];
  const FLUSH_MS = 5000, STALE_MS = 15 * 60 * 1000, MAX_RECONNECT_MS = 30000;
  class MaritimeFeed {
    constructor() {
      this.ws = null; this.ships = new Map(); this.listeners = new Set();
      this.flushTimer = null; this.reconnectTimer = null; this.retry = 0;
      this.active = false; this.intentionalClose = false; this.lastMessageAt = 0;
      this.status = "DISCONNECTED";
    }
    subscribe(listener) { this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener); }
    snapshot() { return { status: this.status, ships: [...this.ships.values()], count: this.ships.size, lastMessageAt: this.lastMessageAt }; }
    emit() {
      const value = this.snapshot();
      this.listeners.forEach(fn => { try { fn(value); } catch (_) {} });
      // Browser event bridge is optional so the feed remains testable in Node.
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent("pipeweb:maritime:update", { detail: value }));
      }
    }
    connect(bbox = DEFAULT_BBOX) {
      this.disconnect(false); this.intentionalClose = false; this.active = true;
      this.bbox = bbox; this.status = "CONNECTING"; this.emit();
      if (!(typeof window !== "undefined" && "WebSocket" in window)) { this.status = "UNSUPPORTED"; this.emit(); return; }
      try {
        this.ws = new window.WebSocket(URL);
        this.ws.onopen = () => {
          if (!this.active) return;
          this.retry = 0; this.status = "LIVE";
          this.ws.send(JSON.stringify({ BoundingBoxes: [this.bbox], FilterMessageTypes: ["PositionReport"], InitialState: true }));
          this.emit();
        };
        this.ws.onmessage = event => {
          if (typeof event.data !== "string") return;
          try { const msg = JSON.parse(event.data); if (msg.MessageType !== "PositionReport") return;
            const p = msg.Message?.PositionReport || {}, meta = msg.MetaData || {};
            const lat = Number(meta.latitude ?? p.Latitude), lon = Number(meta.longitude ?? p.Longitude);
            const mmsi = String(meta.MMSI ?? p.UserID ?? p.MMSI ?? "");
            if (!mmsi || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
            const sog = Number(p.Sog ?? p.SpeedOverGround), cog = Number(p.Cog ?? p.CourseOverGroundTrue);
            this.ships.set(mmsi, { mmsi, lat, lon, sog: Number.isFinite(sog) ? sog : null,
              cog: Number.isFinite(cog) ? cog : null, name: meta.ShipName || p.Name || "",
              shipType: meta.ShipType ?? null, time: meta.time_utc || new Date().toISOString(), receivedAt: Date.now() });
            this.lastMessageAt = Date.now();
          } catch (_) { /* Ignore malformed provider frames. */ }
        };
        this.ws.onerror = () => { if (this.active) { this.status = "ERROR"; this.emit(); } };
        this.ws.onclose = () => { this.ws = null; if (this.active && !this.intentionalClose) this.scheduleReconnect(); };
      } catch (_) { this.scheduleReconnect(); }
      if (!this.flushTimer) this.flushTimer = setInterval(() => {
        const cutoff = Date.now() - STALE_MS;
        for (const [id, ship] of this.ships) if (ship.receivedAt < cutoff) this.ships.delete(id);
        this.emit();
      }, FLUSH_MS);
    }
    scheduleReconnect() {
      if (!this.active || this.reconnectTimer) return;
      this.status = "RECONNECTING"; this.emit();
      const delay = Math.min(MAX_RECONNECT_MS, 2000 * (2 ** this.retry++));
      this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; if (this.active) this.connect(this.bbox); }, delay);
    }
    disconnect(clear = true) {
      this.active = false; this.intentionalClose = true;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      if (this.ws) { const ws = this.ws; this.ws = null; ws.onclose = null; ws.close(); }
      if (this.flushTimer) clearInterval(this.flushTimer);
      this.flushTimer = null;
      if (clear) this.ships.clear();
      this.status = "DISCONNECTED"; this.emit();
    }
  }
  window.PipeWebMaritime = new MaritimeFeed();
})();
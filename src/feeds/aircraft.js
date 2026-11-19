/* Pipe-Web air snapshots: lines are formed only from repeat, changed observations. */
(() => {
  "use strict";
  const POLL_MS = 30 * 60 * 1000;
  const TYPE = "air";
  class SnapshotFeed {
    constructor() { this.endpoint = ""; this.timer = null; this.busy = false; this.status = "NOT_CONFIGURED"; this.source = ""; this.tracks = new Map(); this.listeners = new Set(); this.lastFetchedAt = null; }
    subscribe(listener) { this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener); }
    snapshot() { return { status:this.status, source:this.source, fetchedAt:this.lastFetchedAt,
      tracks:[...this.tracks.values()].map(t=>({id:t.id,color:t.color,points:t.points.slice()})),count:this.tracks.size }; }
    emit() { const value=this.snapshot(); this.listeners.forEach(fn=>{try{fn(value)}catch(_){}}); }
    connect(endpoint) {
      if (endpoint) this.endpoint = endpoint;
      if (!this.endpoint) { this.status="NOT_CONFIGURED"; this.emit(); return; }
      if (this.timer) clearInterval(this.timer);
      this.refresh(); this.timer=setInterval(()=>this.refresh(),POLL_MS);
    }
    async refresh() {
      if (this.busy || !this.endpoint) return;
      this.busy=true; this.status="CONNECTING"; this.emit();
      try {
        const response=await fetch(this.endpoint,{headers:{accept:"application/json"},cache:"no-store"});
        if(!response.ok) throw new Error("Feed returned HTTP "+response.status);
        const payload=await response.json();
        if(payload.status==="OFFLINE") throw new Error(payload.error||"Provider offline");
        const now=Date.now();
        const records=TYPE==="air"?(payload.aircraft||[]):(payload.trains||[]);
        for(const record of records) {
          const id=TYPE==="air"?String(record.icao24||""):String(record.id||"");
          const lat=Number(TYPE==="air"?record.latitude:record.latitude);
          const lon=Number(TYPE==="air"?record.longitude:record.longitude);
          if(!id||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180) continue;
          const track=this.tracks.get(id)||{id,color:TYPE==="air"?"#b69cff":"#ffbd70",points:[]};
          const last=track.points[track.points.length-1];
          if(!last||last.lat!==lat||last.lon!==lon) {
            track.points.push({lat,lon,timestamp:now});
            if(track.points.length>6) track.points.shift();
          }
          this.tracks.set(id,track);
        }
        this.source=payload.source|| (TYPE==="air"?"Aircraft provider":"Rail provider");
        this.lastFetchedAt=payload.fetchedAt||new Date(now).toISOString();
        this.status="LIVE";
        if(window.PipeWebRecorder) records.forEach(record=>window.PipeWebRecorder.record(TYPE==="air"?"air":"ship",record).catch(()=>{}));
      } catch(error) { this.status=this.tracks.size?"STALE":"OFFLINE"; this.error=error.message||"Feed unavailable"; }
      finally { this.busy=false; this.emit(); }
    }
    disconnect() { if(this.timer)clearInterval(this.timer);this.timer=null;this.status="DISCONNECTED";this.emit(); }
  }
  window.PipeWebAircraft = new SnapshotFeed();
})();

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("src/feeds/recorder.js", "utf8");
const window = {};
vm.runInNewContext(source, { window, indexedDB: undefined, Date, Promise, Set, TypeError, Error, JSON });

assert.equal(typeof window.PipeWebRecorder.record, "function");
assert.throws(() => window.PipeWebRecorder.record("train", {}), /Observation type/);
assert.throws(() => window.PipeWebRecorder.record("ship", null), /Observation data/);

window.PipeWebRecorder.record("ship", { mmsi: "123456789" }).then(
  () => { throw new Error("Expected unavailable IndexedDB to reject."); },
  error => {
    assert.match(error.message, /storage is unavailable/);
    console.log("Recorder tests passed: API, validation and graceful no-IndexedDB failure.");
  }
);

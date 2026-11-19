const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("src/feeds/recorder.js", "utf8");
const window = {};
vm.runInNewContext(source, { window, indexedDB: undefined, Date, Promise, Set, TypeError, Error, JSON });

async function run() {
  assert.equal(typeof window.PipeWebRecorder.record, "function");
  await assert.rejects(window.PipeWebRecorder.record("truck", {}), /Observation type/);
  await assert.rejects(window.PipeWebRecorder.record("ship", null), /Observation data/);
  await assert.rejects(window.PipeWebRecorder.record("rail", { trainNumber: 1 }), /storage is unavailable/);
  await assert.rejects(
    window.PipeWebRecorder.record("ship", { mmsi: "123456789" }),
    /storage is unavailable/
  );
  console.log("Recorder tests passed: ship, air and rail validation and graceful no-IndexedDB failure.");
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

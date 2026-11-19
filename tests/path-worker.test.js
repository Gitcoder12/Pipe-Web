import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const workerPath = fileURLToPath(new URL("../workers/path-worker.js", import.meta.url));
const workerSource = readFileSync(workerPath, "utf8");

function runWorker(data) {
  const messages = [];
  const self = { postMessage: (message) => messages.push(message) };
  vm.runInNewContext(workerSource, { self, Map, Set, Math, Number, Infinity });
  self.onmessage({ data: { id: 7, ...data } });
  return messages[0];
}

const baseGraph = {
  start: "A",
  end: "D",
  objective: "time",
  avoidCongestion: false,
  alternatives: false,
  nodes: ["A", "B", "C", "D"],
  nodeCoords: [],
  congested: [],
  edges: [
    ["A", "B", 2, 2, 1, 1],
    ["B", "D", 2, 2, 1, 1],
    ["A", "C", 1, 1, 1, 1],
    ["C", "D", 8, 8, 1, 1]
  ]
};

test("chooses the minimum-cost path for the selected objective", () => {
  const result = runWorker(baseGraph);
  assert.equal(result.id, 7);
  assert.deepEqual(Array.from(result.paths[0].ids), ["A", "B", "D"]);
  assert.equal(result.paths[0].metrics.time, 4);
});

test("returns an empty result when the destination is disconnected", () => {
  const result = runWorker({
    ...baseGraph,
    edges: [["A", "B", 1, 1, 1, 1]]
  });
  assert.deepEqual(Array.from(result.paths), []);
});

test("respects one-way edges", () => {
  const result = runWorker({
    ...baseGraph,
    start: "B",
    end: "A",
    edges: [["A", "B", 1, 1, 1, 1, true]]
  });
  assert.deepEqual(Array.from(result.paths), []);
});

test("returns distinct alternatives when requested", () => {
  const result = runWorker({ ...baseGraph, alternatives: true });
  const routes = Array.from(result.paths, (path) => path.ids.join("->"));
  assert.ok(routes.length >= 2);
  assert.equal(new Set(routes).size, routes.length);
});

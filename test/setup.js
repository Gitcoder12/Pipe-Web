// Shared browser API stubs for Node-based tests.
// Tests may override these globals with narrower fakes when needed.
global.window = global;
global.WebSocket = class {
  constructor() {}
  close() {}
  send() {}
};
global.CustomEvent = class {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};
global.navigator = { language: "en" };
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.indexedDB = undefined;

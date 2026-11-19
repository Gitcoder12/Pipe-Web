/* Pipe-Web observation recorder. Stores timestamped feed snapshots locally. */
(() => {
  "use strict";
  const DATABASE_NAME = "pipe-web-history";
  const DATABASE_VERSION = 1;
  const STORE_NAME = "observations";
  const VALID_TYPES = new Set(["ship", "air", "rail"]);
  let databasePromise = null;

  function openDatabase() {
    if (typeof indexedDB === "undefined" || !indexedDB) {
      return Promise.reject(new Error("Local history storage is unavailable in this browser."));
    }
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            store.createIndex("by_timestamp", "ts", { unique: false });
            store.createIndex("by_type_timestamp", ["type", "ts"], { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open local history storage."));
        request.onblocked = () => reject(new Error("Local history storage is blocked by another tab."));
      } catch (error) {
        reject(error);
      }
    }).catch(error => {
      databasePromise = null;
      throw error;
    });
    return databasePromise;
  }

  async function record(type, data) {
    if (!VALID_TYPES.has(type)) throw new TypeError('Observation type must be "ship" or "air".');
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new TypeError("Observation data must be an object.");
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).add({ ts: Date.now(), type, data: structuredCloneSafe(data) });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error || new Error("Could not save observation."));
        transaction.onabort = () => reject(transaction.error || new Error("Observation save was aborted."));
      } catch (error) {
        reject(error);
      }
    });
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  window.PipeWebRecorder = { record };
})();
'use strict';
// Thin promise wrapper over IndexedDB. All data lives in this browser, on this device.
const DB = (() => {
  const NAME = 'df-tracker';
  const VERSION = 1;
  const STORES = ['varieties', 'plants', 'crosses', 'fruits', 'logs', 'photos', 'settings'];
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          for (const s of STORES) {
            if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('Close other tabs running this app, then reload.'));
      });
    }
    return dbPromise;
  }

  // Runs one operation in its own transaction and resolves once it has committed.
  async function run(store, mode, op) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = op(tx.objectStore(store));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Saving failed'));
    });
  }

  return {
    STORES,
    all: (store) => run(store, 'readonly', (os) => os.getAll()),
    get: (store, id) => run(store, 'readonly', (os) => os.get(id)),
    put: (store, value) => run(store, 'readwrite', (os) => os.put(value)),
    del: (store, id) => run(store, 'readwrite', (os) => os.delete(id)),
    clear: (store) => run(store, 'readwrite', (os) => os.clear()),
    putMany: (store, list) => run(store, 'readwrite', (os) => { list.forEach((v) => os.put(v)); }),
    delMany: (store, ids) => run(store, 'readwrite', (os) => { ids.forEach((id) => os.delete(id)); }),
  };
})();

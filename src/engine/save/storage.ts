/** Key-value storage backends for saves: IndexedDB preferred, localStorage fallback, memory for tests. */
export interface SaveBackend {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemoryBackend implements SaveBackend {
  private m = new Map<string, string>();
  async get(k: string) { return this.m.get(k); }
  async set(k: string, v: string) { this.m.set(k, v); }
  async remove(k: string) { this.m.delete(k); }
  async keys() { return [...this.m.keys()]; }
}

export class LocalStorageBackend implements SaveBackend {
  constructor(private prefix = 'sf.save.') {}
  async get(k: string) { return localStorage.getItem(this.prefix + k) ?? undefined; }
  async set(k: string, v: string) { localStorage.setItem(this.prefix + k, v); }
  async remove(k: string) { localStorage.removeItem(this.prefix + k); }
  async keys() {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) out.push(k.slice(this.prefix.length));
    }
    return out;
  }
}

export class IndexedDbBackend implements SaveBackend {
  private db: Promise<IDBDatabase>;
  constructor(name = 'second-face', private store = 'saves') {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const r = fn(db.transaction(this.store, mode).objectStore(this.store));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async get(k: string) { return (await this.tx('readonly', (s) => s.get(k))) as string | undefined; }
  async set(k: string, v: string) { await this.tx('readwrite', (s) => s.put(v, k)); }
  async remove(k: string) { await this.tx('readwrite', (s) => s.delete(k)); }
  async keys() { return (await this.tx('readonly', (s) => s.getAllKeys())).map(String); }
}

/** Pick the best available backend; falls back to localStorage if IndexedDB fails (e.g. private mode). */
export async function createBackend(): Promise<SaveBackend> {
  try {
    if (typeof indexedDB !== 'undefined') {
      const b = new IndexedDbBackend();
      await b.keys();
      return b;
    }
  } catch { /* fall through */ }
  try {
    localStorage.setItem('sf.probe', '1');
    localStorage.removeItem('sf.probe');
    return new LocalStorageBackend();
  } catch {
    return new MemoryBackend();
  }
}

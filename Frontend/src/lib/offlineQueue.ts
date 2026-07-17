/**
 * offlineQueue.ts — IndexedDB-backed offline report queue
 *
 * Stores complete report payloads (including image bytes as ArrayBuffer) so
 * that partially-written reports survive page reloads and browser restarts.
 * The image is stored as raw bytes and reconstructed into a File on sync so
 * the existing upload pipeline requires zero changes.
 *
 * DB layout:
 *   Database:  "cleansight-offline"  (version 1)
 *   Store:     "queued-reports"      (keyPath: "id")
 *     Index:   "by-created"         (createdAt ASC — oldest-first sync)
 */

const DB_NAME = "cleansight-offline";
const DB_VERSION = 1;
const STORE_NAME = "queued-reports";

// ── Types ──────────────────────────────────────────────────────────────────

export interface QueuedReport {
  /** Unique ID generated at enqueue time (crypto.randomUUID). */
  id: string;
  /** Unix ms timestamp of when the report was queued. */
  createdAt: number;
  /** Firebase UID of the authenticated user at queue time. */
  userId: string;
  /** Raw image bytes — reconstructed into a File on sync. */
  imageBlob: ArrayBuffer;
  /** Original filename for Content-Disposition / display. */
  imageName: string;
  /** MIME type, e.g. "image/jpeg". */
  imageMime: string;
  /** Report description text. */
  description: string;
  /** GPS location selected in wizard step 3. */
  location: { lat: number; lng: number };
  /** Waste category (optional). */
  wasteType?: string;
  /** Severity level (optional). */
  urgency?: string;
  /** Small JPEG thumbnail data-URL for display in UI (≤ 30 KB). */
  thumbnail: string | null;
  /** How many sync attempts have failed so far. */
  retryCount: number;
  /** Error message from the last failed sync attempt. */
  lastError?: string;
}

export type EnqueuePayload = Omit<QueuedReport, "id" | "retryCount" | "createdAt">;

// ── DB open (singleton promise) ────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-created", "createdAt", { unique: false });
      }
    };

    req.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;

      // Handle external DB version changes (e.g. another tab upgraded the DB)
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };

      resolve(_db);
    };

    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

// ── Internal IDB helpers ───────────────────────────────────────────────────

function idbTransaction(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));

    const req = fn(store);
    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Add a new report to the offline queue.
 * Returns the generated ID of the queued item.
 */
export async function enqueueReport(payload: EnqueuePayload): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const record: QueuedReport = {
    ...payload,
    id,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await idbTransaction(db, "readwrite", (store) => store.put(record));
  return id;
}

/**
 * Return all queued reports sorted by createdAt ascending (oldest first).
 */
export async function listQueuedReports(): Promise<QueuedReport[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-created");
    const req = index.getAll();
    req.onsuccess = () => resolve(req.result as QueuedReport[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Remove a report from the queue by ID (called after successful sync).
 */
export async function dequeueReport(id: string): Promise<void> {
  const db = await openDB();
  await idbTransaction(db, "readwrite", (store) => store.delete(id));
}

/**
 * Increment the retry counter and persist the latest error message.
 * Called when a sync attempt fails.
 */
export async function incrementRetry(id: string, error: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as QueuedReport | undefined;
      if (!record) {
        resolve();
        return;
      }
      const updated: QueuedReport = {
        ...record,
        retryCount: record.retryCount + 1,
        lastError: error,
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Reconstruct a File object from the stored ArrayBuffer.
 * Used immediately before the existing uploadImage() call.
 */
export function bufferToFile(
  buffer: ArrayBuffer,
  name: string,
  mime: string
): File {
  return new File([buffer], name, { type: mime });
}

/**
 * Convert a File to ArrayBuffer for storage.
 */
export function fileToBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

/** Maximum retry attempts before a queued report is considered permanently failed. */
export const MAX_RETRY_COUNT = 5;

/**
 * Return the count of queued reports without fetching full payloads.
 * Uses IDBObjectStore.count() for efficiency.
 */
export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

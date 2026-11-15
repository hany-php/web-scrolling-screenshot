import type { CaptureMode } from '../shared/constants';

export interface StoredCapturePart {
  readonly partIndex: number;
  readonly totalParts: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly pngBlob: Blob;
}

export interface StoredCaptureRecord {
  readonly jobId: string;
  readonly hostname: string;
  readonly mode: CaptureMode;
  readonly dpr: number;
  readonly totalWidthPx: number;
  readonly totalHeightPx: number;
  readonly createdAt: number;
  readonly parts: readonly StoredCapturePart[];
}

const DB_NAME = 'wss-capture-cache';
const DB_VERSION = 1;
const STORE_NAME = 'captures';
const STALE_TTL_MS = 24 * 60 * 60 * 1000;

function openCaptureDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'jobId' });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB capture cache'));
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openCaptureDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = executor(store);
        let reqResult: T;
        let hasResult = false;

        req.onsuccess = () => {
          reqResult = req.result;
          hasResult = true;
        };
        req.onerror = () => {
          reject(req.error ?? new Error('IndexedDB request failed'));
        };
        tx.oncomplete = () => {
          db.close();
          if (hasResult) {
            resolve(reqResult);
          } else {
            resolve(undefined as T);
          }
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction aborted'));
        };
      }),
  );
}

export async function saveCaptureRecord(record: StoredCaptureRecord): Promise<void> {
  await runTransaction('readwrite', (store) => store.put(record));
}

export async function loadCaptureRecord(jobId: string): Promise<StoredCaptureRecord | null> {
  const result = await runTransaction<unknown>('readonly', (store) => store.get(jobId));
  if (typeof result === 'object' && result !== null && 'jobId' in result && 'parts' in result) {
    return result as StoredCaptureRecord;
  }
  return null;
}

export async function deleteCaptureRecord(jobId: string): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(jobId));
}

export async function pruneExpiredCaptureRecords(maxAgeMs: number = STALE_TTL_MS): Promise<void> {
  const cutoff = Date.now() - maxAgeMs;
  const db = await openCaptureDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const cursorReq = store.openCursor();

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) {
        return;
      }
      const value = cursor.value as Partial<StoredCaptureRecord> | undefined;
      if (typeof value?.createdAt === 'number' && value.createdAt < cutoff) {
        cursor.delete();
      }
      cursor.continue();
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to prune capture cache'));
    };
  });
}

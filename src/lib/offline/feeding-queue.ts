'use client';

export interface OfflineFeedingLog {
  id: string;
  food_type: string;
  animals_count: number;
  notes?: string;
  photo_url?: string;
  approx_location_name: string;
  approx_lat?: number;
  approx_lon?: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  created_at: string;
}

const DB_NAME = 'feeder_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'feeding_queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class OfflineFeedingQueue {
  /**
   * Save a feeding log locally to IndexedDB when offline
   */
  static async saveLog(log: Omit<OfflineFeedingLog, 'id' | 'status' | 'retry_count' | 'created_at'>): Promise<OfflineFeedingLog> {
    const db = await openDB();
    const entry: OfflineFeedingLog = {
      ...log,
      id: `offline_feed_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      status: 'PENDING',
      retry_count: 0,
      created_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);

      req.onsuccess = () => {
        this.notifyListeners();
        resolve(entry);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all pending feeding logs
   */
  static async getPendingLogs(): Promise<OfflineFeedingLog[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const results: OfflineFeedingLog[] = req.result || [];
          resolve(results.filter((r) => r.status !== 'SYNCED'));
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Remove a log from IndexedDB after successful sync
   */
  static async deleteLog(id: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => {
          this.notifyListeners();
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Update status of an offline log
   */
  static async updateStatus(id: string, status: OfflineFeedingLog['status']): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.status = status;
          if (status === 'FAILED') item.retry_count = (item.retry_count || 0) + 1;
          store.put(item);
          this.notifyListeners();
        }
      };
    } catch {
      // ignore
    }
  }

  /**
   * Sync all pending feeding logs when connection is available
   */
  static async syncAll(): Promise<{ synced: number; failed: number }> {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    const pending = await this.getPendingLogs();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const log of pending) {
      await this.updateStatus(log.id, 'SYNCING');

      try {
        const res = await fetch('/api/feeding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodType: log.food_type,
            animalsCount: log.animals_count,
            notes: `${log.notes || ''} [Logged offline on ${new Date(log.created_at).toLocaleTimeString()}]`.trim(),
            photoUrl: log.photo_url,
            approxLocation: log.approx_location_name,
            approxLat: log.approx_lat,
            approxLon: log.approx_lon,
            idempotencyKey: log.id,
          }),
        });

        const data = await res.json();
        if (data.success) {
          await this.deleteLog(log.id);
          synced++;
        } else {
          await this.updateStatus(log.id, 'FAILED');
          failed++;
        }
      } catch {
        await this.updateStatus(log.id, 'FAILED');
        failed++;
      }
    }

    this.notifyListeners();
    return { synced, failed };
  }

  // Subscriber pattern for UI live updates
  private static listeners: Array<() => void> = [];

  static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
  }
}

// Auto-sync listener on window reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    OfflineFeedingQueue.syncAll();
  });
}

// Offline feeding queue is permanently disabled in Feeder.life Online-Only mode.
// The server is the sole source of truth; all mutations require active network connectivity.

export interface OfflineFeedingLog {
  id: string;
  food_type: string;
  animals_count: number;
  notes?: string;
  photo_url?: string;
  approx_location_name: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  created_at: string;
}

export class OfflineFeedingQueue {
  static async getPendingLogs(): Promise<OfflineFeedingLog[]> {
    return [];
  }

  static async syncAll(): Promise<void> {
    // No-op in online-only mode
  }

  static subscribe(_callback: () => void): () => void {
    return () => {};
  }
}

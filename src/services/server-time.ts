import { supabase } from './supabase';

let offsetMs = 0;
let initialized = false;
let resyncTimer: ReturnType<typeof setInterval> | null = null;

export async function syncServerTime(): Promise<void> {
  const { data, error } = await supabase.rpc('server_time');
  if (error) throw error;
  offsetMs = data as number - Date.now();
  initialized = true;
}

export function startServerTimeResync(intervalMs = 5 * 60 * 1000): void {
  if (resyncTimer) {
    clearInterval(resyncTimer);
  }
  resyncTimer = setInterval(() => {
    syncServerTime().catch((err) => {
      console.warn('[ServerTime] Resync failed:', err);
    });
  }, intervalMs);
}

export function stopServerTimeResync(): void {
  if (resyncTimer) {
    clearInterval(resyncTimer);
    resyncTimer = null;
  }
}

export function serverNow(): number {
  if (!initialized) {
    console.warn('[ServerTime] Not initialized, falling back to Date.now()');
  }
  return Date.now() + offsetMs;
}

export function isServerTimeReady(): boolean {
  return initialized;
}

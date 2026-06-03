import { supabase } from './supabase';

let offsetMs = 0;
let initialized = false;

export async function syncServerTime(): Promise<void> {
  const { data, error } = await supabase.rpc('server_time');
  if (error) throw error;
  offsetMs = data as number - Date.now();
  initialized = true;
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

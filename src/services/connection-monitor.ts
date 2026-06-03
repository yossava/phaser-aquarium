let online = navigator.onLine;
let initialized = false;

export function isConnected(): boolean {
  return online;
}

export function setOnline(state: boolean): void {
  online = state;
}

export function initConnectionMonitor(): void {
  if (initialized) return;
  initialized = true;
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
}

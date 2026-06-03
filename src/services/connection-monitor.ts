let online = navigator.onLine;

export function isConnected(): boolean {
  return online;
}

export function setOnline(state: boolean): void {
  online = state;
}

export function initConnectionMonitor(): void {
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
}

import { supabase } from './supabase';
import { ensureCurrentUserProfile } from './profile-sync';
import { serverNow } from './server-time';
import type { SavedGame } from '../game/save';

const SAVE_DEBOUNCE_MS = 8000;
let lastServerSaveAt = 0;
let pendingSave: SavedGame | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveInFlight: Promise<boolean> | null = null;
let lastKnownSyncVersion = 0;
let onVersionConflict: (() => void) | null = null;

export function setVersionConflictHandler(handler: () => void): void {
  onVersionConflict = handler;
}

export function queueServerSave(snapshot: SavedGame): void {
  pendingSave = snapshot;

  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  const elapsed = serverNow() - lastServerSaveAt;
  const delay = Math.max(0, SAVE_DEBOUNCE_MS - elapsed);

  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushServerSave().catch((err) => console.error('[Sync] Flush failed:', err));
  }, delay);
}

export async function saveServerSaveNow(snapshot: SavedGame): Promise<boolean> {
  pendingSave = snapshot;

  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  return flushServerSave();
}

async function flushServerSave(): Promise<boolean> {
  if (saveInFlight) {
    await saveInFlight;
    if (!pendingSave) return true;
  }

  if (!pendingSave) return false;
  const snapshot = pendingSave;
  pendingSave = null;

  saveInFlight = writeServerSave(snapshot).finally(() => {
    saveInFlight = null;
  });

  const saved = await saveInFlight;
  if (pendingSave) {
    return flushServerSave();
  }

  return saved;
}

async function writeServerSave(snapshot: SavedGame): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Re-queue the save for when session is restored
    if (!pendingSave) {
      pendingSave = snapshot;
    }
    saveTimer = setTimeout(flushServerSave, 30000);
    return false;
  }

  const profileReady = await ensureCurrentUserProfile();
  if (!profileReady) {
    if (!pendingSave) {
      pendingSave = snapshot;
    }
    saveTimer = setTimeout(flushServerSave, 30000);
    return false;
  }

  // Fetch current server save to check version
  const { data: serverSave, error: fetchError } = await supabase
    .from('game_saves')
    .select('save_data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    console.error('[Sync] Failed to fetch server save for version check:', fetchError);
  }

  let serverSyncVersion = 0;
  if (serverSave && !fetchError) {
    const serverData = serverSave.save_data as unknown as SavedGame;
    serverSyncVersion = serverData.syncVersion ?? 0;
  }

  // Increment sync version and check for conflicts
  const newSyncVersion = Math.max(lastKnownSyncVersion, serverSyncVersion) + 1;
  
  // If server has a newer version, trigger conflict handler and skip write
  if (serverSyncVersion > lastKnownSyncVersion) {
    console.warn('[Sync] Version conflict detected, server has newer save');
    onVersionConflict?.();
    lastKnownSyncVersion = serverSyncVersion;
    return false;
  }

  const snapshotWithVersion = { ...snapshot, syncVersion: newSyncVersion };
  lastKnownSyncVersion = newSyncVersion;

  const { error } = await supabase
    .from('game_saves')
    .upsert({
      user_id: user.id,
      save_data: snapshotWithVersion as unknown as Record<string, unknown>,
      server_saved_at: new Date(serverNow()).toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[Sync] Server save failed:', error);
    if (!pendingSave) {
      pendingSave = snapshot;
    }
    saveTimer = setTimeout(flushServerSave, 30000);
    return false;
  } else {
    lastServerSaveAt = serverNow();
    return true;
  }
}

export async function loadServerSave(): Promise<SavedGame | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;

  await ensureCurrentUserProfile();

  const { data, error } = await supabase
    .from('game_saves')
    .select('save_data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Sync] Failed to load server save:', error);
    return undefined;
  }

  if (!data) return undefined;
  
  const validated = validateSaveData(data.save_data);
  if (!validated) {
    console.error('[Sync] Server save data validation failed');
    return undefined;
  }
  
  return validated;
}

function validateSaveData(data: unknown): SavedGame | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  
  const save = data as Record<string, unknown>;
  
  // Check required fields
  if (typeof save.version !== 'number' || typeof save.savedAt !== 'number') {
    return undefined;
  }
  
  if (!save.wallet || typeof save.wallet !== 'object') {
    return undefined;
  }
  
  if (!Array.isArray(save.fish)) {
    return undefined;
  }
  
  if (!save.tank || typeof save.tank !== 'object') {
    return undefined;
  }
  
  return data as unknown as SavedGame;
}

export async function subscribeToRemoteSaves(
  onRemoteSave: (saveData: SavedGame) => void
): Promise<() => void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return () => {};
  }

  const channel = supabase
    .channel('game_saves_changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_saves',
      filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      const validated = validateSaveData(payload.new.save_data);
      if (validated) {
        onRemoteSave(validated);
      } else {
        console.warn('[Sync] Rejected invalid remote save data');
      }
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

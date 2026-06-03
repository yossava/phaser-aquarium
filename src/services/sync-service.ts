import { supabase } from './supabase';
import { ensureCurrentUserProfile } from './profile-sync';
import { serverNow } from './server-time';
import type { SavedGame } from '../game/save';

const SAVE_DEBOUNCE_MS = 8000;
let lastServerSaveAt = 0;
let pendingSave: SavedGame | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveInFlight: Promise<boolean> | null = null;

export function queueServerSave(snapshot: SavedGame): void {
  pendingSave = snapshot;

  if (saveTimer) return;

  const elapsed = serverNow() - lastServerSaveAt;
  const delay = Math.max(0, SAVE_DEBOUNCE_MS - elapsed);

  saveTimer = setTimeout(async () => {
    saveTimer = null;
    await flushServerSave();
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
  if (!user) return false;

  const profileReady = await ensureCurrentUserProfile();
  if (!profileReady) {
    if (!pendingSave) {
      pendingSave = snapshot;
    }
    saveTimer = setTimeout(flushServerSave, 30000);
    return false;
  }

  const { error } = await supabase
    .from('game_saves')
    .upsert({
      user_id: user.id,
      save_data: snapshot as unknown as Record<string, unknown>,
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
  return data.save_data as unknown as SavedGame;
}

export function subscribeToRemoteSaves(
  onRemoteSave: (saveData: SavedGame) => void
): () => void {
  const channel = supabase
    .channel('game_saves_changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_saves',
    }, (payload) => {
      onRemoteSave(payload.new.save_data as unknown as SavedGame);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

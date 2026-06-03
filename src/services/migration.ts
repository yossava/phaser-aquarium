import { loadGame, clearSave, type SavedGame } from '../game/save';
import { loadServerSave, saveServerSaveNow } from './sync-service';
import { serverNow } from './server-time';

const LOCAL_SAVE_UPLOAD_GRACE_MS = 60_000;

function shouldUploadLocalSave(localSave: SavedGame, serverSave: SavedGame): boolean {
  return localSave.savedAt > serverSave.savedAt + LOCAL_SAVE_UPLOAD_GRACE_MS;
}

export async function migrateLocalSaveIfExists(): Promise<SavedGame | undefined> {
  const serverSave = await loadServerSave();
  const localSave = loadGame();

  if (serverSave) {
    if (localSave && shouldUploadLocalSave(localSave, serverSave)) {
      const savedToServer = await saveServerSaveNow(localSave);
      if (savedToServer) {
        clearSave();
      }
      return localSave;
    }

    if (!localSave || serverSave.savedAt >= localSave.savedAt) {
      clearSave();
    }
    return serverSave;
  }

  if (localSave) {
    const migrated: SavedGame = {
      ...localSave,
      savedAt: serverNow(),
    };

    const savedToServer = await saveServerSaveNow(migrated);
    if (savedToServer) {
      clearSave();
    }

    return migrated;
  }

  return undefined;
}

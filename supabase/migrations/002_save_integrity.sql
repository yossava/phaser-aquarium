-- Phase 2: Save data integrity, rollback history, and tighter RLS

-- Add CHECK constraint to validate save_data has required top-level fields
-- This prevents malformed saves from being written to the database
ALTER TABLE game_saves
  ADD CONSTRAINT save_data_has_required_fields
  CHECK (
    save_data ? 'version'
    AND save_data ? 'savedAt'
    AND save_data ? 'wallet'
    AND save_data ? 'fish'
    AND save_data ? 'tank'
  );

-- Save history table for rollback on corruption
CREATE TABLE IF NOT EXISTS game_saves_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  save_data JSONB NOT NULL,
  server_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_saves_history_user_id ON game_saves_history (user_id);
CREATE INDEX idx_game_saves_history_archived_at ON game_saves_history (archived_at);

-- Trigger to archive previous save before update
CREATE OR REPLACE FUNCTION archive_save_before_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO game_saves_history (user_id, save_data, server_saved_at, archived_at)
  VALUES (NEW.user_id, OLD.save_data, OLD.server_saved_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_saves_archive
  BEFORE UPDATE ON game_saves
  FOR EACH ROW
  WHEN (OLD.save_data IS DISTINCT FROM NEW.save_data)
  EXECUTE FUNCTION archive_save_before_update();

-- Replace overly permissive RLS policy with granular one (remove DELETE)
DROP POLICY IF EXISTS "Users own save" ON game_saves;

CREATE POLICY "Users own save" ON game_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert save" ON game_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update save" ON game_saves
  FOR UPDATE USING (auth.uid() = user_id);

-- Prevent accidental or malicious deletion of save data (no DELETE policy)
-- If a profile is deleted, the ON DELETE CASCADE from profiles will handle cleanup

-- Keep history table accessible to the legitimate owner
ALTER TABLE game_saves_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own save history" ON game_saves_history
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE on history — only the trigger writes it

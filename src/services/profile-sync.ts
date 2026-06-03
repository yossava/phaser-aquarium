import { supabase } from './supabase';

function sanitizeDisplayName(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  return value.slice(0, 40);
}

export async function ensureCurrentUserProfile(displayName?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const fallbackName =
    sanitizeDisplayName(displayName) ??
    sanitizeDisplayName(user.user_metadata?.username) ??
    sanitizeDisplayName(user.email?.split('@')[0]);

  const profileData: { id: string; display_name?: string | null } = {
    id: user.id,
  };

  if (!existingProfile?.display_name) {
    profileData.display_name = fallbackName;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' });

  if (error) {
    console.error('[Auth] Failed to sync profile:', error);
    return false;
  }

  return true;
}

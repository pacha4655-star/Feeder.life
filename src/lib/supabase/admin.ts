import { getSupabaseServerClient } from './server';
import type { DbUser } from '@/types/database';

export interface SupabaseSyncInput {
  firebase_uid: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
}

export interface SupabaseSyncResult {
  synced: boolean;
  isNewUser: boolean;
  user?: DbUser | null;
  error?: string;
}

/**
 * Synchronizes an authenticated Firebase user with Supabase PostgreSQL.
 * Uses the server-only service-role client.
 * If the user does not exist, creates a real user record with required defaults.
 * If the user already exists, returns the existing user without creating duplicates.
 * NO passwords or password hashes are ever stored in Supabase.
 */
export async function syncUserWithSupabase(input: SupabaseSyncInput): Promise<SupabaseSyncResult> {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Check if user with this firebase_uid already exists in Supabase
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', input.firebase_uid)
      .maybeSingle();

    if (selectError) {
      console.warn('[Supabase Sync] Query notice:', selectError.message);
    }

    if (existingUser) {
      return {
        synced: true,
        isNewUser: false,
        user: existingUser as DbUser,
      };
    }

    // 2. Also check if user exists by email to avoid duplicates across providers
    if (input.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', input.email)
        .maybeSingle();

      if (userByEmail) {
        // Link firebase_uid to existing record
        const { data: updatedUser, error: linkError } = await supabase
          .from('users')
          .update({
            firebase_uid: input.firebase_uid,
            avatar_url: input.avatar_url || userByEmail.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userByEmail.id)
          .select()
          .single();

        if (linkError) {
          console.error('[Supabase Sync] Link error:', linkError.message);
          return { synced: false, isNewUser: false, error: linkError.message };
        }

        return {
          synced: true,
          isNewUser: false,
          user: (updatedUser || userByEmail) as DbUser,
        };
      }
    }

    // 3. Create new user record in Supabase with required PostgreSQL defaults
    const now = new Date().toISOString();
    let baseUsername = (input.username || '').trim().toLowerCase().replace(/[^a-z0-9_]/gi, '');
    if (!baseUsername) {
      baseUsername = input.email
        ? input.email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase()
        : (input.display_name || 'feeder').replace(/[^a-z0-9_]/gi, '').toLowerCase();
    }

    if (!baseUsername || baseUsername.length < 3) {
      baseUsername = `feeder_${Date.now().toString().slice(-4)}`;
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        firebase_uid: input.firebase_uid,
        email: input.email || null,
        username: baseUsername,
        display_name: input.display_name || baseUsername,
        avatar_url: input.avatar_url || null,
        profile_data: {},
        settings: { notifications_enabled: true },
        interests: [],
        onboarding_completed: false,
        is_active: true,
        is_verified: false,
        privacy_settings: { public_profile: true },
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      // If unique username conflict occurs, retry with timestamp suffix
      if (insertError.code === '23505' && insertError.message.includes('username')) {
        const uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-4)}`;
        const { data: retryUser, error: retryError } = await supabase
          .from('users')
          .insert({
            firebase_uid: input.firebase_uid,
            email: input.email || null,
            username: uniqueUsername,
            display_name: input.display_name || baseUsername,
            avatar_url: input.avatar_url || null,
            profile_data: {},
            settings: { notifications_enabled: true },
            interests: [],
            onboarding_completed: false,
            is_active: true,
            is_verified: false,
            privacy_settings: { public_profile: true },
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (retryError) {
          console.error('[Supabase Sync] Retry insert error:', retryError.message);
          return { synced: false, isNewUser: true, error: retryError.message };
        }

        return {
          synced: true,
          isNewUser: true,
          user: retryUser as DbUser,
        };
      }

      console.error('[Supabase Sync] Insert error:', insertError.message);
      return { synced: false, isNewUser: true, error: insertError.message };
    }

    return {
      synced: true,
      isNewUser: true,
      user: newUser as DbUser,
    };
  } catch (err: any) {
    console.error('[Supabase Sync] Unexpected server error:', err.message);
    return { synced: false, isNewUser: false, error: err.message };
  }
}

/**
 * Finds a Supabase user by their verified Firebase UID.
 */
export async function findUserByFirebaseUid(firebaseUid: string): Promise<DbUser | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error) {
    console.error('[findUserByFirebaseUid] Error:', error.message);
    return null;
  }

  return (data as DbUser) || null;
}

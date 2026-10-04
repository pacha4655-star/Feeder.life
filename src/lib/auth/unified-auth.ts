import { NextRequest } from 'next/server';
import { authenticateServerRequest, isAuthenticated } from './firebase-middleware';
import { getCurrentUser } from './session';

export interface ResolvedUser {
  id: string;
  firebaseUid?: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  areaName?: string;
  email?: string;
}

/**
 * Resolves the authenticated Feeder user server-side.
 * Verifies Firebase ID token (via Authorization: Bearer or feeder_token cookie)
 * or signed cryptographic session cookie (feeder_session).
 * NEVER trusts frontend-supplied user IDs.
 */
export async function resolveAuthenticatedUser(
  request: NextRequest
): Promise<ResolvedUser | null> {
  try {
    // 1. Check Firebase token from Authorization header or cookie
    const firebaseResult = await authenticateServerRequest(request);
    if (isAuthenticated(firebaseResult)) {
      return {
        id: firebaseResult.user.id,
        firebaseUid: firebaseResult.firebaseUid,
        username: firebaseResult.user.username || 'feederuser',
        fullName: firebaseResult.user.display_name || firebaseResult.user.username || 'Feeder User',
        avatarUrl: firebaseResult.user.avatar_url || '',
        bio: firebaseResult.user.bio || '',
        city: firebaseResult.user.city || '',
        areaName: firebaseResult.user.profile_data?.area_name || '',
        email: firebaseResult.email || undefined,
      };
    }
  } catch {
    // Continue to session cookie
  }

  // 2. Check signed session cookie
  try {
    const sessionUser = await getCurrentUser(request);
    if (sessionUser) {
      return {
        id: sessionUser.id,
        firebaseUid: sessionUser.firebaseUid,
        username: sessionUser.username,
        fullName: sessionUser.fullName,
        avatarUrl: sessionUser.avatarUrl,
        bio: sessionUser.bio,
        city: sessionUser.city,
        areaName: sessionUser.areaName,
        email: sessionUser.email,
      };
    }
  } catch {
    // Auth failure
  }

  return null;
}

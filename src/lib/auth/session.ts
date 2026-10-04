import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServerClient } from '../supabase/server';
import type { DbUser } from '@/types/database';

export interface UserSession {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  role: 'USER' | 'MODERATOR' | 'COMMUNITY_ADMIN' | 'PLATFORM_MODERATOR' | 'PLATFORM_ADMIN';
  bio?: string;
  areaName?: string;
  city?: string;
  feederLevel?: string;
  feedingCount: number;
  sosCount: number;
  onboardingCompleted?: boolean;
  firebaseUid?: string;
}

// High-speed In-Memory Session Cache (TTL: 30s) to prevent redundant database lookups under 10k concurrency
interface CachedSession {
  user: UserSession;
  expiresAt: number;
}
const sessionMemoryCache = new Map<string, CachedSession>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function invalidateUserSessionCache(userId: string) {
  sessionMemoryCache.delete(userId);
}

/**
 * Generates a tamper-proof cryptographically signed session token for a user.
 * Encodes the Supabase UUID and Firebase UID.
 */
export function createSessionToken(user: { id: string; firebase_uid?: string; email?: string | null; username?: string }): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'feeder-life-session-secret-2026';
  const payload = {
    id: user.id,
    uid: user.firebase_uid,
    email: user.email,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * Validates a signed session token.
 */
export function verifySessionToken(token: string): { id: string; uid?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'feeder-life-session-secret-2026';
    const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns the currently authenticated user session from Supabase PostgreSQL.
 * Uses cryptographically verified session token with in-memory caching.
 * Returns null if no valid session cookie exists.
 * ZERO fake or hardcoded fallbacks.
 */
export async function getCurrentUser(request?: NextRequest): Promise<UserSession | null> {
  let sessionToken: string | undefined;

  if (request) {
    sessionToken = request.cookies.get('feeder_session')?.value;
    if (!sessionToken) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/feeder_session=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }
  }

  if (!sessionToken) {
    try {
      const cookieStore = await cookies();
      sessionToken = cookieStore.get('feeder_session')?.value;
    } catch {
      return null;
    }
  }

  if (!sessionToken) {
    return null;
  }

  const payload = verifySessionToken(sessionToken);
  if (!payload) {
    return null;
  }

  const lookupKey = payload.id || payload.uid;
  if (!lookupKey) {
    return null;
  }

  // Check In-Memory Cache first to avoid hitting database under high load
  const cached = sessionMemoryCache.get(lookupKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from('users')
      .select('id, email, username, display_name, avatar_url, bio, city, is_active, onboarding_completed, firebase_uid, profile_data');

    if (payload.id) {
      query = query.eq('id', payload.id);
    } else if (payload.uid) {
      query = query.eq('firebase_uid', payload.uid);
    }

    const { data: dbUser, error } = await query.maybeSingle();

    if (!error && dbUser && dbUser.is_active) {
      const u = dbUser as any;
      const sessionUser: UserSession = {
        id: u.id,
        email: u.email || '',
        username: u.username || '',
        fullName: u.display_name || u.username || 'Feeder Guardian',
        avatarUrl: u.avatar_url || '',
        role: (u.profile_data?.role as any) || 'USER',
        bio: u.bio || '',
        areaName: u.profile_data?.area_name || '',
        city: u.city || '',
        feederLevel: u.profile_data?.feeder_level || 'Grassroots Feeder',
        feedingCount: u.profile_data?.feeding_count || 0,
        sosCount: u.profile_data?.sos_count || 0,
        onboardingCompleted: u.onboarding_completed ?? false,
        firebaseUid: u.firebase_uid,
      };

      // Store in memory cache
      sessionMemoryCache.set(lookupKey, {
        user: sessionUser,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return sessionUser;
    }
  } catch (supaErr) {
    console.warn('[getCurrentUser] Supabase lookup error:', supaErr);
  }

  return null;
}

export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

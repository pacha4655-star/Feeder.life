/**
 * Database Adapter - Production Architecture
 * 
 * Feeder.life strictly uses Supabase PostgreSQL as the sole database source of truth.
 * Application Tables (Exactly 5):
 * 1. users
 * 2. social_posts
 * 3. communities
 * 4. animals
 * 5. platform_data
 * 
 * SQLite is completely decommissioned.
 */

import { getSupabaseServerClient } from '../supabase/server';

export function getDb() {
  return getSupabaseServerClient();
}

export default getDb;


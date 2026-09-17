import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://jmwbyultcdjduwormsbi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptd2J5dWx0Y2RqZHV3b3Jtc2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0OTExNjIsImV4cCI6MjEwNTA2NzE2Mn0.V5mFGtXMqrm_tGNR1ikKlgaqIKIWDUrQKnKZr8XANuQ';

let client: SupabaseClient | null = null;

/**
 * Public Supabase client for browser/client-side use.
 * Only uses the anonymous public key.
 * NEVER exposed to service role keys.
 */
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

export const supabase = {
  get client(): SupabaseClient {
    return getSupabaseClient();
  },
  channel(name: string, opts?: any) {
    return getSupabaseClient().channel(name, opts);
  },
  from(table: string) {
    return getSupabaseClient().from(table);
  },
};

export default getSupabaseClient;

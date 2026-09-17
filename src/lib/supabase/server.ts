import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Enforce server-only execution to prevent leaking service role key to client
if (typeof window !== 'undefined') {
  throw new Error('src/lib/supabase/server.ts can only be imported on the server side.');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client initialized with the privileged SERVICE_ROLE_KEY.
 * Bypasses PostgreSQL Row-Level Security (RLS) for authenticated server-side API operations.
 * NEVER expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
const DEFAULT_SUPABASE_URL = 'https://jmwbyultcdjduwormsbi.supabase.co';
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptd2J5dWx0Y2RqZHV3b3Jtc2JpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ5MTE2MiwiZXhwIjoyMTA1MDY3MTYyfQ.Xew9Z4fM-grExih_EqjbYGaNq4tGAJYxzcD1ZykAxO4';

export function getSupabaseServerClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_SUPABASE_SERVICE_ROLE_KEY;

  if (!serverClient) {
    serverClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}

export const supabaseServer = {
  get client(): SupabaseClient {
    return getSupabaseServerClient();
  },
};

export default getSupabaseServerClient;

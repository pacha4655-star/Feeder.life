import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import https from 'node:https';

// Enforce server-only execution to prevent leaking service role key to client
if (typeof window !== 'undefined') {
  throw new Error('src/lib/supabase/server.ts can only be imported on the server side.');
}

const DEFAULT_SUPABASE_URL = 'https://jmwbyultcdjduwormsbi.supabase.co';
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptd2J5dWx0Y2RqZHV3b3Jtc2JpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ5MTE2MiwiZXhwIjoyMTA1MDY3MTYyfQ.Xew9Z4fM-grExih_EqjbYGaNq4tGAJYxzcD1ZykAxO4';

// High-capacity HTTP Keep-Alive Agent for serverless & Node connection pooling
const pooledHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 500,
  maxFreeSockets: 100,
  timeout: 10000,
  keepAliveMsecs: 30000,
});

/**
 * Custom fetch wrapper that injects the persistent keep-alive agent
 * to prevent TCP handshake storms and socket exhaustion under 10k load.
 */
const pooledFetch = (url: any, options?: any) => {
  return fetch(url, {
    ...options,
    agent: String(url).startsWith('https') ? pooledHttpsAgent : undefined,
    keepalive: true,
  });
};

let serverClient: SupabaseClient | null = null;

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
      global: {
        fetch: pooledFetch,
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

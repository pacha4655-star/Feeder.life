import fs from 'fs';
import path from 'path';

// Parse .env and .env.local synchronously before importing modules
function loadEnv() {
  for (const envFile of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}
loadEnv();

import { getSupabaseServerClient } from '../src/lib/supabase/server';

async function purgeTestArtifacts() {
  console.log('--- PURGING ALL AUTOMATED TEST ARTIFACTS FROM SUPABASE POSTGRESQL ---');

  try {
    const supabase = getSupabaseServerClient();
    
    // 1. Delete test posts in Supabase
    const { error: supaPostErr } = await supabase
      .from('social_posts')
      .delete()
      .or('content.ilike.%Vaccination Camp%,content.ilike.%Feeding Update%,content.ilike.%trapped paw%');
    
    if (supaPostErr) {
      console.warn('Supabase post cleanup notice:', supaPostErr.message);
    } else {
      console.log('Supabase: Deleted test social_posts.');
    }

    // 2. Delete test users in Supabase
    const { error: supaUserErr } = await supabase
      .from('users')
      .delete()
      .or('email.ilike.%@feeder.test,email.ilike.%@example.com,username.ilike.verifier_%,username.ilike.test_user_%');

    if (supaUserErr) {
      console.warn('Supabase user cleanup notice:', supaUserErr.message);
    } else {
      console.log('Supabase: Deleted test users.');
    }

    console.log('--- SUPABASE PURGE COMPLETED ---');
  } catch (err: any) {
    console.error('Purge error:', err.message);
  }
}

purgeTestArtifacts();

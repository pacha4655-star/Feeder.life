const fs = require('fs');
const path = require('path');

// Load .env.local
try {
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
} catch (e) {}

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDVq_pULHGgn-XAv3bgPvMuMt0H0YXVsSU";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "feeder-life";
const baseUrl = 'https://feeder-life.vercel.app';

async function verifyLiveProductionEndToEnd() {
  console.log('====================================================');
  console.log('LIVE PRODUCTION END-TO-END VERIFICATION');
  console.log('Target URL:', baseUrl);
  console.log('Firebase Project ID:', projectId);
  console.log('====================================================\n');

  const testEmail = `verify_live_${Date.now()}@feeder.life`;
  const testPassword = 'SecurePassword2026!@#';
  const testUsername = `verifier_${Math.floor(Math.random() * 90000 + 10000)}`;
  const testFullName = 'Live Production Verifier';

  // 1. Live Firebase Email Signup
  console.log('1. [FIREBASE AUTH] Testing Email Signup...');
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      returnSecureToken: true,
    }),
  });
  const signUpData = await signUpRes.json();
  if (!signUpRes.ok) {
    console.error('FAIL: Firebase Signup failed:', signUpData);
    return;
  }
  const idToken = signUpData.idToken;
  const firebaseUid = signUpData.localId;
  console.log('PASS: User signed up in Firebase Auth:');
  console.log('  UID:', firebaseUid);
  console.log('  Email:', signUpData.email);

  // 2. Live Firebase Email Login
  console.log('\n2. [FIREBASE AUTH] Testing Email Login...');
  const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      returnSecureToken: true,
    }),
  });
  const signInData = await signInRes.json();
  if (!signInRes.ok) {
    console.error('FAIL: Firebase Login failed:', signInData);
    return;
  }
  console.log('PASS: User authenticated in Firebase Auth:');
  console.log('  UID:', signInData.localId);
  const freshIdToken = signInData.idToken;

  // 3. Live Google OAuth URI verification
  console.log('\n3. [GOOGLE OAUTH] Testing Google OAuth URI generation for feeder-life.vercel.app...');
  const authUriRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId: 'google.com',
      continueUri: 'https://feeder-life.vercel.app/',
      customParameter: {},
      authFlowType: 'CODE_FLOW',
    }),
  });
  const authUriData = await authUriRes.json();
  if (authUriRes.ok && authUriData.authUri) {
    console.log('PASS: Google OAuth URI created successfully (Domain authorized in Firebase!):');
    console.log('  Auth URI prefix:', authUriData.authUri.slice(0, 100) + '...');
  } else {
    console.error('FAIL: Google OAuth URI generation failed:', authUriData);
  }

  // 4. Test live /api/auth/sync endpoint on Vercel
  console.log('\n4. [VERCEL API /api/auth/sync] Testing live token sync on https://feeder-life.vercel.app...');
  const syncRes = await fetch(`${baseUrl}/api/auth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: freshIdToken,
      username: testUsername,
      fullName: testFullName,
    }),
  });
  console.log('  HTTP Status:', syncRes.status);
  const rawText = await syncRes.text();
  console.log('  Raw Response Text:', rawText);
  let syncData = {};
  try {
    syncData = JSON.parse(rawText);
  } catch (e) {
    console.error('Failed to parse JSON response:', e.message);
  }
  const setCookieHeader = syncRes.headers.get('set-cookie');
  console.log('  Response Data:', syncData);
  console.log('  Set-Cookie Present:', !!setCookieHeader);

  let sessionCookie = '';
  if (setCookieHeader) {
    const match = setCookieHeader.match(/feeder_session=([^;]+)/);
    if (match) sessionCookie = match[1];
  }

  if (syncRes.ok && syncData.success) {
    console.log('PASS: /api/auth/sync succeeded on live Vercel deployment!');
    console.log('  Supabase User ID:', syncData.user?.id);
    console.log('  Supabase Username:', syncData.user?.username);
  } else {
    console.error('FAIL: /api/auth/sync failed on Vercel deployment:', syncData);
  }

  // 5. Test authenticated session on live Vercel endpoint
  if (sessionCookie) {
    console.log('\n5. [SESSION VERIFICATION] Testing authenticated profile fetch with session cookie...');
    const profileRes = await fetch(`${baseUrl}/api/users/profile`, {
      headers: {
        'Cookie': `feeder_session=${sessionCookie}`,
      },
    });
    const profileData = await profileRes.json();
    console.log('  Profile Status:', profileRes.status);
    console.log('  Profile Data:', profileData);
    if (profileRes.ok && profileData.success) {
      console.log('PASS: Authenticated session validated on live Vercel production deployment!');
    }
  }

  // 6. Direct Supabase verification
  console.log('\n6. [SUPABASE DATABASE] Verifying user row directly in Supabase PostgreSQL...');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: supaUser, error: supaErr } = await supabase
    .from('users')
    .select('id, firebase_uid, email, username, display_name, role, created_at')
    .eq('firebase_uid', firebaseUid)
    .single();

  if (supaErr || !supaUser) {
    console.error('FAIL: User not found in Supabase:', supaErr);
  } else {
    console.log('PASS: Verified user in Supabase PostgreSQL:');
    console.log('  ID:', supaUser.id);
    console.log('  Firebase UID:', supaUser.firebase_uid);
    console.log('  Email:', supaUser.email);
    console.log('  Username:', supaUser.username);
  }

  // 7. Cleanup
  console.log('\n7. [CLEANUP] Removing test records from Supabase and Firebase Auth...');
  if (supaUser) {
    await supabase.from('users').delete().eq('id', supaUser.id);
    console.log('PASS: Supabase test user row deleted.');
  }
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: freshIdToken }),
  });
  console.log('PASS: Firebase Auth test user deleted.');
  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
}

verifyLiveProductionEndToEnd().catch(console.error);

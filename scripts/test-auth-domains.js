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

async function testCreateAuthUri(domain) {
  console.log(`\nTesting createAuthUri for domain: ${domain}`);
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`;
  
  const body = {
    providerId: 'google.com',
    continueUri: `https://${domain}/`,
    customParameter: {},
    authFlowType: 'CODE_FLOW'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log(`Status for ${domain}:`, res.status);
  console.log(`Response:`, JSON.stringify(data, null, 2));
}

async function run() {
  await testCreateAuthUri('localhost');
  await testCreateAuthUri('feeder-life.firebaseapp.com');
  await testCreateAuthUri('feeder-life.vercel.app');
  await testCreateAuthUri('feeder.life');
}

run().catch(console.error);

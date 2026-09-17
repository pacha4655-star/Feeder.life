const apiKey = "AIzaSyDVq_pULHGgn-XAv3bgPvMuMt0H0YXVsSU";

async function testSync() {
  console.log('1. Signing up user to get fresh ID token...');
  const testEmail = `test_sync_${Date.now()}@feeder.life`;
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'TestPassword123!@#',
      returnSecureToken: true
    })
  });
  const signUpData = await signUpRes.json();
  const idToken = signUpData.idToken;
  console.log('ID Token retrieved (length:', idToken.length, ')');

  console.log('\n2. Calling live https://feeder-life.vercel.app/api/auth/sync ...');
  const res = await fetch('https://feeder-life.vercel.app/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      idToken,
      username: 'sync_tester_' + Math.floor(Math.random() * 1000),
      fullName: 'Sync Tester'
    })
  });

  console.log('Status:', res.status);
  console.log('Status Text:', res.statusText);
  console.log('Headers:');
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
  const text = await res.text();
  console.log('Body:', text);
}

testSync().catch(console.error);

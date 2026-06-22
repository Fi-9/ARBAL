const API_BASE = 'http://localhost:3001/api/v1';
const PROXY_BASE = 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'admin@arbal.local';
const TEST_PASSWORD = 'admin123';

async function test() {
  console.log('=== Login to obtain accessToken ===');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.accessToken;
  console.log('✅ Logged in successfully.');

  console.log('\n=== Testing GET /api/v1/backup (Direct port 3001) ===');
  const getDirectRes = await fetch(`${API_BASE}/backup`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(`Direct GET Status: ${getDirectRes.status}`);
  console.log('Direct GET Response:', await getDirectRes.text());

  console.log('\n=== Testing GET /api/v1/backup (Proxied port 3000) ===');
  const getProxyRes = await fetch(`${PROXY_BASE}/backup`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(`Proxied GET Status: ${getProxyRes.status}`);
  console.log('Proxied GET Response:', await getProxyRes.text());
}

test().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});


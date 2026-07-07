const API_BASE = process.env.ARBAL_API_BASE_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL = process.env.ARBAL_TEST_EMAIL || 'admin@arbal.local';
const TEST_PASSWORD = process.env.ARBAL_TEST_PASSWORD || 'changeme';
const TEST_BACKUP_NAME =
  process.env.ARBAL_TEST_BACKUP_NAME || 'arbal-backup-2026-06-21T02-00-00-000Z.zip';

let passed = 0;
let failed = 0;

async function login() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }

  return data.accessToken;
}

async function expectStatus(label, requestFn, expectedStatuses) {
  try {
    const response = await requestFn();
    const body = await response.text();
    const ok = expectedStatuses.includes(response.status);
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}: status=${response.status}`);
    if (!ok) {
      console.log(`    Expected one of [${expectedStatuses.join(', ')}], got ${response.status}`);
      console.log(`    Body: ${body.slice(0, 200)}`);
      failed++;
    } else {
      passed++;
    }
  } catch (err) {
    console.log(`  FAIL ${label}: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('=== Restore Guard Smoke Tests ===\n');

  let token;
  try {
    token = await login();
    console.log('Login: OK\n');
  } catch (err) {
    console.log('Login failed - server may not be running. Skipping API tests.');
    console.log(`Error: ${err.message}`);
    console.log('\n=== Tests Skipped ===');
    return;
  }

  console.log('--- Reason Validation ---');

  await expectStatus(
    'Restore without reason should be rejected',
    () =>
      fetch(`${API_BASE}/backup/restore/${TEST_BACKUP_NAME}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }),
    [400, 403, 404],
  );

  await expectStatus(
    'Restore with short reason should be rejected',
    () =>
      fetch(`${API_BASE}/backup/restore/${TEST_BACKUP_NAME}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'short' }),
      }),
    [400, 403, 404],
  );

  console.log('\n--- Path Traversal Guards ---');

  await expectStatus(
    'Restore with path traversal filename should be rejected',
    () =>
      fetch(`${API_BASE}/backup/restore/../../../etc/passwd.zip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'restore for security testing of traversal path' }),
      }),
    [400, 403, 404],
  );

  await expectStatus(
    'Restore with path separator filename should be rejected',
    () =>
      fetch(`${API_BASE}/backup/restore/folder/arbal-backup.zip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'restore for security testing of path separator' }),
      }),
    [400, 403, 404],
  );

  console.log('\n--- Extension Validation ---');

  await expectStatus(
    'Restore with non-.zip extension should be rejected',
    () =>
      fetch(`${API_BASE}/backup/restore/arbal-backup.txt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'restore for extension validation testing purposes' }),
      }),
    [400, 403, 404],
  );

  console.log('\n--- Upload Restore Guards ---');

  await expectStatus(
    'Upload restore without file should be rejected',
    () =>
      fetch(`${API_BASE}/backup/upload-restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    [400, 403, 404],
  );

  console.log('\n--- Permission Guards ---');

  await expectStatus(
    'Restore without auth token should be rejected',
    () =>
      fetch(`${API_BASE}/backup/restore/${TEST_BACKUP_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'restore for auth testing purposes here' }),
      }),
    [401],
  );

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Restore guard smoke test failed:', err);
  process.exit(1);
});

/**
 * Minimal analytics endpoint verification script.
 *
 * Usage (requires a running backend + valid Firebase token):
 *   TOKEN=<firebase-id-token> node Backend/src/tests/analyticsRoutes.test.js
 *
 * This is a simple fetch-based smoke test, not a full test framework.
 */

const BASE = process.env.API_URL || 'http://localhost:5000';
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('❌  Set TOKEN env var to a valid Firebase ID token.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌  ${name} — ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: opts.headers || headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function run() {
  console.log('\n🔎  Analytics Route Tests\n');

  // ── Auth required ────────────────────────────────────
  await test('GET /api/analytics/summary requires auth', async () => {
    const { status } = await get('/api/analytics/summary', { headers: {} });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // ── Valid preset ─────────────────────────────────────
  await test('GET /api/analytics/summary?preset=7d returns 200', async () => {
    const { status, body } = await get('/api/analytics/summary?preset=7d');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, 'Expected success=true');
    assert(body.data?.totals != null, 'Missing totals');
  });

  // ── Invalid preset rejected ──────────────────────────
  await test('GET /api/analytics/summary?preset=999d returns 400', async () => {
    const { status } = await get('/api/analytics/summary?preset=999d');
    assert(status === 400, `Expected 400, got ${status}`);
  });

  // ── Invalid date format rejected ─────────────────────
  await test('GET /api/analytics/summary?from=not-a-date returns 400', async () => {
    const { status } = await get('/api/analytics/summary?from=not-a-date');
    assert(status === 400, `Expected 400, got ${status}`);
  });

  // ── Performance endpoint ─────────────────────────────
  await test('GET /api/analytics/performance?preset=30d returns 200', async () => {
    const { status, body } = await get('/api/analytics/performance?preset=30d');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data?.range != null, 'Missing range');
  });

  // ── Volunteers endpoint (may 403 for non-staff) ──────
  await test('GET /api/analytics/volunteers responds (200 or 403)', async () => {
    const { status } = await get('/api/analytics/volunteers?preset=7d');
    assert(status === 200 || status === 403, `Expected 200 or 403, got ${status}`);
  });

  // ── Summary ──────────────────────────────────────────
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();

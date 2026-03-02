#!/usr/bin/env node
// Pre-demo automated checks for Ema TnE
// Run: node scripts/pre-demo-check.js [--url http://localhost:3000]
// Requires: Node 18+ (built-in fetch)

const BASE_URL = (() => {
  const idx = process.argv.indexOf('--url');
  return idx !== -1 ? process.argv[idx + 1] : 'http://localhost:3000';
})();

// ANSI helpers
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

async function timedFetch(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON response */
    }
    return { ok: res.ok, status: res.status, body, latencyMs };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      body: null,
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

const results = [];

function pass(label, detail) {
  console.log(
    `  ${green('PASS')} ${label}${detail ? dim(` — ${detail}`) : ''}`
  );
  results.push(true);
}
function fail(label, detail) {
  console.log(
    `  ${red('FAIL')} ${label}${detail ? dim(` — ${detail}`) : ''}`
  );
  results.push(false);
}
function warn(label, detail) {
  console.log(
    `  ${yellow('WARN')} ${label}${detail ? dim(` — ${detail}`) : ''}`
  );
  results.push(true); // warnings count as passing
}

async function runChecks() {
  console.log(bold('\n=== Ema TnE — Pre-Demo Check ==='));
  console.log(dim(`Target: ${BASE_URL}`));
  console.log(dim(`Time:   ${new Date().toLocaleTimeString()}\n`));

  // CHECK 1: Health endpoint
  console.log(bold('1. Health endpoint'));
  const health = await timedFetch(
    `${BASE_URL}/api/trpc/health.check?batch=1&input=%7B%7D`,
    {},
    5000
  );
  if (health.status === 0) {
    fail(
      'Health endpoint unreachable',
      `Is the dev server running at ${BASE_URL}?`
    );
  } else if (health.ok) {
    const status = health.body?.[0]?.result?.data?.status;
    if (status === 'ok') {
      pass('Health returns { status: "ok" }', `${health.latencyMs}ms`);
    } else {
      fail(
        'Health returned unexpected data',
        `status=${JSON.stringify(status)}`
      );
    }
  } else {
    fail('Health returned error', `HTTP ${health.status}`);
  }

  if (health.latencyMs < 500) {
    pass('Health latency <500ms', `${health.latencyMs}ms`);
  } else {
    warn('Health latency >=500ms', `${health.latencyMs}ms (target: <500ms)`);
  }

  // CHECK 2: Chat route availability (expects 401 without auth)
  console.log(bold('\n2. Chat route availability'));
  const chatProbe = await timedFetch(
    `${BASE_URL}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
    3000
  );
  if (chatProbe.status === 0) {
    fail('Chat route unreachable', 'Server may not be running');
  } else if (chatProbe.status === 401 || chatProbe.status === 403) {
    pass('Chat route is live (auth enforced)', `HTTP ${chatProbe.status}`);
  } else if (chatProbe.status === 400 || chatProbe.status === 422) {
    pass(
      'Chat route is live (validation error without auth)',
      `HTTP ${chatProbe.status}`
    );
  } else {
    warn(
      'Chat route returned unexpected status',
      `HTTP ${chatProbe.status} — verify manually`
    );
  }

  // CHECK 3: Dashboard route availability
  console.log(bold('\n3. Dashboard page'));
  const dashProbe = await timedFetch(`${BASE_URL}/dashboard`, {}, 5000);
  if (dashProbe.status === 0) {
    fail('Dashboard page unreachable');
  } else if (dashProbe.ok || dashProbe.status === 307 || dashProbe.status === 302) {
    pass(
      'Dashboard route responds',
      `HTTP ${dashProbe.status}, ${dashProbe.latencyMs}ms`
    );
  } else {
    warn(
      'Dashboard returned unexpected status',
      `HTTP ${dashProbe.status}`
    );
  }

  // CHECK 4: Fallback mode status
  console.log(bold('\n4. Environment'));
  const fallbackMode = process.env.FALLBACK_MODE;
  if (!fallbackMode || fallbackMode === 'false') {
    pass('FALLBACK_MODE is off — live LLM mode');
  } else {
    warn(
      'FALLBACK_MODE=true — demo will use pre-computed responses',
      'Set to false for live AI demo'
    );
  }

  // SUMMARY
  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(
    bold(`\n=== Automated: ${passed}/${total} checks passed ===\n`)
  );

  // MANUAL CHECKLIST
  console.log(bold('=== Manual Checks (Browser Required) ==='));
  console.log(dim('Open browser and verify each item:\n'));
  const manual = [
    'Load /chat (Mumbai scenario) — page loads in <8s',
    'Dinner row (Trishna, ₹8,500) reasoning is EXPANDED without clicking',
    'Type "Yes, ₹1,100. No receipt." — taxi updates, submit button appears',
    'Navigate to /dashboard — hero metric visible',
    '[Approve] button on flagged item works, counts update',
    'Ctrl+D auto-fills taxi confirmation (if implemented)',
    'Two-tab test: submit as Tanya → appears in Mihir\'s dashboard within 2s',
  ];
  manual.forEach((item, i) => console.log(`  [ ] ${i + 1}. ${item}`));

  // FALLBACK RESILIENCE TEST
  console.log(bold('\n=== Fallback Resilience Test (Manual, ~2 min) ==='));
  console.log('  1. Comment out ANTHROPIC_API_KEY in .env.local');
  console.log('  2. Restart dev server: npm run dev');
  console.log(
    '  3. Load /chat (Mumbai) — should render identically from fallbacks'
  );
  console.log('  4. Verify dinner, taxi gap, and chat all render correctly');
  console.log('  5. Restore ANTHROPIC_API_KEY and restart server');

  // LATENCY TARGETS
  console.log(bold('\n=== Latency Targets ==='));
  console.log(
    `  First token (chat):    <2s   ${dim('(DevTools Network tab)')}`
  );
  console.log(
    `  Fallback response:     <500ms ${dim('(when FALLBACK_MODE=true)')}`
  );
  console.log(
    `  Dashboard load:        <3s   ${dim('(navigate to /dashboard)')}`
  );
  console.log(
    `  Assembly (chat page):  <8s   ${dim('(full page load + first message)')}`
  );

  // EXIT
  const allPassed = results.every(Boolean);
  if (!allPassed) {
    console.log(red('\nFix failing checks before demo.\n'));
    process.exit(1);
  } else {
    console.log(green('\nAll automated checks passed. Complete manual checklist above.\n'));
    process.exit(0);
  }
}

runChecks().catch((err) => {
  console.error(red('Script error:'), err.message);
  process.exit(1);
});

// Shared runner for the standalone test pages.
//
// Failures must be visible on the page, not only in the console: each check gets
// a PENDING / PASS / FAIL badge, and uncaught errors flip the overall status.
// `window.__XQI18N_TEST__` mirrors the same state for automation.

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertText(selector, expected, label) {
  const element = document.querySelector(selector);
  assert(element, `missing element: ${selector}`);
  const actual = (element.textContent || '').trim();
  assert(
    actual === expected,
    `${label}: expected "${expected}", found "${actual}"`,
  );
}

export function textOf(selector) {
  const element = document.querySelector(selector);
  assert(element, `missing element: ${selector}`);
  return (element.textContent || '').trim();
}

export async function waitFor(check, message, timeout = 4000) {
  const started = performance.now();
  while (performance.now() - started <= timeout) {
    if (check()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

export function createCheckRunner({ page }) {
  const summary = document.querySelector('#summary');
  const list = document.querySelector('#checks');
  const details = document.querySelector('#details');

  const state = {
    page,
    status: 'running',
    checks: [],
    errors: [],
    // Set once the interactive demo has been mounted for manual inspection.
    demoReady: false,
  };
  window.__XQI18N_TEST__ = state;

  const setBadge = (status) => {
    summary.dataset.status = status;
    summary.className = `status-badge is-${status}`;
    summary.textContent = status === 'passed' ? 'PASS' : status === 'failed' ? 'FAIL' : 'RUNNING';
  };

  const reportLateError = (error) => {
    const message = formatError(error);
    state.errors.push(message);
    if (state.status === 'passed') {
      state.status = 'failed';
      setBadge('failed');
      details.textContent = state.errors.join(' | ');
    }
  };

  window.addEventListener('error', (event) => reportLateError(event.error || event.message));
  window.addEventListener('unhandledrejection', (event) => reportLateError(event.reason));
  setBadge('running');

  return {
    state,

    async run(checks) {
      let passed = 0;
      let failed = 0;

      for (const [name, check] of checks) {
        const item = document.createElement('li');
        item.className = 'check-item';
        item.dataset.testStatus = 'pending';
        const label = document.createElement('span');
        label.textContent = name;
        const badge = document.createElement('strong');
        badge.className = 'check-badge';
        badge.textContent = 'PENDING';
        item.append(label, badge);
        list.append(item);

        try {
          await check();
          item.dataset.testStatus = 'pass';
          item.className = 'check-item is-pass';
          badge.textContent = 'PASS';
          state.checks.push({ name, status: 'pass' });
          passed += 1;
        } catch (error) {
          const message = formatError(error);
          item.dataset.testStatus = 'fail';
          item.className = 'check-item is-fail';
          badge.textContent = 'FAIL';
          state.checks.push({ name, status: 'fail', message });
          state.errors.push(`${name}: ${message}`);
          failed += 1;
        }
      }

      state.status = failed === 0 && state.errors.length === 0 ? 'passed' : 'failed';
      setBadge(state.status);
      details.textContent = `${passed} passed, ${failed} failed. ${
        state.errors.length > 0 ? state.errors.join(' | ') : 'No page errors.'
      }`;
      return state.status;
    },

    markDemoReady() {
      state.demoReady = true;
      details.textContent += ' Live demo mounted.';
    },
  };
}

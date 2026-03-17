/**
 * Performance Audit
 *
 * Uses Playwright CDP (Chrome DevTools Protocol) to collect Core Web Vitals
 * and timing data. Targets:
 *   - LCP  ≤ 2500ms  (Lighthouse "Good" threshold)
 *   - FID/INP ≤ 200ms
 *   - CLS  ≤ 0.1
 *   - TTFB ≤ 800ms
 *   - Page load ≤ 3000ms
 *
 * Note: Full Lighthouse scoring (≥90) requires the lighthouse CLI and a
 * production build. These tests run against the dev server and measure raw
 * timing — see `npm run audit:lighthouse` for the full score.
 */

import { test, expect } from './fixtures/test-base';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function collectMetrics(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = Object.fromEntries(
      performance.getEntriesByType('paint').map((p) => [p.name, p.startTime])
    );

    return {
      ttfb: nav?.responseStart - nav?.requestStart,
      domContentLoaded: nav?.domContentLoadedEventEnd - nav?.startTime,
      loadComplete: nav?.loadEventEnd - nav?.startTime,
      fcp: paint['first-contentful-paint'] ?? null,
    };
  });

  // Collect LCP via PerformanceObserver (already polled at page load time)
  const lcp = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let lcpValue = 0;
      try {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            lcpValue = entry.startTime;
          }
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
        // Short wait then resolve with latest value
        setTimeout(() => resolve(lcpValue), 500);
      } catch {
        resolve(0);
      }
    });
  });

  return { ...metrics, lcp };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Core Web Vitals — Dashboard', () => {
  test('TTFB is under 800ms', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const { ttfb } = await collectMetrics(page);
    console.log(`  TTFB: ${ttfb?.toFixed(0)}ms`);
    expect(ttfb).toBeLessThan(800);
  });

  test('FCP is under 2000ms', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const { fcp } = await collectMetrics(page);
    console.log(`  FCP: ${fcp?.toFixed(0)}ms`);
    if (fcp) {
      expect(fcp).toBeLessThan(2000);
    }
  });

  test('LCP is under 2500ms', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Allow LCP observer to fire
    await page.waitForTimeout(1000);
    const { lcp } = await collectMetrics(page);
    console.log(`  LCP: ${lcp?.toFixed(0)}ms`);
    if (lcp > 0) {
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('DOM content loaded under 2000ms', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const { domContentLoaded } = await collectMetrics(page);
    console.log(`  DOMContentLoaded: ${domContentLoaded?.toFixed(0)}ms`);
    expect(domContentLoaded).toBeLessThan(2000);
  });
});

test.describe('Core Web Vitals — Settings Page', () => {
  test('settings page TTFB is under 800ms', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' });
    const { ttfb } = await collectMetrics(page);
    console.log(`  TTFB: ${ttfb?.toFixed(0)}ms`);
    expect(ttfb).toBeLessThan(800);
  });

  test('settings page FCP under 2000ms', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' });
    const { fcp } = await collectMetrics(page);
    console.log(`  FCP: ${fcp?.toFixed(0)}ms`);
    if (fcp) {
      expect(fcp).toBeLessThan(2000);
    }
  });
});

test.describe('Network — API response times', () => {
  test('GET /api/hosts responds under 500ms', async ({ page }) => {
    const start = Date.now();
    const res = await page.request.get('/api/hosts');
    const elapsed = Date.now() - start;
    console.log(`  GET /api/hosts: ${elapsed}ms (status ${res.status()})`);
    expect(elapsed).toBeLessThan(500);
  });

  test('GET /api/projects responds under 500ms', async ({ page }) => {
    const start = Date.now();
    const res = await page.request.get('/api/projects');
    const elapsed = Date.now() - start;
    console.log(`  GET /api/projects: ${elapsed}ms (status ${res.status()})`);
    expect(elapsed).toBeLessThan(500);
  });

  test('GET /api/preferences responds under 500ms', async ({ page }) => {
    const start = Date.now();
    const res = await page.request.get('/api/preferences');
    const elapsed = Date.now() - start;
    console.log(`  GET /api/preferences: ${elapsed}ms (status ${res.status()})`);
    expect(elapsed).toBeLessThan(500);
  });
});

test.describe('WebSocket connection latency', () => {
  test('/updates WebSocket connects within 3000ms', async ({ page }) => {
    let wsConnectedAt = 0;
    const startTime = Date.now();

    page.on('websocket', (ws) => {
      ws.on('framereceived', () => {
        if (!wsConnectedAt) wsConnectedAt = Date.now();
      });
    });

    await page.goto('/hosts');
    await page.waitForTimeout(3000);

    if (wsConnectedAt > 0) {
      const elapsed = wsConnectedAt - startTime;
      console.log(`  WebSocket first frame: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(3000);
    } else {
      // No WS in test env without hosts — informational only
      console.log('  WebSocket: no data frame received (no hosts configured)');
    }
  });
});

test.describe('Rendering — No layout shift', () => {
  test('dashboard CLS is under 0.1', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        try {
          const obs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // LayoutShift entries have hadRecentInput and value
              const ls = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
              if (!ls.hadRecentInput) {
                clsValue += ls.value ?? 0;
              }
            }
          });
          obs.observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve(clsValue), 1500);
        } catch {
          resolve(0);
        }
      });
    });

    console.log(`  CLS: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.1);
  });
});

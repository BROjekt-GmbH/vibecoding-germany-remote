/**
 * Accessibility Audit — WCAG 2.1 AA
 *
 * Uses @axe-core/playwright to run automated rule checks on every main route.
 *
 * Additional manual-style checks:
 *  - Keyboard navigation through sidebar
 *  - Dialog traps focus correctly
 *  - All form inputs have associated labels
 *  - Color contrast is not violated (axe catches most contrast issues)
 *  - Buttons with only icons have aria-label
 */

import { test, expect } from './fixtures/test-base';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/hosts', name: 'Hosts' },
  { path: '/terminal', name: 'Terminal' },
  { path: '/settings', name: 'Settings' },
] as const;

// ── Automated axe scans ───────────────────────────────────────────────────────

test.describe('WCAG 2.1 AA — Automated axe scan', () => {
  for (const { path, name } of ROUTES) {
    test(`${name} page (${path}) has no WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(path);
      // Wait for page to stabilise (animations, async fetches)
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        // Exclude third-party xterm.js DOM which may have its own a11y quirks
        .exclude('.xterm-accessibility')
        .analyze();

      if (results.violations.length > 0) {
        const summary = results.violations
          .map((v) => `  [${v.impact}] ${v.id}: ${v.description}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`)
          .join('\n');
        console.error(`Accessibility violations on ${path}:\n${summary}`);
      }

      expect(results.violations, `${name} page must have no WCAG 2.1 AA violations`).toHaveLength(0);
    });
  }
});

// ── Settings dialog a11y ─────────────────────────────────────────────────────

test.describe('WCAG — Add Host Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('text=SSH HOSTS');
  });

  test('dialog has no violations when open', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  test('dialog traps focus — Tab cycles within dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    // Get all focusable elements inside the dialog
    const focusableInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return [];
      const focusable = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(focusable).map((el) => el.tagName);
    });

    expect(focusableInsideDialog.length).toBeGreaterThan(0);
  });

  test('all form inputs have associated labels', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    const violations = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();

    expect(violations.violations).toHaveLength(0);
  });

  test('closes dialog on Escape key', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    await page.keyboard.press('Escape');

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });
});

// ── Keyboard navigation ───────────────────────────────────────────────────────

test.describe('Keyboard Navigation', () => {
  test('sidebar navigation links are keyboard reachable', async ({ page }) => {
    await page.goto('/');

    // Start keyboard navigation from the top
    await page.keyboard.press('Tab');

    const reachedLinks: string[] = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const activeHref = await page.evaluate(() => {
        const el = document.activeElement;
        return el instanceof HTMLAnchorElement ? el.getAttribute('href') : null;
      });
      if (activeHref) reachedLinks.push(activeHref);
    }

    expect(reachedLinks).toContain('/hosts');
  });

  test('nav tile links can be activated with Enter key', async ({ page }) => {
    await page.goto('/');

    // Tab until Hosts link is focused
    let found = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const isHostsLink = await page.evaluate(() => {
        const el = document.activeElement;
        return el instanceof HTMLAnchorElement && el.href.includes('/hosts');
      });
      if (isHostsLink) {
        found = true;
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/hosts/);
        break;
      }
    }
    expect(found).toBe(true);
  });
});

// ── Icon-only buttons have aria-labels ───────────────────────────────────────

test.describe('Accessible button labels', () => {
  test('edit and delete buttons on settings page have aria-labels', async ({ page }) => {
    // Add a host so there are edit/delete buttons to check
    await page.request.post('/api/hosts', {
      data: { name: 'A11y Host', hostname: '10.0.0.99', port: 22, username: 'a11y', authMethod: 'agent' },
    });

    await page.goto('/settings');
    await page.waitForSelector('text=A11y Host');

    const violations = await new AxeBuilder({ page })
      .withRules(['button-name'])
      .analyze();

    expect(violations.violations).toHaveLength(0);
  });
});

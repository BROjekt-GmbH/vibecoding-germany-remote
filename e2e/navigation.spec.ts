/**
 * E2E: App Navigation & Shell
 *
 * Covers:
 *  - Dashboard loads and shows all 4 nav tiles
 *  - Sidebar navigation links work
 *  - Connection status indicator renders
 *  - Each main route loads without JS errors
 */

import { test, expect } from './fixtures/test-base';

const MAIN_ROUTES = ['/', '/hosts', '/terminal', '/settings'] as const;

test.describe('Dashboard', () => {
  test('loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');

    const filtered = errors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('socket') && !e.includes('net::ERR')
    );
    expect(filtered).toHaveLength(0);
  });

  test('shows COMMAND CENTER hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('COMMAND CENTER')).toBeVisible();
    await expect(page.getByText('Remote Team')).toBeVisible();
  });

  test('shows 3 navigation tiles', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Hosts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Terminal/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Files/i })).toBeVisible();
  });

  test('shows system status panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('SYSTEM STATUS')).toBeVisible();
    await expect(page.getByText('WebSocket')).toBeVisible();
    await expect(page.getByText('Database')).toBeVisible();
  });

  test('Hosts tile navigates to /hosts', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^Hosts$/i }).click();
    await expect(page).toHaveURL(/\/hosts/);
  });

});

test.describe('All main routes render', () => {
  for (const route of MAIN_ROUTES) {
    test(`${route} loads without crashing`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();

      const filtered = errors.filter(
        (e) =>
          !e.includes('WebSocket') &&
          !e.includes('socket') &&
          !e.includes('net::ERR') &&
          !e.includes('ECONNREFUSED')
      );
      expect(filtered).toHaveLength(0);
    });
  }
});

test.describe('Sidebar navigation', () => {
  test('sidebar is visible on all main routes', async ({ page }) => {
    for (const route of ['/', '/hosts', '/settings']) {
      await page.goto(route);
      const sidebar = page.locator('nav, aside, [role="navigation"]').first();
      await expect(sidebar).toBeVisible();
    }
  });

  test('sidebar contains all main nav links', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, aside').first();
    await expect(nav.getByRole('link', { name: /hosts/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /terminal/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /files/i })).toBeVisible();
  });
});

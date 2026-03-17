/**
 * E2E: SSH Host Configuration Flow
 *
 * Covers:
 *  - Navigating to Settings
 *  - Adding a host via the dialog form
 *  - Validation errors on empty/invalid fields
 *  - Editing an existing host
 *  - Deleting a host
 *  - Host appearing in /hosts page
 */

import { test, expect, TEST_HOST } from './fixtures/test-base';

test.describe('SSH Host Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Wait for the page to finish loading hosts
    await page.waitForSelector('text=SSH HOSTS', { timeout: 10_000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Add host — validation
  // ────────────────────────────────────────────────────────────────────────────

  test('shows validation errors when form is submitted empty', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    // Submit without filling anything
    await page.getByRole('button', { name: /Add Host/i }).last().click();

    await expect(page.getByText('Required').first()).toBeVisible();
  });

  test('shows port validation error for out-of-range value', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    await page.getByPlaceholder('Work Laptop').fill('My Host');
    await page.getByPlaceholder('100.x.x.x').fill('10.0.0.1');
    await page.getByPlaceholder('user').fill('admin');
    await page.getByPlaceholder('22').fill('99999');

    await page.getByRole('button', { name: /Add Host/i }).last().click();
    await expect(page.getByText(/Must be 1.65535/i)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Add host — success
  // ────────────────────────────────────────────────────────────────────────────

  test('adds a new host and displays it in the list', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    await page.getByPlaceholder('Work Laptop').fill(TEST_HOST.name);
    await page.getByPlaceholder('100.x.x.x').fill(TEST_HOST.hostname);
    await page.getByPlaceholder('user').fill(TEST_HOST.username);
    await page.getByPlaceholder('22').fill(TEST_HOST.port);

    // Auth method is "key" by default — fill private key
    await page.getByPlaceholder(/BEGIN OPENSSH/).fill(TEST_HOST.privateKey);

    await page.getByRole('button', { name: /^Add Host$/ }).last().click();

    // Dialog closes and host appears in list
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(TEST_HOST.name)).toBeVisible();
    await expect(page.getByText(`${TEST_HOST.username}@${TEST_HOST.hostname}:${TEST_HOST.port}`)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Edit host
  // ────────────────────────────────────────────────────────────────────────────

  test('edits an existing host name', async ({ page }) => {
    // Assumes "adds a new host" ran first (sequential tests share DB state)
    await expect(page.getByText(TEST_HOST.name)).toBeVisible();

    await page.getByRole('button', { name: /Edit host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    const nameField = page.getByPlaceholder('Work Laptop');
    await nameField.clear();
    await nameField.fill('QA Test Host — Edited');

    await page.getByRole('button', { name: /Save Changes/i }).click();

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('QA Test Host — Edited')).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Auth method toggle
  // ────────────────────────────────────────────────────────────────────────────

  test('hides private key field when agent auth is selected', async ({ page }) => {
    await page.getByRole('button', { name: /Add Host/i }).first().click();
    await page.waitForSelector('[role="dialog"]');

    // Default: "key" → private key textarea visible
    await expect(page.getByPlaceholder(/BEGIN OPENSSH/)).toBeVisible();

    // Switch to "agent"
    await page.selectOption('select', 'agent');
    await expect(page.getByPlaceholder(/BEGIN OPENSSH/)).not.toBeVisible();

    // Switch back to "key"
    await page.selectOption('select', 'key');
    await expect(page.getByPlaceholder(/BEGIN OPENSSH/)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Delete host
  // ────────────────────────────────────────────────────────────────────────────

  test('deletes a host after confirming the dialog', async ({ page }) => {
    await expect(page.getByText('QA Test Host — Edited')).toBeVisible();

    // Accept the confirm() dialog
    page.on('dialog', (d) => d.accept());

    await page.getByRole('button', { name: /Delete host/i }).first().click();

    await expect(page.getByText('QA Test Host — Edited')).not.toBeVisible({ timeout: 5_000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // /hosts page reflects DB state
  // ────────────────────────────────────────────────────────────────────────────

  test('hosts page shows empty state when no hosts exist', async ({ page }) => {
    await page.goto('/hosts');
    await expect(page.getByText('No hosts configured')).toBeVisible();
    await expect(page.getByRole('link', { name: /Add your first host/i })).toBeVisible();
  });

  test('hosts page lists hosts added via settings', async ({ page }) => {
    // Add a host via API so we do not depend on prior test state
    await page.request.post('/api/hosts', {
      data: {
        name: 'API Test Host',
        hostname: '10.10.0.1',
        port: 22,
        username: 'ci',
        authMethod: 'agent',
      },
    });

    await page.goto('/hosts');
    await expect(page.getByText('API Test Host')).toBeVisible();
  });
});

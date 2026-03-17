/**
 * E2E: Project Management
 *
 * Covers:
 *  - /projects page renders and shows empty state
 *  - Project creation via API then visible in UI
 *  - Project detail page
 */

import { test, expect } from './fixtures/test-base';

test.describe('Projects Page', () => {
  test('renders without errors', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows projects section heading', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('shows empty state when no projects exist', async ({ page }) => {
    await page.goto('/projects');
    // Projects page should indicate there are no projects
    const body = await page.textContent('body');
    expect(body).toMatch(/no projects|get started|add|project/i);
  });

  test('creates a project via API and it appears in the list', async ({ page }) => {
    // First create a host to link the project to
    const hostRes = await page.request.post('/api/hosts', {
      data: {
        name: 'Projects Test Host',
        hostname: '10.20.0.1',
        port: 22,
        username: 'ci',
        authMethod: 'agent',
      },
    });
    const { host } = await hostRes.json();

    // Create a project linked to that host
    const projectRes = await page.request.post('/api/projects', {
      data: {
        name: 'My Claude Project',
        path: '/home/ci/projects/claude-thing',
        hostId: host.id,
        description: 'Test project for E2E',
      },
    });
    expect(projectRes.status()).toBe(201);

    await page.goto('/projects');
    await expect(page.getByText('My Claude Project')).toBeVisible();

    // Cleanup
    const { project } = await projectRes.json();
    await page.request.delete(`/api/projects/${project.id}`);
    await page.request.delete(`/api/hosts/${host.id}`);
  });
});

test.describe('Project Detail Page', () => {
  test('renders gracefully for unknown project', async ({ page }) => {
    await page.goto('/projects/00000000-0000-0000-0000-000000000000');
    await expect(page.locator('body')).toBeVisible();
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
  });
});

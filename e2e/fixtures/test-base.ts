import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Extended test fixture that includes an axe accessibility helper.
 */
export const test = base.extend<{
  /** Run axe on the current page and return violations */
  checkA11y: () => Promise<import('axe-core').Result[]>;
}>({
  checkA11y: async ({ page }, provide) => {
    const check = async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      return results.violations;
    };
    await provide(check);
  },
});

export { expect };

/**
 * Shared host fixture data used across test files.
 */
export const TEST_HOST = {
  name: 'QA Test Host',
  hostname: '127.0.0.1',
  port: '22',
  username: 'testuser',
  authMethod: 'key',
  privateKey: 'test-key-content',
};

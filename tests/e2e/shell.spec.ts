import { test, expect } from '@playwright/test';
test('all six placeholder routes are reachable and disclose foundation status', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/dashboard$/);
  await page.screenshot({
    path: test.info().outputPath('shell.png'),
    fullPage: true,
  });
  const routes = [
    'Employee dashboard',
    'Course catalog',
    'My learning',
    'Simulations',
    'Certificates',
    'Admin dashboard',
  ];
  for (const title of routes) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: title, exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('note')).toContainText(
      'Authentication is not configured',
    );
    await expect(
      page.getByRole('link', { name: title, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('keyboard users can skip navigation', async ({ page }) => {
  await page.goto('/dashboard');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});
test('admin remains a public placeholder without operational controls or API calls', async ({
  page,
}) => {
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/'))
      apiCalls.push(request.url());
  });
  await page.goto('/admin');
  await expect(
    page.getByText(
      'This page grants no administrative access and performs no actions.',
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.locator('form, input, select, textarea, button'),
  ).toHaveCount(0);
  expect(apiCalls).toEqual([]);
});

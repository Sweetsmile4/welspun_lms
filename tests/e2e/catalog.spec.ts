import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
});
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
test('unset runtime preview flag disables every development route without changing local configuration', async ({
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== 'desktop',
    'Server-only guard is identical across viewport sizes',
  );
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1');
  const result = await promisify(execFile)(
    process.execPath,
    ['scripts/check-preview-disabled.mjs', '--unset'],
    { cwd: process.cwd(), windowsHide: true, timeout: 25000 },
  );
  expect(result.stdout).toContain('all development workspaces disabled');
});
const status = (p: Page) => p.getByRole('status');
async function nav(p: Page, name: string) {
  const link = p
    .getByRole('navigation', { name: 'Development preview navigation' })
    .getByRole('link', { name, exact: true });
  const href = await link.getAttribute('href');
  await link.click();
  await expect(p).toHaveURL(new RegExp(`${href}$`));
}
async function perspective(p: Page, value: string) {
  await p.getByLabel('Visual perspective').selectOption(value);
}
async function approveAndPublish(p: Page) {
  await perspective(p, 'author');
  await p.getByRole('tab', { name: 'Review workflow', exact: true }).click();
  await p
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click();
  await expect(status(p)).toContainText('Review submission created');
  await p
    .getByRole('button', { name: 'Assign reviewer A', exact: true })
    .click();
  await expect(status(p)).toContainText('Reviewer assignment simulated');
  await perspective(p, 'reviewer');
  const form = p.getByRole('form', { name: 'Reviewer decision' });
  await form
    .getByLabel('Structured feedback message')
    .fill('Synthetic catalog walkthrough approval');
  await form.getByRole('button', { name: 'Record simulated decision' }).click();
  await expect(status(p)).toContainText('Exact-revision decision recorded');
  await perspective(p, 'publisher');
  await p.getByRole('button', { name: 'Publish simulated release' }).click();
  await expect(p.getByTestId('release-card').last()).toBeVisible();
}
async function create(p: Page) {
  await p.getByRole('button', { name: 'Create synthetic course' }).click();
  const f = p.getByRole('form', { name: 'Create course', exact: true });
  await f
    .getByLabel('Course title', { exact: true })
    .fill('New catalog course');
  await f.getByLabel('Course code').fill('SYN_DISCOVERY');
  await f.getByRole('button', { name: 'Create fixture' }).click();
  await expect(status(p)).toContainText('Synthetic course created');
  const m = p.getByRole('form', { name: 'Add module', exact: true });
  await m
    .getByLabel('New module title', { exact: true })
    .fill('Catalog module');
  await m.getByRole('button', { name: 'Add module', exact: true }).click();
  await expect(status(p)).toContainText('Draft saved');
  await p.getByRole('button', { name: 'Add lesson to Catalog module' }).click();
  const l = p.getByRole('form', { name: 'Add lesson', exact: true });
  await l.getByLabel('Lesson title', { exact: true }).fill('Catalog lesson');
  await l
    .getByLabel('Lesson content', { exact: true })
    .fill('Published lesson body');
  await l.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await expect(status(p)).toContainText('Draft saved');
}
test('create → approve → publish → catalog uses the same release and preserves in-app state', async ({
  page,
}) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
  });
  await page.goto('/development/courses');
  await create(page);
  await nav(page, 'Development Course Catalog');
  await expect(page.getByTestId('catalog-card')).toHaveCount(0);
  await expect(
    page.getByText('No visible published courses', { exact: true }),
  ).toBeVisible();
  await nav(page, 'Course workspace');
  await expect(
    page.getByRole('heading', { name: 'New catalog course', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Review workflow', exact: true }).click();
  await page
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click();
  await expect(status(page)).toContainText('Review submission created');
  await nav(page, 'Review workflows');
  await expect(
    page.getByRole('tabpanel', { name: 'Review workflow', exact: true }),
  ).toContainText('submitted');
  await page
    .getByRole('button', { name: 'Assign reviewer A', exact: true })
    .click();
  await expect(status(page)).toContainText('Reviewer assignment simulated');
  await perspective(page, 'reviewer');
  const f = page.getByRole('form', { name: 'Reviewer decision' });
  await f
    .getByLabel('Structured feedback message')
    .fill('Private synthetic review feedback');
  await f.getByRole('button', { name: 'Record simulated decision' }).click();
  await expect(status(page)).toContainText('Exact-revision decision recorded');
  await nav(page, 'Development Course Catalog');
  await expect(page.getByTestId('catalog-card')).toHaveCount(0);
  await nav(page, 'Review workflows');
  await perspective(page, 'publisher');
  await page.getByRole('button', { name: 'Publish simulated release' }).click();
  await expect(page.getByTestId('release-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'View in Development Catalog' }).click();
  await expect(page.getByTestId('catalog-detail')).toContainText(
    'New catalog course',
  );
  await expect(page.getByTestId('catalog-detail')).toContainText(
    'Published lesson body',
  );
  await expect(page.getByTestId('catalog-detail')).not.toContainText(
    'Private synthetic review feedback',
  );
  await page.getByRole('link', { name: 'Back to Development Catalog' }).click();
  await expect(page.getByTestId('catalog-card')).toHaveCount(1);
  await expect(page.getByTestId('catalog-card')).toContainText('SYN_DISCOVERY');
  await expect(page.getByTestId('catalog-card')).toContainText(
    '1 modules · 1 lessons',
  );
  expect(api).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('development-catalog.png'),
    fullPage: true,
  });
});
test('latest published snapshot updates catalog while edits/archive preserve release history', async ({
  page,
}) => {
  await page.goto('/development/courses');
  await approveAndPublish(page);
  await page.getByRole('tab', { name: 'Review workflow', exact: true }).click();
  await page.getByRole('button', { name: 'Publish simulated release' }).click();
  await expect(status(page)).toContainText('Simulated action blocked');
  await page.getByRole('tab', { name: 'Release history', exact: true }).click();
  await expect(page.getByTestId('release-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'View in Development Catalog' }).click();
  await expect(page.getByTestId('catalog-detail')).toContainText('Release 1');
  await nav(page, 'Course workspace');
  await perspective(page, 'author');
  await page.getByRole('tab', { name: 'Draft editor', exact: true }).click();
  const form = page.getByRole('form', { name: 'Edit course details' });
  await form
    .getByLabel('Course title', { exact: true })
    .fill('Second published title');
  await form.getByRole('button', { name: 'Save course details' }).click();
  await expect(status(page)).toContainText('Draft saved');
  await nav(page, 'Development Course Catalog');
  await expect(page.getByTestId('catalog-card')).toContainText(
    'Structured learning essentials',
  );
  await expect(page.getByTestId('catalog-card')).not.toContainText(
    'Second published title',
  );
  await nav(page, 'Course workspace');
  await approveAndPublish(page);
  await expect(page.getByTestId('release-card')).toHaveCount(2);
  await expect(page.getByTestId('release-card').first()).toContainText(
    'Structured learning essentials',
  );
  await nav(page, 'Development Course Catalog');
  await expect(page.getByTestId('catalog-card')).toHaveCount(1);
  await expect(page.getByTestId('catalog-card')).toContainText('Release 2');
  await expect(page.getByTestId('catalog-card')).toContainText(
    'Second published title',
  );
  await nav(page, 'Course workspace');
  await perspective(page, 'author');
  await page.getByRole('tab', { name: 'Draft editor', exact: true }).click();
  await page
    .getByRole('button', { name: 'Archive draft', exact: true })
    .click();
  await expect(
    page.getByText('Archived fixture preserved.', { exact: false }),
  ).toBeVisible();
  await nav(page, 'Development Course Catalog');
  await expect(page.getByTestId('catalog-card')).toContainText('Release 2');
  await page.getByRole('link', { name: 'Open published course' }).click();
  await expect(page.getByTestId('catalog-detail')).toContainText(
    'Second published title',
  );
});
test('catalog filters, shared reset and reload operate only on simulated published state', async ({
  page,
}) => {
  await page.goto('/development/courses');
  await approveAndPublish(page);
  await nav(page, 'Development Course Catalog');
  await page.getByLabel('Search title or code').fill('no matching title');
  await expect(page.getByTestId('catalog-card')).toHaveCount(0);
  await page.getByLabel('Search title or code').fill('SYN_TEXT');
  await expect(page.getByTestId('catalog-card')).toHaveCount(1);
  await page
    .getByLabel('Filter course scope')
    .selectOption('Synthetic organization');
  await expect(page.getByTestId('catalog-card')).toHaveCount(0);
  await page.getByLabel('Filter course scope').selectOption('all');
  await page.getByLabel('Synthetic learner visibility').selectOption('none');
  await expect(page.getByTestId('catalog-card')).toHaveCount(0);
  await page
    .getByLabel('Synthetic learner visibility')
    .selectOption('organization');
  await expect(page.getByTestId('catalog-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset fixtures' }).click();
  await expect(page.getByTestId('catalog-card')).toHaveCount(0);
  await nav(page, 'Course workspace');
  await page.getByRole('tab', { name: 'Release history', exact: true }).click();
  await expect(page.getByTestId('release-card')).toHaveCount(0);
  await approveAndPublish(page);
  await nav(page, 'Development Course Catalog');
  await expect(page.getByTestId('catalog-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId('catalog-card')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';

test('course management filters, inline validation and native archive confirmation preserve state', async ({
  page,
}) => {
  await page.goto('/development/courses');
  const count = page
    .locator('.preview-stat')
    .filter({ hasText: 'Active drafts' });
  const before = await count.locator('strong').innerText();
  await page.getByLabel('Search course drafts').fill('NO_MATCH');
  await expect(
    page.getByText('No matching course drafts.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Search course drafts').fill('SYN_TEXT');
  await expect(page.locator('.preview-course')).toHaveCount(1);
  await page.getByLabel('Search course drafts').fill('');
  const title = page
    .getByRole('form', { name: 'Edit course details' })
    .getByLabel('Course title', { exact: true });
  await title.fill('<bad>');
  await title.press('Tab');
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.preview-field-error')).toBeVisible();
  await title.fill('Structured learning essentials');
  await title.press('Tab');
  await expect(title).toHaveAttribute('aria-invalid', 'false');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Published snapshots remain available');
    await dialog.dismiss();
  });
  await page
    .getByRole('button', { name: 'Archive draft', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Save course details' }),
  ).toBeEnabled();
  await expect(count.locator('strong')).toHaveText(before);
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Archive draft', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Save course details' }),
  ).toBeDisabled();
  await expect(count.locator('strong')).toHaveText(String(Number(before) - 1));
  await page.getByLabel('Draft lifecycle').selectOption('archived');
  await expect(page.locator('.preview-course')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('course-management-refinement.png'),
    fullPage: true,
  });
});

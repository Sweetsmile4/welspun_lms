import { test, expect } from '@playwright/test';
test.skip(
  process.env.LMS_TEST_LIVE !== 'true',
  'Requires the owned disposable MongoDB test server',
);
test('learner accounts retain graded progress and certificates after signing out', async ({
  page,
}) => {
  const email = `learner-${Date.now()}-${test.info().project.name}@example.invalid`;
  await page.goto('/login');
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic learner');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('Synthetic learner password 123!');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'Welcome, Synthetic learner' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Browse courses', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Local verification course', exact: true })
    .locator('..')
    .getByRole('link', { name: 'View course', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Verification lesson', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('radio', { name: 'Choose the incorrect action', exact: true })
    .check();
  await page
    .getByRole('button', { name: 'Submit answer and save progress' })
    .click();
  await expect(page.getByRole('status')).toContainText('Try again');
  await page
    .getByRole('radio', { name: 'Verify the correct action', exact: true })
    .check();
  await page
    .getByRole('button', { name: 'Submit answer and save progress' })
    .click();
  await expect(page.getByRole('status')).toContainText('Course completed');
  await page.goto('/dashboard');
  await expect(page.getByText('100% complete', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('Synthetic learner password 123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('100% complete', { exact: true })).toBeVisible();
  await page
    .getByRole('link', { name: 'Certificates', exact: true })
    .last()
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Local verification course',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('Awarded to Synthetic learner')).toBeVisible();
  await page.goto('/admin');
  await expect(
    page.getByText('Administrator access is required', { exact: true }),
  ).toBeVisible();
});
test('administrators can publish courses and learners cannot access administration', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.invalid');
  await page
    .getByLabel('Password', { exact: true })
    .fill('Synthetic admin password 123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: 'Administration', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'LMS administration', exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Course title', { exact: true })
    .fill('Published local test course');
  await page.getByLabel('Course code', { exact: true }).fill('LOCAL-ADMIN');
  await page
    .getByLabel('Description', { exact: true })
    .fill('Owned local course');
  await page
    .getByLabel('First lesson title', { exact: true })
    .fill('Local lesson');
  await page
    .getByLabel('Lesson content', { exact: true })
    .fill('This is a synthetic local lesson for the integration check.');
  await page
    .getByRole('button', { name: 'Publish course', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Course published');
});

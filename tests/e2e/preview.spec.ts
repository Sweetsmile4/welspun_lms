import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
});
const status = (page: Page) => page.getByRole('status');
async function open(page: Page) {
  await page.goto('/development/courses');
  await expect(
    page.getByRole('heading', { name: 'Course workspace', exact: true }),
  ).toBeVisible();
}
async function perspective(page: Page, value: string) {
  await page.getByLabel('Visual perspective').selectOption(value);
}
async function review(page: Page) {
  await page.getByRole('tab', { name: 'Review workflow', exact: true }).click();
}
async function submit(page: Page) {
  await review(page);
  await page
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click();
  await expect(status(page)).toContainText('Review submission created');
  await page
    .getByRole('button', { name: 'Assign reviewer A', exact: true })
    .click();
  await expect(status(page)).toContainText('Reviewer assignment simulated');
}
async function decide(page: Page, choice = 'approve') {
  await perspective(page, 'reviewer');
  const form = page.getByRole('form', { name: 'Reviewer decision' });
  await form.getByLabel('Decision', { exact: true }).selectOption(choice);
  await form.getByLabel('Feedback category').selectOption('clarity');
  await form
    .getByLabel('Structured feedback message')
    .fill('Synthetic feedback only; not an industrial approval.');
  await form.getByRole('button', { name: 'Record simulated decision' }).click();
  await expect(status(page)).toContainText('Exact-revision decision recorded');
}

test('fixture listing is responsive, explicitly simulated and never calls a domain API', async ({
  page,
}) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
  });
  await open(page);
  await expect(
    page.getByText('UI fixture mode · simulated actions only', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Isolated integration: unavailable/),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Open draft Structured learning essentials',
    }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('course-workspace.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(api).toEqual([]);
  await page
    .getByRole('navigation', { name: 'Development preview navigation' })
    .getByRole('link', { name: 'Review workflows' })
    .click();
  await expect(
    page.getByRole('tab', { name: 'Review workflow', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
});

test('creates and edits synthetic content, validates forms and reorders modules and lessons', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Create synthetic course' }).click();
  const create = page.getByRole('form', { name: 'Create course', exact: true });
  await create
    .getByLabel('Course title', { exact: true })
    .fill('<script>bad</script>');
  await create.getByLabel('Course code').fill('SYN_NEW');
  await create.getByRole('button', { name: 'Create fixture' }).click();
  await expect(status(page)).toContainText('Unsupported text characters');
  await create
    .getByLabel('Course title', { exact: true })
    .fill('New synthetic course');
  await create.getByLabel('Course code').fill('SYN_TEXT');
  await create.getByRole('button', { name: 'Create fixture' }).click();
  await expect(status(page)).toContainText('Course code already exists');
  await create.getByLabel('Course code').fill('SYN_NEW');
  await create.getByRole('button', { name: 'Create fixture' }).click();
  await expect(status(page)).toContainText('Synthetic course created');
  const details = page.getByRole('form', { name: 'Edit course details' });
  await details
    .getByLabel('Course title', { exact: true })
    .fill('Edited synthetic course');
  await details.getByRole('button', { name: 'Save course details' }).click();
  await expect(status(page)).toContainText('Draft saved');
  const add = page.getByRole('form', { name: 'Add module', exact: true });
  await add.getByLabel('New module title', { exact: true }).fill('Module A');
  await add.getByRole('button', { name: 'Add module', exact: true }).click();
  await expect(status(page)).toContainText('Draft saved');
  await add.getByLabel('New module title', { exact: true }).fill('Module B');
  await add.getByRole('button', { name: 'Add module', exact: true }).click();
  await expect(page.getByTestId('module-card')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Move module Module B up', exact: true })
    .click();
  await expect(page.getByTestId('module-card').first()).toContainText(
    '1. Module B',
  );
  await page.getByRole('button', { name: 'Add lesson to Module B' }).click();
  let lesson = page.getByRole('form', { name: 'Add lesson', exact: true });
  await lesson.getByLabel('Lesson title', { exact: true }).fill('Lesson One');
  await lesson
    .getByLabel('Lesson content', { exact: true })
    .fill('Synthetic plain text.');
  await lesson.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await expect(status(page)).toContainText('Draft saved');
  await page.getByRole('button', { name: 'Add lesson to Module B' }).click();
  lesson = page.getByRole('form', { name: 'Add lesson', exact: true });
  await lesson.getByLabel('Lesson title', { exact: true }).fill('Lesson Two');
  await lesson.getByLabel('Content format').selectOption('structured');
  await lesson
    .getByLabel('Lesson content', { exact: true })
    .fill('[{"type":"paragraph"}]');
  await lesson.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await expect(status(page)).toContainText('Simulated action blocked');
  await lesson
    .getByLabel('Lesson content', { exact: true })
    .fill('[{"type":"paragraph","text":"Safe structured text."}]');
  await lesson.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await expect(page.getByTestId('lesson-card')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Move lesson Lesson Two up', exact: true })
    .click();
  await expect(page.getByTestId('lesson-card').first()).toContainText(
    '1. Lesson Two',
  );
});

test('walks through exact fixture approval, readiness and immutable release display', async ({
  page,
}) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
  });
  await open(page);
  await submit(page);
  await decide(page);
  await perspective(page, 'publisher');
  await page
    .getByRole('button', { name: 'Check readiness', exact: true })
    .click();
  await expect(page.getByTestId('readiness')).toContainText('Simulated ready');
  await expect(page.getByTestId('readiness-check')).toHaveCount(8);
  await expect(
    page.getByRole('list', { name: 'Publishing readiness checks' }),
  ).toContainText('Exact content digest');
  await expect(
    page.getByRole('list', { name: 'Publishing readiness checks' }),
  ).toContainText('Independent approvals');
  page.removeAllListeners('dialog');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('immutable simulated snapshot');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Publish simulated release' }).click();
  await expect(page.getByTestId('release-card')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Publish simulated release' }),
  ).toBeEnabled();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Publish simulated release' }).click();
  await expect(page.getByTestId('release-card')).toContainText(
    'Release 1 · Structured learning essentials',
  );
  await expect(page.getByTestId('release-card')).toContainText(
    'Synthetic reviewer A',
  );
  await expect(page.getByTestId('release-card')).toContainText('Clarity');
  await expect(page.getByTestId('release-card')).toContainText(
    'Synthetic feedback only',
  );
  await page.screenshot({
    path: test.info().outputPath('release-snapshot.png'),
    fullPage: true,
  });
  await perspective(page, 'author');
  await page.getByRole('tab', { name: 'Draft editor', exact: true }).click();
  const form = page.getByRole('form', { name: 'Edit course details' });
  await form
    .getByLabel('Course title', { exact: true })
    .fill('Changed after publication');
  await form.getByRole('button', { name: 'Save course details' }).click();
  await expect(status(page)).toContainText('Draft saved');
  await page.getByRole('tab', { name: 'Release history', exact: true }).click();
  await expect(page.getByTestId('release-card')).toContainText(
    'Release 1 · Structured learning essentials',
  );
  await expect(page.getByTestId('release-card')).not.toContainText(
    'Changed after publication',
  );
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(api).toEqual([]);
});

test('supports keyboard tab navigation and blocks incomplete submissions', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('tab', { name: 'Draft editor', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Review workflow', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Draft editor', exact: true }).click();
  await page.getByRole('button', { name: 'Create synthetic course' }).click();
  const create = page.getByRole('form', { name: 'Create course', exact: true });
  await create
    .getByLabel('Course title', { exact: true })
    .fill('Incomplete synthetic course');
  await create.getByLabel('Course code').fill('SYN_EMPTY');
  await create.getByRole('button', { name: 'Create fixture' }).click();
  await expect(status(page)).toContainText('Synthetic course created');
  await review(page);
  await page
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click();
  await expect(status(page)).toContainText(
    'Every draft must have a module and a lesson',
  );
});

test('shows unassigned reviewer denial and preserves changes-requested feedback', async ({
  page,
}) => {
  await open(page);
  await submit(page);
  await perspective(page, 'reviewer');
  await page
    .getByLabel('Reviewer scenario')
    .selectOption('Unassigned reviewer');
  const form = page.getByRole('form', { name: 'Reviewer decision' });
  await form
    .getByLabel('Structured feedback message')
    .fill('Synthetic request');
  await form.getByRole('button', { name: 'Record simulated decision' }).click();
  await expect(status(page)).toContainText(
    'Only an assigned synthetic reviewer',
  );
  await page
    .getByLabel('Reviewer scenario')
    .selectOption('Synthetic reviewer A');
  await decide(page, 'changesRequested');
  await expect(
    page.getByRole('tabpanel', { name: 'Review workflow', exact: true }),
  ).toContainText('changesRequested');
  await expect(
    page.getByRole('tabpanel', { name: 'Review workflow', exact: true }),
  ).toContainText('Clarity');
  await perspective(page, 'publisher');
  await page
    .getByRole('button', { name: 'Check readiness', exact: true })
    .click();
  await expect(page.getByTestId('readiness')).toContainText('Not ready');
  await expect(
    page.getByRole('list', { name: 'Publishing readiness checks' }),
  ).toContainText('Independent approvals');
});

test('blocks stale approvals, demonstrates revision conflict and archives drafts', async ({
  page,
}) => {
  await open(page);
  await submit(page);
  await decide(page);
  await perspective(page, 'author');
  await page.getByRole('tab', { name: 'Draft editor', exact: true }).click();
  await page.getByRole('button', { name: 'Demo revision conflict' }).click();
  await expect(status(page)).toContainText('Revision conflict demonstration');
  await review(page);
  await perspective(page, 'publisher');
  await page.getByRole('button', { name: 'Publish simulated release' }).click();
  await expect(status(page)).toContainText('Exact draft revision');
  await expect(page.getByTestId('readiness')).toContainText('Not ready');
  await perspective(page, 'author');
  await page.getByRole('tab', { name: 'Draft editor', exact: true }).click();
  await page
    .getByRole('button', { name: 'Archive draft', exact: true })
    .click();
  await expect(
    page.getByText('Archived fixture preserved.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save course details' }),
  ).toBeDisabled();
  await review(page);
  await expect(
    page.getByRole('button', { name: 'Submit for review', exact: true }),
  ).toBeDisabled();
});

test('uses explicit synthetic approval count, supports two reviewers and resets all fixture evidence', async ({
  page,
}) => {
  await open(page);
  await review(page);
  await page.getByLabel('Synthetic required approvals').selectOption('2');
  await submit(page);
  await page
    .getByRole('button', { name: 'Assign reviewer B', exact: true })
    .click();
  await expect(status(page)).toContainText('Reviewer assignment simulated');
  await decide(page);
  await perspective(page, 'publisher');
  await page
    .getByRole('button', { name: 'Check readiness', exact: true })
    .click();
  await expect(page.getByTestId('readiness')).toContainText('Not ready');
  await perspective(page, 'reviewer');
  await page
    .getByLabel('Reviewer scenario')
    .selectOption('Synthetic reviewer B');
  await decide(page);
  await perspective(page, 'publisher');
  await page.getByRole('button', { name: 'Publish simulated release' }).click();
  await expect(page.getByTestId('release-card')).toContainText(
    'Synthetic reviewer B',
  );
  await page.getByRole('button', { name: 'Reset fixtures' }).click();
  await expect(status(page)).toContainText('All synthetic data reset');
  await page.getByRole('tab', { name: 'Release history', exact: true }).click();
  await expect(page.getByTestId('release-card')).toHaveCount(0);
});

test('unauthorized perspective exposes no domain controls and tablet layout fits', async ({
  page,
}) => {
  await open(page);
  await perspective(page, 'unauthorized');
  await expect(
    page.getByRole('heading', { name: 'Access unavailable in this scenario' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create synthetic course' }),
  ).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);
  if (test.info().project.name === 'desktop')
    await page.setViewportSize({ width: 820, height: 1100 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

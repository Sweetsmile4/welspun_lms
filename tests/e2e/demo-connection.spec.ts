import { test, expect } from '@playwright/test';
test('demo portal clearly reports its actual backend connection', async ({
  page,
  request,
}) => {
  const result = await request.get('/api/backend/demo');
  if (process.env.LMS_TEST_CONNECTED_DEMO === 'true') {
    expect(result.status()).toBe(200);
    const body = await result.json();
    expect(body.connection).toBe('connected');
    expect(body.data.courses).toHaveLength(5);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('demo-connection')).toContainText(
      'Demo API connected',
    );
    await expect(page.getByTestId('demo-connection')).toContainText(
      'progress stays on this device',
    );
    for (const course of body.data.courses)
      await expect(
        page.getByText(course.title, { exact: true }).first(),
      ).toBeVisible();
  } else {
    await page.goto('/client-demo');
    await expect(page.getByTestId('demo-connection')).toContainText(
      'Local demo mode',
    );
  }
  expect(
    (
      await request.get('/api/backend/demo?target=https://untrusted.example')
    ).status(),
  ).toBe(422);
  expect(
    (
      await request.post('/api/backend/demo', { data: { roles: ['admin'] } })
    ).status(),
  ).toBe(405);
});

test('dashboard aliases share their layout, assignments and browser progress', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'My learning', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }),
  ).toHaveCount(0);
  await expect(page.getByTestId('demo-connection')).not.toContainText(
    'Checking',
  );
  const heading = await page
    .getByRole('heading', { name: 'My learning', exact: true })
    .textContent();
  await page.evaluate(() => {
    const key = 'welspun_client_demo_state_v1';
    const state = JSON.parse(localStorage.getItem(key)!);
    state.progress['pipe-process-101'] = {
      courseId: 'pipe-process-101',
      status: 'completed',
      currentSceneIndex: 5,
      completedSceneIds: [],
      answeredQuestions: {},
      completedAt: '2026-11-18T00:00:00.000Z',
    };
    localStorage.setItem(key, JSON.stringify(state));
  });
  for (const path of ['/client-demo/dashboard', '/dashboard']) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'My learning', exact: true }),
    ).toHaveText(heading!);
    await expect(page.getByTestId('demo-connection')).not.toContainText(
      'Checking',
    );
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('welspun_client_demo_state_v1')!)
            .progress['pipe-process-101'].status,
      ),
    ).toBe('completed');
  }
});

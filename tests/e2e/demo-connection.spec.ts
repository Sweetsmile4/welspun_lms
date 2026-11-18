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
    expect(body.data.courses).toHaveLength(3);
    await page.goto('/client-demo/dashboard');
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

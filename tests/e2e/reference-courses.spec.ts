import { test, expect } from '@playwright/test';
import { DEMO_COURSES } from '../../frontend/src/lib/client-demo/course-data';

test('all five courses are assigned and reference chapters, labs and source PDFs work', async ({
  page,
  request,
}) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'My learning', exact: true }),
  ).toBeVisible();
  for (const course of DEMO_COURSES)
    await expect(
      page.getByText(course.title, { exact: true }).first(),
    ).toBeVisible();
  for (const id of ['coat', 'vi']) {
    const course = DEMO_COURSES.find((course) => course.id === id)!;
    await page.goto(`/client-demo/course/${id}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', {
        name: `Scene 1: ${course.scenes[0]!.title}`,
        exact: true,
      }),
    ).toBeVisible();
    const iframe = page.locator('iframe');
    await expect(iframe).toHaveAttribute(
      'src',
      `/learning/welspun-reference.html#${course.scenes[0]!.referenceRoute}`,
    );
    const activity = page.frameLocator('iframe');
    await expect(activity.locator('body')).toContainText(
      course.scenes[0]!.title,
    );
    await expect(
      page.getByRole('button', { name: /Next Scene/i }),
    ).toBeDisabled();
    await page
      .getByRole('radio', {
        name: course.scenes[0]!.quiz.options.find((option) => option.isCorrect)!
          .text,
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: /Next Scene/i }).click();
    await expect(
      page.getByRole('heading', {
        name: `Scene 2: ${course.scenes[1]!.title}`,
        exact: true,
      }),
    ).toBeVisible();
    const pdf = await request.get(course.sourcePdf!);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
  }
  await page.goto('/client-demo/labs');
  await expect(
    page.getByRole('heading', { name: 'Simulation lab', exact: true }),
  ).toBeVisible();
  await expect(page.frameLocator('iframe').locator('body')).toContainText(
    'Factory twin',
  );
  await page.frameLocator('iframe').locator('[data-go="lab-factory"]').click();
  await expect(
    page
      .frameLocator('iframe')
      .getByRole('heading', { name: 'Factory twin', exact: true }),
  ).toBeVisible();
  await page.goto('/client-demo/hr');
  await expect(
    page.getByRole('heading', {
      name: 'Employee progress tracker',
      exact: true,
    }),
  ).toBeVisible();
});

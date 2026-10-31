import { test, expect } from '@playwright/test';

test.describe('Client Demonstration Portal — End-to-End Walkthrough', () => {
  test('employee can sign in, explore course, switch explanation modes, use interactive visualizer, and complete course', async ({
    page,
  }) => {
    // 1. Visit Demo Login Page
    await page.goto('/client-demo');
    await expect(page).toHaveURL(/client-demo$/);

    // Verify Disclaimer and Brand Title
    await expect(
      page.getByRole('heading', { name: 'WELSPUN CORP', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Demonstration Environment · Fictional Employee Profile'),
    ).toBeVisible();
    await expect(
      page.getByText('Rajesh Sharma', { exact: true }),
    ).toBeVisible();

    // 2. Click Enter Demonstration
    await page
      .getByRole('button', { name: /Enter Demonstration Portal/i })
      .click();
    await expect(page).toHaveURL(/client-demo\/dashboard$/);

    // Verify Employee Dashboard
    await expect(
      page.getByRole('heading', { name: /Welcome back, Rajesh Sharma/i }),
    ).toBeVisible();
    await expect(
      page.getByText('From Steel Coil to Finished Pipe'),
    ).toBeVisible();
    await expect(page.getByText('Shop Floor Safety Essentials')).toBeVisible();
    await expect(page.getByText('Quality Inspection Basics')).toBeVisible();

    // 3. Open Course 1: From Steel Coil to Finished Pipe
    await page
      .getByRole('link', { name: /Start Course/i })
      .first()
      .click();
    await expect(page).toHaveURL(/client-demo\/course\/pipe-process-101$/);

    // Verify Scene 1: Incoming Coil Inspection
    await expect(
      page.getByRole('heading', {
        name: /Scene 1: Incoming Coil Inspection & Traceability/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Shop Floor Manufacturing Situation'),
    ).toBeVisible();

    // 4. Test Multi-Perspective Mode Switching
    // Switch to ELI5
    await page.getByRole('tab', { name: /ELI5/i }).click();
    await expect(
      page.getByText(/Checking the Flour Before Baking/i),
    ).toBeVisible();

    // Switch to Engineer
    await page.getByRole('tab', { name: /Engineer/i }).click();
    await expect(
      page.getByText(/Governing Technical Parameters/i),
    ).toBeVisible();
    await expect(page.getByText('API Spec 5L X70M')).toBeVisible();

    // Switch back to Operator
    await page.getByRole('tab', { name: /Operator/i }).click();
    await expect(
      page.getByText(/Station 1 Receiving Checklist/i),
    ).toBeVisible();

    // 5. Answer Scenario Decision Question
    const correctOption = page.getByRole('radio', {
      name: /Immediately halt loading, affix a physical Yellow Hold tag/i,
    });
    await expect(correctOption).toBeVisible();
    await correctOption.click();

    // Verify feedback appears
    await expect(
      page.getByText('Correct Decision', { exact: false }),
    ).toBeVisible();

    // 6. Navigate to Scene 2 and Scene 3
    await page.getByRole('button', { name: /Next Scene/i }).click();
    await expect(
      page.getByRole('heading', { name: /Scene 2: Strip Preparation/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Next Scene/i }).click();
    await expect(
      page.getByRole('heading', {
        name: /Scene 3: Helical Forming & Three-Roll Geometry/i,
      }),
    ).toBeVisible();

    // 7. Verify Interactive Helical Forming Visualizer on Scene 3
    await expect(
      page.getByText(
        'Interactive Educational Tool: Helical Forming Angle Explorer',
      ),
    ).toBeVisible();
    await expect(page.getByText(/Kinematic relationship:/i)).toBeVisible();

    // Click Preset for 36" Gas Transmission
    await page.getByRole('button', { name: /36" Gas Transmission/i }).click();
    await expect(page.getByText('36" (914.4 mm)')).toBeVisible();
    await expect(page.getByText('Forming Angle (α):')).toBeVisible();

    // 8. Jump to Scene 6 (Last Scene) via jump pills
    await page.getByRole('button', { name: /Jump to Scene 6/i }).click();
    await expect(
      page.getByRole('heading', { name: /Scene 6: Release & Dispatch/i }),
    ).toBeVisible();

    // Complete course
    const completeButton = page.getByRole('button', {
      name: /Complete Course & Finish/i,
    });
    await expect(completeButton).toBeVisible();
    await completeButton.click();

    // 9. Returned to Dashboard with Completion Notice
    await expect(page).toHaveURL(
      /client-demo\/dashboard\?completed=pipe-process-101/,
    );
    await expect(
      page.getByText(/Course Completed Successfully!/i),
    ).toBeVisible();

    // 10. Test Reset Demo Action
    await page.getByRole('button', { name: /Reset Demo/i }).click();
    await expect(page.getByText('Reset Demo Progress?')).toBeVisible();
    await page.getByRole('button', { name: /Confirm Reset/i }).click();

    // Verify reset notification
    await expect(
      page.getByText('Demo state reset successfully!'),
    ).toBeVisible();
  });

  test('foundation routes remain unaffected and isolated from demo', async ({
    page,
  }) => {
    // Check normal foundation dashboard
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Employee dashboard' }),
    ).toBeVisible();
    await expect(page.getByRole('note')).toContainText(
      'Authentication is not configured',
    );
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeVisible();
  });
});

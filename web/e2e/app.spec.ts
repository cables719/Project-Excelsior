import { test, expect, Page, BrowserContext } from '@playwright/test';
import { MOCK_DATA_RESPONSE } from './fixtures/mock-data';

/**
 * Intercept all API routes with mock data so we NEVER touch the real Google Sheet.
 */
async function mockAllAPIs(page: Page) {
    await page.route('**/api/data**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_DATA_RESPONSE),
        });
    });

    await page.route('**/api/log', async (route) => {
        const body = route.request().postDataJSON();
        await page.evaluate((loggedData: unknown) => {
            (window as any).__TEST_LOGGED_DATA__ = (window as any).__TEST_LOGGED_DATA__ || [];
            (window as any).__TEST_LOGGED_DATA__.push(loggedData);
        }, body);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/chat', async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/plain', body: 'Great work!' });
    });

    await page.route('**/api/profile**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/auth/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/session')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: { name: 'Test User', email: 'test@example.com', image: null },
                    expires: new Date(Date.now() + 86400000).toISOString(),
                }),
            });
        } else {
            await route.fulfill({ status: 200, body: '{}' });
        }
    });
}

/** Navigate to the Exercise tab on the dashboard */
async function goToExerciseTab(page: Page) {
    const exerciseTab = page.getByText('EXERCISE', { exact: true }).or(page.getByText('Exercise', { exact: true }));
    await exerciseTab.click();
    await page.waitForTimeout(300);
}

// ============================================================================
// ACTIVE WORKOUT FLOW
// ============================================================================
test.describe('Active Workout Flow', () => {
    test.beforeEach(async ({ page, context }) => {
        await mockAllAPIs(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('can open the Active Workout modal from Exercise tab', async ({ page }) => {
        await goToExerciseTab(page);

        const startBtn = page.getByText('Start Active Workout');
        await expect(startBtn).toBeVisible({ timeout: 5000 });
        await startBtn.click();

        await expect(page.getByText('Workout Plan')).toBeVisible({ timeout: 5000 });
    });

    test('preview shows correct day and exercises', async ({ page }) => {
        await goToExerciseTab(page);
        await page.getByText('Start Active Workout').click();
        await expect(page.getByText('Workout Plan')).toBeVisible({ timeout: 5000 });

        // Should show Day name and have exercise cards with "lbs"
        await expect(page.getByText(/day/i).first()).toBeVisible();
        await expect(page.getByText(/lbs/i).first()).toBeVisible();

        // START WORKOUT button should be visible
        await expect(page.getByText('START WORKOUT')).toBeVisible();
    });

    test('full workout flow: start, complete all sets, reach summary', async ({ page }) => {
        test.setTimeout(60000); // This test clicks through many sets

        await goToExerciseTab(page);
        await page.getByText('Start Active Workout').click();
        await page.getByText('START WORKOUT').click();

        // Should see COMPLETED button
        await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 3000 });

        // Click through all sets
        let safety = 60;
        while (safety > 0) {
            if (await page.getByText('Workout Complete!').isVisible().catch(() => false)) break;

            if (await page.getByText('Skip Rest').isVisible().catch(() => false)) {
                await page.getByText('Skip Rest').click();
                await page.waitForTimeout(150);
                continue;
            }

            if (await page.getByText('COMPLETED').isVisible().catch(() => false)) {
                await page.getByText('COMPLETED').click();
                await page.waitForTimeout(150);
            }
            safety--;
        }

        await expect(page.getByText('Workout Complete!')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Save to Logbook')).toBeVisible();
    });

    test('failing a set shows rep picker and records failure', async ({ page }) => {
        test.setTimeout(60000);

        await goToExerciseTab(page);
        await page.getByText('Start Active Workout').click();
        await page.getByText('START WORKOUT').click();

        await expect(page.getByText('Failed')).toBeVisible({ timeout: 3000 });
        await page.getByText('Failed').click();

        // Rep picker appears
        await expect(page.getByText('How many reps completed?')).toBeVisible();
        // Pick 2 reps
        await page.getByRole('button', { name: '2', exact: true }).click();

        // Finish remaining sets
        let safety = 60;
        while (safety > 0) {
            if (await page.getByText('Workout Complete!').isVisible().catch(() => false)) break;
            if (await page.getByText('Skip Rest').isVisible().catch(() => false)) {
                await page.getByText('Skip Rest').click();
                await page.waitForTimeout(150);
                continue;
            }
            if (await page.getByText('COMPLETED').isVisible().catch(() => false)) {
                await page.getByText('COMPLETED').click();
                await page.waitForTimeout(150);
            }
            safety--;
        }

        // Summary should show the failure
        await expect(page.getByText('Workout Complete!')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('(Fail)')).toBeVisible();
    });

    test('save to logbook sends data to /api/log', async ({ page }) => {
        test.setTimeout(60000);

        await goToExerciseTab(page);
        await page.getByText('Start Active Workout').click();
        await page.getByText('START WORKOUT').click();

        let safety = 60;
        while (safety > 0) {
            if (await page.getByText('Workout Complete!').isVisible().catch(() => false)) break;
            if (await page.getByText('Skip Rest').isVisible().catch(() => false)) {
                await page.getByText('Skip Rest').click();
                await page.waitForTimeout(150);
                continue;
            }
            if (await page.getByText('COMPLETED').isVisible().catch(() => false)) {
                await page.getByText('COMPLETED').click();
                await page.waitForTimeout(150);
            }
            safety--;
        }

        await page.getByText('Save to Logbook').click();
        await page.waitForTimeout(1000);

        const loggedData = await page.evaluate(() => (window as any).__TEST_LOGGED_DATA__);
        expect(loggedData).toBeDefined();
        expect(loggedData.length).toBeGreaterThan(0);

        for (const entry of loggedData) {
            expect(entry.type).toBe('lift');
            expect(entry.data.exercise).toBeTruthy();
            expect(entry.data.weight).toBeTruthy();
            expect(entry.data.date).toBeTruthy();
        }
    });

    test('discard workout closes modal without saving', async ({ page }) => {
        await goToExerciseTab(page);
        await page.getByText('Start Active Workout').click();
        await page.getByText('START WORKOUT').click();

        await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 3000 });
        await page.getByText('COMPLETED').click();

        if (await page.getByText('Skip Rest').isVisible().catch(() => false)) {
            await page.getByText('Skip Rest').click();
        }

        // End early
        await page.getByText('END EARLY').click();
        await expect(page.getByText(/discard/i)).toBeVisible({ timeout: 3000 });
        await page.getByText(/discard/i).click();

        // Modal gone
        await expect(page.getByText('Workout Plan')).not.toBeVisible({ timeout: 3000 });

        const loggedData = await page.evaluate(() => (window as any).__TEST_LOGGED_DATA__);
        expect(loggedData || []).toHaveLength(0);
    });
});

// ============================================================================
// DASHBOARD RENDERING
// ============================================================================
test.describe('Dashboard Rendering', () => {
    test.beforeEach(async ({ page, context }) => {
        await mockAllAPIs(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('dashboard renders biometrics section', async ({ page }) => {
        // The BIOMETRICS header should be visible
        await expect(page.getByText('BIOMETRICS')).toBeVisible({ timeout: 5000 });
        // Weight and Body Fat stat cards should exist
        await expect(page.getByText('Weight Trend (Lbs)')).toBeVisible();
    });

    test('exercise tab shows strength metrics', async ({ page }) => {
        await goToExerciseTab(page);
        // Should show Trophy Room heading
        await expect(page.getByRole('heading', { name: /trophy room/i })).toBeVisible({ timeout: 5000 });
    });

    test('food tab renders energy breakdown', async ({ page }) => {
        const foodTab = page.getByText('FOOD', { exact: true }).or(page.getByText('Food', { exact: true }));
        await foodTab.click();
        await page.waitForTimeout(300);

        // Should show Daily Budget section
        await expect(page.getByText('Daily Budget')).toBeVisible({ timeout: 5000 });
    });
});

// ============================================================================
// DATA ENTRY FORMS
// ============================================================================
test.describe('Data Entry Forms', () => {
    test.beforeEach(async ({ page, context }) => {
        await mockAllAPIs(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('log body stats button opens modal', async ({ page }) => {
        await expect(page.getByText('Log Body Stats')).toBeVisible({ timeout: 5000 });
        await page.getByText('Log Body Stats').click();
        await page.waitForTimeout(500);
        // A modal/form should appear — look for form elements
        await expect(page.getByText(/weight/i).first()).toBeVisible({ timeout: 3000 });
    });

    test('exercise tab has log buttons', async ({ page }) => {
        await goToExerciseTab(page);
        await expect(page.getByText('Log Past Lift')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Log Cardio')).toBeVisible();
    });
});

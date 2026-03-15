import { test, expect } from '@playwright/test';
import { MOCK_DATA_RESPONSE } from './fixtures/mock-data';

test.describe('Sunday Fix Verification', () => {
    test('Sunday report fires exactly once even with concurrent data context triggers', async ({ page, context }) => {
        // 1. Mock Date to March 15, 2026 (Sunday)
        // We override Date.now and the Date constructor to ensure the app thinks it is Sunday.
        await context.addInitScript(() => {
            const fixedDate = new Date('2026-03-15T12:00:00Z');
            const OriginalDate = Date;
            
            // @ts-ignore
            window.Date = function (...args) {
                if (args.length === 0) return new OriginalDate(fixedDate.getTime());
                return new (OriginalDate as any)(...args);
            };
            // Copy static methods
            window.Date.now = () => fixedDate.getTime();
            window.Date.parse = OriginalDate.parse;
            window.Date.UTC = OriginalDate.UTC;
            // @ts-ignore
            window.Date.prototype = OriginalDate.prototype;
        });

        let chatCount = 0;
        
        // 2. Intercept API Calls
        await page.route('**/api/data**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_DATA_RESPONSE),
            });
        });

        await page.route('**/api/auth/session', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: { name: 'Test User', email: 'test@example.com' },
                    expires: '2026-03-16T12:00:00Z'
                }),
            });
        });

        await page.route('**/api/chat', async (route) => {
            const body = route.request().postDataJSON();
            if (body.messages?.[0]?.content?.includes('SYSTEM_EVENT: WEEKLY_REPORT_TRIGGER')) {
                chatCount++;
            }
            await route.fulfill({ 
                status: 200, 
                contentType: 'application/json', 
                body: JSON.stringify({ role: 'assistant', content: 'Mock Sunday Report' }) 
            });
        });

        await page.route('**/api/profile**', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        });

        // 3. Load the app
        await page.goto('/');
        
        // 4. Wait for potential multiple fires and animations
        await page.waitForTimeout(3000);

        // 5. Assert that the trigger only fired ONCE
        // Before the fix, this would likely fire twice due to the useEffect dependencies 
        // and multiple renders during data context initialization.
        expect(chatCount).toBe(1);
    });
});

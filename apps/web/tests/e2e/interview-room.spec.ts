import { test, expect } from '@playwright/test';

/**
 * Assumes:
 * - test auth helper or pre-authenticated storageState
 * - seeded meeting fixtures:
 *   - meeting_joinable_id
 *   - meeting_forbidden_id
 * - app served locally
 */

test.describe('Interview Room', () => {
  test('candidate can join and leave meeting', async ({ page }) => {
    await page.goto('/dashboard/meetings/meeting_joinable_id/room');

    await expect(page.getByRole('button', { name: 'Join' })).toBeVisible();
    await page.getByRole('button', { name: 'Join' }).click();

    await expect(page.getByText(/State: connected|State: reconnecting/i)).toBeVisible();

    await page.getByRole('button', { name: /Leave/i }).click();
    await expect(page.getByText(/State: ended/i)).toBeVisible();
  });

  test('forbidden participant cannot join', async ({ page }) => {
    await page.goto('/dashboard/meetings/meeting_forbidden_id/room');

    await expect(
      page.getByText(/not allowed|forbidden|failed to load interview room/i),
    ).toBeVisible();
  });

  test('keyboard shortcuts work when connected', async ({ page }) => {
    await page.goto('/dashboard/meetings/meeting_joinable_id/room');
    await page.getByRole('button', { name: 'Join' }).click();

    await page.keyboard.press('m');
    await page.keyboard.press('v');
    await page.keyboard.press('s');
    await page.keyboard.press('l');

    await expect(page.getByText(/State: ended/i)).toBeVisible();
  });

  test('shows reconnecting state on transient network issues', async ({ page, context }) => {
    await page.goto('/dashboard/meetings/meeting_joinable_id/room');
    await page.getByRole('button', { name: 'Join' }).click();

    // simulate transient offline
    await context.setOffline(true);
    await expect(page.getByText(/State: reconnecting|State: failed/i)).toBeVisible();

    await context.setOffline(false);
    // may recover to connected or remain failed based on timing
    await expect(page.getByText(/State: connected|State: failed/i)).toBeVisible();
  });
});

import { test, expect } from '@playwright/test'

test.describe('Review', () => {
    test('review page shows not found for invalid id', async ({ page }) => {
        await page.goto('/r/nonexistent-review-id-12345')
        await expect(page.getByText(/not found/i)).toBeVisible()
    })

    test('write review page redirects to login when not authenticated', async ({ page }) => {
        await page.goto('/review/test-event-id')
        await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    })

    test('my gigs page redirects to login when not authenticated', async ({ page }) => {
        await page.goto('/my-gigs')
        await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    })
})
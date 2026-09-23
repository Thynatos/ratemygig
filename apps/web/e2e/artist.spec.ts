import { test, expect } from '@playwright/test'

test.describe('Artist Detail', () => {
    test('navigates to artists page from nav', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('link', { name: /artists/i }).first().click()
        await expect(page).toHaveURL(/\/artists/)
        await expect(page.getByRole('heading', { name: /artists/i })).toBeVisible()
    })

    test('artists page shows artist cards or empty state', async ({ page }) => {
        await page.goto('/artists')
        const artistRows = page.locator('a[href^="/artists/"]').first()
        const emptyState = page.getByRole('heading', { name: /no artist/i })
        await expect(artistRows.or(emptyState)).toBeVisible({ timeout: 10000 })
    })

    test('artist detail page shows not found for invalid id', async ({ page }) => {
        await page.goto('/artists/nonexistent-id-12345')
        await expect(page.getByRole('heading', { name: /No such artist/i })).toBeVisible({ timeout: 10000 })
    })

    test('top artists leaderboard page renders', async ({ page }) => {
        await page.goto('/artists/top')
        await expect(page.getByRole('heading', { name: /top rated artists/i })).toBeVisible()
    })
})
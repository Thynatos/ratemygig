import { test, expect } from '@playwright/test'

test.describe('Venue Detail', () => {
    test('navigates to venues page from nav', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('link', { name: /venues/i }).first().click()
        await expect(page).toHaveURL(/\/venues/)
        await expect(page.getByRole('heading', { name: /venues/i })).toBeVisible()
    })

    test('venues page shows venue cards or empty state', async ({ page }) => {
        await page.goto('/venues')
        const venueCards = page.getByRole('link', { href: /\/venues\// })
        const emptyState = page.getByText(/no venues found/i)
        await expect(venueCards.or(emptyState)).toBeVisible({ timeout: 10000 })
    })

    test('venue detail page shows not found for invalid id', async ({ page }) => {
        await page.goto('/venues/nonexistent-id-12345')
        await expect(page.getByText(/not found/i)).toBeVisible()
    })

    test('top venues leaderboard page renders', async ({ page }) => {
        await page.goto('/venues/top')
        await expect(page.getByRole('heading', { name: /top rated venues/i })).toBeVisible()
    })
})
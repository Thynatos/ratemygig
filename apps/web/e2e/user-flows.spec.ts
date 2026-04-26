import { test, expect } from '@playwright/test'

test.describe('User Flows', () => {
    test('navigates from discover to event detail', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: /Discover/i })).toBeVisible()

        // Wait for events to load
        const eventLink = page.locator('a[href^="/events/"]').first()
        await expect(eventLink).toBeVisible({ timeout: 10000 })

        // Click first event
        await eventLink.click()
        await expect(page).toHaveURL(/\/events\//)

        // Event detail should show event name heading
        await expect(page.locator('h1, h2, h3').first()).toBeVisible()
    })

    test('navigates from venues to venue detail', async ({ page }) => {
        await page.goto('/venues')
        await expect(page.getByRole('heading', { name: /venues/i })).toBeVisible()

        // Wait for venue cards or empty state
        const venueLink = page.locator('a[href^="/venues/"]').first()
        const emptyState = page.getByText(/no venues found/i)
        await expect(venueLink.or(emptyState)).toBeVisible({ timeout: 10000 })

        // If venues exist, navigate to first one
        if (await venueLink.isVisible()) {
            await venueLink.click()
            await expect(page).toHaveURL(/\/venues\//)
            await expect(page.locator('h1, h2').first()).toBeVisible()
        }
    })

    test('navigates from artists to artist detail', async ({ page }) => {
        await page.goto('/artists')
        await expect(page.getByRole('heading', { name: /artists/i })).toBeVisible()

        const artistLink = page.locator('a[href^="/artists/"]').first()
        const emptyState = page.getByText(/no artists found/i)
        await expect(artistLink.or(emptyState)).toBeVisible({ timeout: 10000 })

        if (await artistLink.isVisible()) {
            await artistLink.click()
            await expect(page).toHaveURL(/\/artists\//)
            await expect(page.locator('h1, h2').first()).toBeVisible()
        }
    })

    test('navigates between top venues and venues list', async ({ page }) => {
        await page.goto('/venues/top')
        await expect(page.getByRole('heading', { name: /top rated venues/i })).toBeVisible()

        // Click back to venues list
        await page.getByRole('link', { name: /venues/i }).first().click()
        await expect(page).toHaveURL(/\/venues\/?$/)
    })

    test('navigates between top artists and artists list', async ({ page }) => {
        await page.goto('/artists/top')
        await expect(page.getByRole('heading', { name: /top rated artists/i })).toBeVisible()

        await page.getByRole('link', { name: /artists/i }).first().click()
        await expect(page).toHaveURL(/\/artists\/?$/)
    })

    test('footer links navigate correctly', async ({ page }) => {
        await page.goto('/')

        await page.getByRole('link', { name: /about/i }).click()
        await expect(page).toHaveURL(/\/about/)
        await expect(page.getByRole('heading', { name: /about/i })).toBeVisible()

        await page.getByRole('link', { name: /privacy/i }).click()
        await expect(page).toHaveURL(/\/privacy/)
        await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible()

        await page.getByRole('link', { name: /terms/i }).click()
        await expect(page).toHaveURL(/\/terms/)
        await expect(page.getByRole('heading', { name: /terms/i })).toBeVisible()
    })

    test('search filters events on discover page', async ({ page }) => {
        await page.goto('/')
        const searchInput = page.getByPlaceholder('Search artists, venues, events...')
        await expect(searchInput).toBeVisible()

        await searchInput.fill('zzzx-not-found')
        await expect(page.getByRole('heading', { name: /No events found/i })).toBeVisible({ timeout: 5000 })
    })

    test('mobile menu opens and closes', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto('/')

        // Open mobile menu
        const menuButton = page.getByRole('button', { name: /menu/i })
        if (await menuButton.isVisible()) {
            await menuButton.click()
            await expect(page.getByRole('link', { name: /venues/i })).toBeVisible()

            // Close menu
            await menuButton.click()
        }
    })
})

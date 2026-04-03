import { test, expect } from '@playwright/test'

test.describe('Discover', () => {
    test('home shows discover hero', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: /Discover/i })).toBeVisible()
    })

    test('empty search state can be cleared', async ({ page }) => {
        await page.goto('/')

        await page.getByPlaceholder('Search artists, venues, events...').fill('zzzx-not-a-real-gig')
        await expect(page.getByRole('heading', { name: /No events found/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Clear Filters/i })).toBeVisible()

        await page.getByRole('button', { name: /Clear Filters/i }).click()
        await expect(page.getByPlaceholder('Search artists, venues, events...')).toHaveValue('')
    })

    test('unknown route shows not found', async ({ page }) => {
        await page.goto('/route-that-does-not-exist-ratemygig')
        await expect(page.getByText(/not found/i)).toBeVisible()
    })
})

import { test, expect } from '@playwright/test'

test.describe('Discover', () => {
    test('home shows discover hero', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: /Discover/i })).toBeVisible()
    })

    test('unknown route shows not found', async ({ page }) => {
        await page.goto('/route-that-does-not-exist-ratemygig')
        await expect(page.getByText(/not found/i)).toBeVisible()
    })
})

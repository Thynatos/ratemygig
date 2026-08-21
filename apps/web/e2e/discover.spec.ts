import { test, expect } from '@playwright/test'

test.describe('Discover', () => {
    test('home shows the board header', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: /What's on/i })).toBeVisible()
    })

    test('empty search state can be cleared', async ({ page }) => {
        await page.goto('/')

        await page.getByPlaceholder('Artist, venue or gig').fill('zzzx-not-a-real-gig')
        await expect(page.getByRole('heading', { name: /Nothing on the board/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Clear Filters/i })).toBeVisible()

        await page.getByRole('button', { name: /Clear Filters/i }).click()
        await expect(page.getByPlaceholder('Artist, venue or gig')).toHaveValue('')
    })

    test('unknown route shows not found', async ({ page }) => {
        await page.goto('/route-that-does-not-exist-ratemygig')
        await expect(page.getByRole('heading', { name: /Nothing at this address/i })).toBeVisible()
    })
})

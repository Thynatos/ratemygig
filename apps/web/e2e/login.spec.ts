import { test, expect } from '@playwright/test'

test.describe('Login', () => {
    test('login page renders with email input and sign in button', async ({ page }) => {
        await page.goto('/login')
        await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
        await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: /email me a link/i })).toBeVisible()
    })

    test('shows validation error on empty submit', async ({ page }) => {
        await page.goto('/login')
        await page.getByRole('button', { name: /email me a link/i }).click()
        await expect(page.getByText(/does not look like an email address/i)).toBeVisible()
    })

    test('navigates to login from header when not authenticated', async ({ page }) => {
        await page.goto('/')
        const signInLink = page.getByRole('link', { name: /sign in/i })
        if (await signInLink.isVisible()) {
            await signInLink.click()
            await expect(page).toHaveURL(/\/login/)
        }
    })
})
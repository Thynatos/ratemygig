/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

const fileEnv = loadEnv('', __dirname, '')

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/test/live/**/*.test.ts'],
        testTimeout: 30000,
        env: {
            SUPABASE_URL: process.env.SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? '',
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY ?? '',
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@shared': resolve(__dirname, './src/shared'),
            '@features': resolve(__dirname, './src/features'),
            '@core': resolve(__dirname, '../../packages/core/src'),
        },
    },
})

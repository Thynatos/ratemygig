import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// Release identifier shared by the runtime SDK (env.ts) and the sourcemap
// upload, so stack traces resolve against the exact deployed build. CI and
// Vercel both provide a commit SHA; local builds fall back to null.
const sentryRelease =
    process.env.SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    null

// https://vite.dev/config/
const sentryPluginEnabled =
  Boolean(sentryRelease && process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT)

export default defineConfig({
  plugins: [
    react(),
    // Uploads hidden sourcemaps to Sentry at build time. Skips itself when
    // SENTRY_AUTH_TOKEN is absent (local dev, PR builds without secrets).
    ...(sentryPluginEnabled
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: sentryRelease! },
            sourcemaps: { assets: './dist/assets' },
            telemetry: false,
          }),
        ]
      : []),
  ],
  define: {
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@jobs': path.resolve(__dirname, '../../packages/jobs/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [path.resolve(__dirname, '..'), path.resolve(__dirname, '../..')],
    },
  },
  build: {
    // 'hidden': maps are emitted for the Sentry upload but no sourceMappingURL
    // comment is published — full source stays private while production stack
    // traces remain readable in Sentry.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
})

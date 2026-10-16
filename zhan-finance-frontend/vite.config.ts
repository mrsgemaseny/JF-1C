/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  base: '/JF-1C/',
  plugins: [
    react(), 
    tailwindcss(),
    ...(process.env.SENTRY_AUTH_TOKEN ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG || "zhanfinance",
        project: process.env.SENTRY_PROJECT || "javascript-react",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      })
    ] : [])
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'suneditor/src/plugins': 'suneditor/src/plugins/index.js',
      'suneditor/src/plugins/': 'suneditor/src/plugins/index.js'
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('framer-motion')) {
            return 'vendor-framer-motion';
          }
          if (id.includes('/pages/dashboard/admin/')) {
            return 'chunk-admin';
          }
          if (id.includes('/pages/dashboard/employee/')) {
            return 'chunk-employee';
          }
          if (id.includes('/pages/dashboard/client/')) {
            return 'chunk-client';
          }
          if (id.includes('/pages/dashboard/learner/')) {
            return 'chunk-learner';
          }
          if (id.includes('/pages/home/') || id.includes('/pages/about/') || id.includes('/pages/services/') || id.includes('/pages/auth/')) {
            return 'chunk-public';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts'
  }
})
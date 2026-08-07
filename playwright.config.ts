import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173/chem-olympiad-knowledge-graph/', trace: 'retain-on-failure' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1', url: 'http://127.0.0.1:4173/chem-olympiad-knowledge-graph/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop-wide', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'desktop-compact', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 700 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
})

import { test, expect } from '@playwright/test'

test('首页与核心数据在三种视口可用', async ({ page }, testInfo) => {
  await page.goto('./')
  await expect(page).toHaveTitle('化学竞赛知识图谱')
  await expect(page.getByRole('heading', { name: /把每一道题/ })).toBeVisible()
  await expect(page.getByRole('link', { name: '知识图谱', exact: true })).toBeVisible()
  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  expect(noHorizontalOverflow).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(`home-${testInfo.project.name}.png`), fullPage: true })
  await page.getByRole('link', { name: '知识图谱', exact: true }).click()
  await expect(page.getByRole('heading', { name: '知识图谱' })).toBeVisible()
})

test('真题档案可以筛选并打开元数据记录', async ({ page }) => {
  await page.goto('./#/exams')
  await expect(page.getByRole('heading', { name: '真题档案' })).toBeVisible()
  await page.getByLabel('筛选题目').fill('元素周期律')
  await expect(page.getByText(/Q1 · 基础设施演示记录：元素周期律与结构推断/)).toBeVisible()
  await page.getByText(/Q1 · 基础设施演示记录：元素周期律与结构推断/).click()
  await expect(page.getByText('题文暂不公开')).toBeVisible()
})

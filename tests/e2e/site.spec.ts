import { test, expect } from '@playwright/test'

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}

async function searchFor(page: import('@playwright/test').Page, text: string) {
  if ((page.viewportSize()?.width || 1000) <= 800) {
    await page.getByRole('button', { name: '搜索' }).click()
    await page.getByRole('dialog', { name: '搜索全站' }).getByLabel('搜索全站').fill(text)
  } else {
    await page.getByLabel('搜索知识点、题目或年份').fill(text)
  }
}

test('首页是六学科知识图谱工作台', async ({ page }, testInfo) => {
  await page.goto('./')
  await expect(page).toHaveTitle('化学竞赛知识图谱')
  await expect(page.getByTestId('home-map')).toBeVisible()
  await expect(page.getByTestId('map-canvas')).toBeVisible()
  await expect(page.locator('.overview-cy canvas').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.discipline-tabs button')).toHaveCount(6)
  const counts = await page.getByTestId('map-counts').textContent()
  const visibleNodes = Number(counts?.match(/显示\s+(\d+)/)?.[1])
  expect(visibleNodes).toBeGreaterThanOrEqual(60)
  expect(visibleNodes).toBeLessThanOrEqual(100)
  await expect(page.getByText('演示数据')).toHaveCount(0)
  await assertNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath(`home-${testInfo.project.name}.png`), fullPage: true })
})

test('搜索知识点后恢复图谱状态', async ({ page }, testInfo) => {
  await page.goto('./')
  await searchFor(page, '配位化学')
  await page.getByTestId('suggest-knowledge-kn-topic-000025').click()
  await expect(page).toHaveURL(/node=kn-topic-000025/)
  await expect(page.getByTestId('panel-title')).toHaveText('配位化学')
  await expect(page.getByTestId('open-knowledge')).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath(`selected-${testInfo.project.name}.png`), fullPage: true })
  await page.getByTestId('map-reset').click({ force: true })
  await expect(page.getByTestId('panel-title')).toHaveCount(0)
})

test('旧图谱地址保留节点查询参数', async ({ page }) => {
  await page.goto('./#/graph?node=kn-topic-000025&discipline=%E6%97%A0%E6%9C%BA')
  await expect(page).toHaveURL(/#\/\?node=kn-topic-000025/)
  await expect(page.getByTestId('panel-title')).toHaveText('配位化学')
})

test('真题档案可以筛选并打开题目', async ({ page }) => {
  await page.goto('./#/exams')
  await expect(page.getByRole('heading', { name: '真题档案' })).toBeVisible()
  await page.getByPlaceholder('题号、主题或学科').fill('钙钛矿')
  await expect(page.locator('.archive-row')).toHaveCount(6)
  await page.getByRole('link', { name: /2021 初赛 Q6 钙钛矿衍生结构/ }).click()
  await expect(page.getByTestId('problem-stem').or(page.getByTestId('stem-unavailable'))).toBeVisible()
  await expect(page.getByRole('link', { name: /钙钛矿结构/ })).toBeVisible()
  await assertNoHorizontalOverflow(page)
})

test('知识详情显示关系、题目和局部图', async ({ page }) => {
  await page.goto('./#/knowledge/kn-topic-000025')
  await expect(page.getByRole('heading', { name: '配位化学', exact: true })).toBeVisible()
  await expect(page.locator('.local-graph canvas').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('heading', { name: '相关概念' })).toBeVisible()
  await assertNoHorizontalOverflow(page)
})

test('结构化题干保留正文与三张图片', async ({ page }) => {
  await page.goto('./#/exams/problem-000011')
  await expect(page.getByTestId('problem-stem')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('演示排版')).toHaveCount(0)
  await expect(page.getByTestId('problem-stem')).toContainText('钙钛矿')
  for (const label of ['6-1', '6-2', '6-3', '6-4']) await expect(page.locator('.stem-subpart-label', { hasText: label }).first()).toBeVisible()
  await expect(page.getByTestId('problem-stem')).toContainText('387.3')
  await expect(page.getByTestId('problem-stem').locator('img')).toHaveCount(3)
  for (let index = 0; index < 3; index += 1) await expect(page.getByTestId('problem-stem').locator('img').nth(index)).toBeVisible()
  await assertNoHorizontalOverflow(page)
})

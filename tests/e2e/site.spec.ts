import { test, expect } from '@playwright/test'

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const noHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  )
  expect(noHorizontalOverflow).toBe(true)
}

test('首页地图与核心数据在三种视口可用', async ({ page }, testInfo) => {
  await page.goto('./')
  await expect(page).toHaveTitle('化学竞赛知识图谱')
  await expect(page.getByTestId('home-map')).toBeVisible()
  await expect(page.getByTestId('map-canvas')).toBeVisible()
  await expect(page.locator('.overview-cy canvas').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('map-counts')).toContainText('663 节点')
  await expect(page.getByTestId('node-picker')).toBeVisible()
  await expect(page.getByText('演示数据 2026.08')).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath(`home-${testInfo.project.name}.png`), fullPage: true })

  await page.getByRole('link', { name: '知识图谱', exact: true }).click()
  await expect(page.getByRole('heading', { name: '知识图谱' })).toBeVisible()
  await assertNoHorizontalOverflow(page)
})

test('节点文字列表选择后展示相邻、次序与题目', async ({ page }) => {
  await page.goto('./')
  const picker = page.getByTestId('node-picker')
  await expect(picker).toBeVisible()
  // 列表只含概念/方法/技能，不重复六大学科节点
  await expect(page.getByTestId('node-pick-kn-discipline-000001')).toHaveCount(0)
  await expect(page.getByTestId('node-pick-kn-discipline-000002')).toHaveCount(0)
  await expect(page.getByTestId('node-pick-kn-discipline-000003')).toHaveCount(0)
  await expect(page.getByTestId('node-pick-kn-discipline-000004')).toHaveCount(0)
  await expect(page.getByTestId('node-pick-kn-discipline-000005')).toHaveCount(0)
  await expect(page.getByTestId('node-pick-kn-discipline-000006')).toHaveCount(0)
  await expect(picker.locator('[data-testid^="node-pick-"]')).toHaveCount(657)

  // 大列表用过滤定位，避免折叠/clip 项误点
  await page.getByPlaceholder('过滤列表').fill('配位化学')
  await page.getByTestId('node-pick-kn-concept-000005').click()
  await expect(page.getByTestId('panel-title')).toHaveText('配位化学')
  await expect(page.getByTestId('neighbor-kn-discipline-000003')).toBeVisible()
  await expect(page.getByTestId('related-problem-problem-000366')).toBeVisible()
  await expect(page.getByTestId('open-knowledge')).toBeVisible()

  // 另一对先修：原子与电子构型 → 化学键
  await page.getByTestId('map-reset').click()
  await expect(page.getByTestId('node-picker')).toBeVisible()
  await page.getByPlaceholder('过滤列表').fill('原子与电子构型')
  await page.getByTestId('node-pick-kn-concept-000011').click()
  await expect(page.getByTestId('panel-title')).toHaveText('原子与电子构型')
  await expect(page.getByTestId('follow-kn-concept-000002')).toBeVisible()
  await page.getByTestId('follow-kn-concept-000002').click()
  await expect(page.getByTestId('panel-title')).toHaveText('化学键')
  await expect(page.getByTestId('prereq-kn-concept-000011')).toBeVisible()
})

test('搜索定位知识节点并支持复位', async ({ page }) => {
  await page.goto('./')
  const search = page.getByLabel('搜索知识点、题目或年份')
  await search.fill('配位')
  await expect(page.locator('#search-suggestions')).toBeVisible()
  await page.getByTestId('suggest-knowledge-kn-concept-000005').click()
  await expect(page).toHaveURL(/node=kn-concept-000005/)
  await expect(page.getByTestId('panel-title')).toHaveText('配位化学')

  // 移动端 sheet 遮罩可能挡住工具条：优先点清除/复位，必要时 force
  const reset = page.getByTestId('map-reset')
  await reset.click({ force: true })
  await expect(page.getByTestId('node-picker')).toBeVisible()
  await expect(page.getByTestId('panel-title')).toHaveCount(0)
})

test('真题档案可以筛选并打开元数据记录', async ({ page }) => {
  await page.goto('./#/exams')
  await expect(page.getByRole('heading', { name: '真题档案' })).toBeVisible()
  await page.getByLabel('筛选题目').fill('钙钛矿')
  await expect(page.getByText(/Q6 · 钙钛矿衍生结构/)).toBeVisible()
  await page.getByText(/Q6 · 钙钛矿衍生结构/).click()
  // 有结构化题干时渲染题干；无题干时显示「题文暂不公开」
  await expect(page.getByTestId('problem-stem').or(page.getByTestId('stem-unavailable'))).toBeVisible()
  await expect(page.getByRole('link', { name: /钙钛矿结构/ })).toBeVisible()
})

test('有题干的题目详情可渲染结构化题干', async ({ page }) => {
  await page.goto('./#/exams/problem-000011')
  await expect(page.getByTestId('problem-stem')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('演示排版')).toBeVisible()
  await expect(page.getByText(/理想立方钙钛矿/)).toBeVisible()
  await expect(page.getByText('(1)')).toBeVisible()
})

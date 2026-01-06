import { test, expect } from '@playwright/test';

test.describe('MCP Chat Studio - Inspector Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure classic mode
    await page.click('#layoutClassicBtn');
    // Navigate to Inspector
    await page.click('[data-panel="inspectorPanel"]');
  });

  test('inspector panel loads', async ({ page }) => {
    await expect(page.locator('#inspectorPanel')).toBeVisible();
  });

  test('inspector sub-tabs are visible', async ({ page }) => {
    // Check all sub-tabs exist
    await expect(page.locator('#inspectorToolsTab')).toBeVisible();
    await expect(page.locator('#inspectorResourcesTab')).toBeVisible();
    await expect(page.locator('#inspectorPromptsTab')).toBeVisible();
    await expect(page.locator('#inspectorTimelineTab')).toBeVisible();
    await expect(page.locator('#inspectorBulkTestTab')).toBeVisible();
    await expect(page.locator('#inspectorDiffTab')).toBeVisible();
  });

  test('server and tool dropdowns exist', async ({ page }) => {
    await expect(page.locator('#inspectorServerSelect')).toBeVisible();
    await expect(page.locator('#inspectorToolSelect')).toBeVisible();
  });

  test('switching sub-tabs works', async ({ page }) => {
    // Click Resources tab
    await page.click('#inspectorResourcesTab');
    await expect(page.locator('#inspectorResourcesPanel')).toBeVisible();

    // Click Prompts tab
    await page.click('#inspectorPromptsTab');
    await expect(page.locator('#inspectorPromptsPanel')).toBeVisible();

    // Click Timeline tab
    await page.click('#inspectorTimelineTab');
    await expect(page.locator('#inspectorTimelinePanel')).toBeVisible();

    // Click back to Tools tab
    await page.click('#inspectorToolsTab');
    await expect(page.locator('#inspectorToolsPanel')).toBeVisible();
  });

  test('protocol log section exists', async ({ page }) => {
    await expect(page.locator('#protocolLog')).toBeVisible();
  });

  test('SSE events section exists', async ({ page }) => {
    await expect(page.locator('#sseEvents')).toBeVisible();
    await expect(page.locator('#sseConnectBtn')).toBeVisible();
  });

  test('mock recorder section exists', async ({ page }) => {
    await expect(page.locator('#mockRecorderSection')).toBeVisible();
    await expect(page.locator('#mockRecorderToggle')).toBeVisible();
  });

  test('variables section exists', async ({ page }) => {
    await expect(page.locator('#inspectorVariablesSection')).toBeVisible();
    await expect(page.locator('#inspectorVariablesInput')).toBeVisible();
  });
});

test.describe('MCP Chat Studio - Workflows Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#layoutClassicBtn');
    await page.click('[data-panel="workflowsPanel"]');
  });

  test('workflows panel loads', async ({ page }) => {
    await expect(page.locator('#workflowsPanel')).toBeVisible();
  });

  test('create workflow button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /New Workflow/i })).toBeVisible();
  });
});

test.describe('MCP Chat Studio - Collections Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#layoutClassicBtn');
    await page.click('[data-panel="collectionsPanel"]');
  });

  test('collections panel loads', async ({ page }) => {
    await expect(page.locator('#collectionsPanel')).toBeVisible();
  });

  test('create collection button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /New Collection/i })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('MCP Chat Studio - Basic Functionality', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check main elements are visible
    await expect(page.locator('.logo-text')).toContainText('MCP Chat');
    await expect(page.locator('.logo-badge')).toContainText('Studio');

    // Header should be visible
    await expect(page.locator('header.header')).toBeVisible();

    // Model badge should be visible
    await expect(page.locator('#modelBadge')).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/');

    // Initially should be dark theme (no data-theme attribute or dark)
    const html = page.locator('html');

    // Click theme toggle
    await page.click('#themeToggle');

    // Should switch to light theme
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Click again to switch back
    await page.click('#themeToggle');

    // Should switch back to dark
    const theme = await html.getAttribute('data-theme');
    expect(theme === null || theme === 'dark').toBeTruthy();
  });

  test.skip('layout switching works', async ({ page }) => {
    await page.goto('/');

    // Find layout switch buttons
    const classicBtn = page.locator('#layoutClassicBtn');
    const workspaceBtn = page.locator('#layoutWorkspaceBtn');

    await expect(classicBtn).toBeVisible();
    await expect(workspaceBtn).toBeVisible();

    // Click workspace mode
    await workspaceBtn.click();
    await expect(workspaceBtn).toHaveClass(/active/);

    // Check workspace canvas appears
    await expect(page.locator('#floatingWorkspace')).toBeVisible();

    // Click classic mode
    await classicBtn.click();
    await expect(classicBtn).toHaveClass(/active/);

    // Main content should be visible
    await expect(page.locator('.main')).toBeVisible();
  });

  test('header elements are visible', async ({ page }) => {
    await page.goto('/');

    // Model badge
    await expect(page.locator('#modelBadge')).toBeVisible();

    // Token badge
    await expect(page.locator('#tokenBadge')).toBeVisible();

    // Branches button
    await expect(page.getByRole('button', { name: /Branches/i })).toBeVisible();

    // Settings button
    await expect(page.getByRole('button', { name: /LLM Settings/i })).toBeVisible();

    // Theme toggle
    await expect(page.locator('#themeToggle')).toBeVisible();
  });

  test('sidebar shows MCP servers section', async ({ page }) => {
    await page.goto('/');

    // Make sure we're in classic mode
    await page.click('#layoutClassicBtn');

    // Sidebar should be visible
    await expect(page.locator('.sidebar')).toBeVisible();

    // Sidebar header with "MCP Servers"
    await expect(page.locator('.sidebar-title')).toContainText('MCP Servers');

    // Add server button
    await expect(page.getByRole('button', { name: /Add/i })).toBeVisible();

    // Test all tools button
    await expect(page.locator('#testAllBtn')).toBeVisible();
  });

  test('tab navigation works', async ({ page }) => {
    await page.goto('/');

    // Ensure classic mode
    await page.click('#layoutClassicBtn');

    // Check tab navigation is visible
    await expect(page.locator('.tab-nav')).toBeVisible();

    // Click Inspector tab
    await page.click('[data-panel="inspectorPanel"]');

    // Inspector panel should be visible
    await expect(page.locator('#inspectorPanel')).toBeVisible();

    // Click back to Chat
    await page.click('[data-panel="chatPanel"]');

    // Chat panel should be visible
    await expect(page.locator('#chatPanel')).toBeVisible();
  });
});

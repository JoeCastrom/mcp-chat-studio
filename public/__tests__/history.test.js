import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const historyPath = path.join(process.cwd(), 'public', 'app', 'history.js');
const historySource = fs.readFileSync(historyPath, 'utf8');

describe.skip('history panel', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="toolHistoryStats"></div>
      <div id="toolHistoryList"></div>
    `;
    globalThis.appendMessage = jest.fn();
    globalThis.showNotification = jest.fn();
    globalThis.getHistoryEntries = jest.fn(() => []);
    globalThis.escapeHtml = value =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
    globalThis.window = globalThis;
    vm.runInThisContext(historySource);
  });

  test('renders empty state when no history', () => {
    globalThis.refreshHistoryPanel();
    expect(document.getElementById('toolHistoryStats').textContent).toContain(
      'No tool executions recorded'
    );
    expect(document.getElementById('toolHistoryList').textContent).toContain(
      'Execute tools from the Inspector tab'
    );
  });

  test('shows load more when history exceeds page size', () => {
    const history = Array.from({ length: 200 }, (_, idx) => ({
      timestamp: new Date().toISOString(),
      server: 'demo',
      tool: `Tool-${idx}`,
      request: { idx },
      response: { ok: true },
      duration: 5,
      success: true,
    }));
    globalThis.getHistoryEntries.mockReturnValue(history);
    globalThis.refreshHistoryPanel();
    expect(document.getElementById('toolHistoryList').textContent).toContain('Load');
  });
});

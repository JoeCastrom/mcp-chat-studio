import fs from 'fs';
import path from 'path';
import vm from 'vm';

const modalsPath = path.join(process.cwd(), 'public', 'app', 'modals.js');
const modalsSource = fs.readFileSync(modalsPath, 'utf8');
vm.runInThisContext(modalsSource);

describe('modals helpers', () => {
  test('escapeHtml encodes HTML entities', () => {
    const html = '<div>Hi & "there"</div>';
    expect(globalThis.escapeHtml(html)).toBe('&lt;div&gt;Hi &amp; &quot;there&quot;&lt;/div&gt;');
  });

  test('sanitizeHtml strips unsafe tags', () => {
    const unsafe = '<p>Safe</p><script>alert(1)</script>';
    const sanitized = globalThis.sanitizeHtml(unsafe);
    expect(sanitized).toContain('<p>Safe</p>');
    expect(sanitized).not.toContain('<script>');
  });

  test('sanitizeHtml preserves allowed tags', () => {
    const safe = '<strong>Bold</strong><em>Italic</em>';
    const sanitized = globalThis.sanitizeHtml(safe);
    expect(sanitized).toContain('<strong>Bold</strong>');
    expect(sanitized).toContain('<em>Italic</em>');
  });
});

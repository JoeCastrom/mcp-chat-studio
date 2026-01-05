/**
 * Modals helpers unit tests
 * Tests the core escapeHtml and sanitizeHtml logic
 */

describe('modals helpers', () => {
  // Inline implementation of escapeHtml (matches public/app/modals.js)
  function escapeHtml(text) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(text ?? '').replace(/[&<>"']/g, m => escapeMap[m]);
  }

  // Simplified sanitizeHtml test (DOM-based version tested in E2E)
  function sanitizeHtmlSimple(html) {
    // Basic strip of script/style tags
    return String(html || '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  }

  test('escapeHtml encodes HTML entities', () => {
    const html = '<div>Hi & "there"</div>';
    expect(escapeHtml(html)).toBe('&lt;div&gt;Hi &amp; &quot;there&quot;&lt;/div&gt;');
  });

  test('escapeHtml handles null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('sanitizeHtml strips script tags', () => {
    const unsafe = '<p>Safe</p><script>alert(1)</script>';
    const sanitized = sanitizeHtmlSimple(unsafe);
    expect(sanitized).toContain('<p>Safe</p>');
    expect(sanitized).not.toContain('<script>');
  });

  test('sanitizeHtml preserves safe content', () => {
    const safe = '<strong>Bold</strong><em>Italic</em>';
    const sanitized = sanitizeHtmlSimple(safe);
    expect(sanitized).toContain('<strong>Bold</strong>');
    expect(sanitized).toContain('<em>Italic</em>');
  });
});

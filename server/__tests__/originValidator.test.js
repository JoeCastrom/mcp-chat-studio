/**
 * Origin Validator Unit Tests
 * Tests CORS origin validation to prevent lookalike domain attacks
 */

import { normalizeOrigin, createOriginValidator } from '../utils/originValidator.js';

describe('normalizeOrigin', () => {
  test('should normalize valid HTTP origin', () => {
    expect(normalizeOrigin('http://localhost:3082')).toBe('http://localhost:3082');
    expect(normalizeOrigin('https://example.com:8080')).toBe('https://example.com:8080');
  });

  test('should strip path and query from origin', () => {
    expect(normalizeOrigin('http://localhost:3082/path?query=1')).toBe('http://localhost:3082');
  });

  test('should return null for invalid origins', () => {
    expect(normalizeOrigin('not-a-url')).toBeNull();
    expect(normalizeOrigin('javascript:alert(1)')).toBeNull();
    expect(normalizeOrigin('')).toBeNull();
  });
});

describe('createOriginValidator', () => {
  const defaultAllowed = ['http://localhost:3082', 'http://127.0.0.1:3082'];

  describe('in production mode', () => {
    const isAllowedOrigin = createOriginValidator(defaultAllowed, 'production');

    test('should block lookalike domains', () => {
      expect(isAllowedOrigin('http://localhost.evil.com')).toBe(false);
      expect(isAllowedOrigin('http://localhost.attacker.com:3082')).toBe(false);
      expect(isAllowedOrigin('http://127.0.0.1.evil.com')).toBe(false);
      expect(isAllowedOrigin('http://malicious-localhost.com')).toBe(false);
      expect(isAllowedOrigin('http://localhost-fake.com:3082')).toBe(false);
    });

    test('should allow legitimate localhost on configured port', () => {
      expect(isAllowedOrigin('http://localhost:3082')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3082')).toBe(true);
    });

    test('should block localhost on non-configured port in production', () => {
      expect(isAllowedOrigin('http://localhost:9999')).toBe(false);
      expect(isAllowedOrigin('http://127.0.0.1:8080')).toBe(false);
    });

    test('should allow null/undefined origin (non-browser requests)', () => {
      expect(isAllowedOrigin(null)).toBe(true);
      expect(isAllowedOrigin(undefined)).toBe(true);
      expect(isAllowedOrigin('')).toBe(true);
    });

    test('should block invalid origin strings', () => {
      expect(isAllowedOrigin('not-a-url')).toBe(false);
      expect(isAllowedOrigin('javascript:alert(1)')).toBe(false);
      expect(isAllowedOrigin('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('should block external domains', () => {
      expect(isAllowedOrigin('http://example.com')).toBe(false);
      expect(isAllowedOrigin('https://attacker.com')).toBe(false);
    });
  });

  describe('in development mode', () => {
    const isAllowedOrigin = createOriginValidator(defaultAllowed, 'development');

    test('should still block lookalike domains', () => {
      expect(isAllowedOrigin('http://localhost.evil.com')).toBe(false);
      expect(isAllowedOrigin('http://127.0.0.1.attacker.com')).toBe(false);
      expect(isAllowedOrigin('http://evillocalhost.com')).toBe(false);
    });

    test('should allow localhost on any port', () => {
      expect(isAllowedOrigin('http://localhost:3082')).toBe(true);
      expect(isAllowedOrigin('http://localhost:9999')).toBe(true);
      expect(isAllowedOrigin('http://localhost:8080')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3082')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
    });

    test('should allow null/undefined origin', () => {
      expect(isAllowedOrigin(null)).toBe(true);
      expect(isAllowedOrigin(undefined)).toBe(true);
    });

    test('should block external domains', () => {
      expect(isAllowedOrigin('http://example.com')).toBe(false);
      expect(isAllowedOrigin('https://attacker.com:3082')).toBe(false);
    });
  });

  describe('with custom allowed origins', () => {
    const customAllowed = [
      'http://localhost:3082',
      'https://myapp.example.com',
      'https://staging.example.com:8443',
    ];
    const isAllowedOrigin = createOriginValidator(customAllowed, 'production');

    test('should allow explicitly configured origins', () => {
      expect(isAllowedOrigin('https://myapp.example.com')).toBe(true);
      expect(isAllowedOrigin('https://staging.example.com:8443')).toBe(true);
    });

    test('should block similar but different origins', () => {
      expect(isAllowedOrigin('https://myapp.example.com:8080')).toBe(false);
      expect(isAllowedOrigin('http://myapp.example.com')).toBe(false);
      expect(isAllowedOrigin('https://evil.myapp.example.com')).toBe(false);
    });
  });
});

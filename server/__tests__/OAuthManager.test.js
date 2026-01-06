/**
 * OAuthManager Unit Tests
 */

import { jest } from '@jest/globals';

// Mock axios
const mockAxiosPost = jest.fn();
const mockAxiosGet = jest.fn();

jest.unstable_mockModule('axios', () => ({
  default: {
    post: mockAxiosPost,
    get: mockAxiosGet,
  },
}));

// Mock uuid
jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-' + Date.now()),
}));

// Import after mocking
const {
  OAuthManager,
  createOAuthManager: _createOAuthManager,
  getOAuthManager: _getOAuthManager,
} = await import('../services/OAuthManager.js');

describe('OAuthManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosPost.mockReset();
    mockAxiosGet.mockReset();
  });

  describe('Configuration', () => {
    test('constructor should apply config', () => {
      manager = new OAuthManager({
        provider: 'github',
        client_id: 'test_client_id',
        client_secret: 'test_secret',
      });

      expect(manager.provider).toBe('github');
      expect(manager.clientId).toBe('test_client_id');
      expect(manager.clientSecret).toBe('test_secret');
    });

    test('should default to keycloak provider', () => {
      manager = new OAuthManager({});

      expect(manager.provider).toBe('keycloak');
    });

    test('updateConfig should apply new settings', () => {
      manager = new OAuthManager({ provider: 'github' });
      manager.updateConfig({ provider: 'google', client_id: 'new_id' });

      expect(manager.provider).toBe('google');
      expect(manager.clientId).toBe('new_id');
    });

    test('should apply scopes correctly', () => {
      manager = new OAuthManager({
        scopes: ['read:user', 'repo'],
      });

      expect(manager.scopes).toEqual(['read:user', 'repo']);
    });

    test('should default scopes to openid profile email', () => {
      manager = new OAuthManager({});

      expect(manager.scopes).toEqual(['openid', 'profile', 'email']);
    });
  });

  describe('Endpoint Resolution', () => {
    test('getEndpoints should return GitHub endpoints', () => {
      manager = new OAuthManager({ provider: 'github' });
      const endpoints = manager.getEndpoints();

      expect(endpoints.authorization).toBe('https://github.com/login/oauth/authorize');
      expect(endpoints.token).toBe('https://github.com/login/oauth/access_token');
    });

    test('getEndpoints should return Google endpoints', () => {
      manager = new OAuthManager({ provider: 'google' });
      const endpoints = manager.getEndpoints();

      expect(endpoints.authorization).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(endpoints.token).toBe('https://oauth2.googleapis.com/token');
    });

    test('getEndpoints should return Keycloak endpoints', () => {
      manager = new OAuthManager({
        provider: 'keycloak',
        keycloak_url: 'https://auth.example.com',
        keycloak_realm: 'myrealm',
      });
      const endpoints = manager.getEndpoints();

      expect(endpoints.authorization).toBe(
        'https://auth.example.com/realms/myrealm/protocol/openid-connect/auth'
      );
      expect(endpoints.token).toBe(
        'https://auth.example.com/realms/myrealm/protocol/openid-connect/token'
      );
    });

    test('getEndpoints should return custom endpoints', () => {
      manager = new OAuthManager({
        authorize_url: 'https://custom.auth/authorize',
        token_url: 'https://custom.auth/token',
        userinfo_url: 'https://custom.auth/userinfo',
      });
      const endpoints = manager.getEndpoints();

      expect(endpoints.authorization).toBe('https://custom.auth/authorize');
      expect(endpoints.token).toBe('https://custom.auth/token');
    });
  });

  describe('isConfigured', () => {
    test('should return true when properly configured', () => {
      manager = new OAuthManager({
        provider: 'github',
        client_id: 'test_id',
      });

      expect(manager.isConfigured()).toBe(true);
    });

    test('should return false when client_id is missing', () => {
      manager = new OAuthManager({
        provider: 'github',
      });

      expect(manager.isConfigured()).toBe(false);
    });

    test('should return false when disabled', () => {
      manager = new OAuthManager({
        provider: 'github',
        client_id: 'test_id',
        disabled: true,
      });

      expect(manager.isConfigured()).toBe(false);
    });
  });

  describe('PKCE', () => {
    test('generatePKCE should return verifier and challenge', () => {
      manager = new OAuthManager({});
      const pkce = manager.generatePKCE();

      expect(pkce.verifier).toBeDefined();
      expect(pkce.challenge).toBeDefined();
      expect(pkce.verifier.length).toBeGreaterThan(0);
      expect(pkce.challenge.length).toBeGreaterThan(0);
    });

    test('challenge should be derived from verifier', () => {
      manager = new OAuthManager({});
      const pkce1 = manager.generatePKCE();
      const pkce2 = manager.generatePKCE();

      // Different verifiers should produce different challenges
      expect(pkce1.challenge).not.toBe(pkce2.challenge);
    });
  });

  describe('Authentication Flow', () => {
    test('startAuth should generate authorization URL', () => {
      manager = new OAuthManager({
        provider: 'github',
        client_id: 'test_client_id',
        redirect_uri: 'http://localhost:3082/callback',
      });

      const url = manager.startAuth('session123');

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('state=');
    });

    test('startAuth should throw when not configured', () => {
      manager = new OAuthManager({});

      expect(() => manager.startAuth('session123')).toThrow('OAuth not configured');
    });

    test('startAuth should include PKCE parameters when enabled', () => {
      manager = new OAuthManager({
        provider: 'github',
        client_id: 'test_id',
        use_pkce: true,
      });

      const url = manager.startAuth('session123');

      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
    });
  });

  describe('Token Management', () => {
    test('isAuthenticated should return false for unknown session', () => {
      manager = new OAuthManager({});

      expect(manager.isAuthenticated('unknown')).toBe(false);
    });

    test('logout should return without error for unknown session', () => {
      manager = new OAuthManager({});

      // Should not throw
      expect(() => manager.logout('unknown')).not.toThrow();
    });

    test('getAccessToken should return null for unknown session', async () => {
      manager = new OAuthManager({});

      const token = await manager.getAccessToken('unknown');

      expect(token).toBeNull();
    });
  });

  describe('State Cleanup', () => {
    test('cleanupStates should remove expired states', () => {
      manager = new OAuthManager({
        provider: 'github',
        client_id: 'test_id',
      });

      // Start auth to create state
      manager.startAuth('session1');

      // Cleanup should not throw
      expect(() => manager.cleanupStates()).not.toThrow();
    });
  });

  describe('Logout URL', () => {
    test('getLogoutUrl should generate logout URL for Keycloak', () => {
      manager = new OAuthManager({
        provider: 'keycloak',
        keycloak_url: 'https://auth.example.com',
        keycloak_realm: 'myrealm',
        client_id: 'test_id',
      });

      const url = manager.getLogoutUrl('session123', 'http://localhost:3082');

      expect(url).toContain(
        'https://auth.example.com/realms/myrealm/protocol/openid-connect/logout'
      );
      expect(url).toContain('client_id=test_id');
    });
  });
});

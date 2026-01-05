/**
 * OAuth Manager for Generic OAuth2/OIDC
 * Supports Keycloak, GitHub, Google, Auth0, or any OAuth2 provider
 */

import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import {
  getToken,
  setToken,
  deleteToken,
  clearTokens
} from './OAuthTokenStore.js';

function createHttpsAgent(disableVerify) {
  return new https.Agent({
    rejectUnauthorized: !disableVerify,
  });
}

// In-memory store for OAuth states (tokens persisted via OAuthTokenStore)
const oauthStates = new Map();

// Provider presets for common OAuth providers
const PROVIDER_PRESETS = {
  keycloak: (baseUrl, realm) => ({
    authorization: `${baseUrl}/realms/${realm}/protocol/openid-connect/auth`,
    token: `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
    userinfo: `${baseUrl}/realms/${realm}/protocol/openid-connect/userinfo`,
    logout: `${baseUrl}/realms/${realm}/protocol/openid-connect/logout`,
  }),
  github: () => ({
    authorization: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    userinfo: 'https://api.github.com/user',
    logout: null,
  }),
  google: () => ({
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://www.googleapis.com/oauth2/v3/userinfo',
    logout: null,
  }),
};

export class OAuthManager {
  constructor(config) {
    this.applyConfig(config);
  }

  applyConfig(config) {
    const oauthConfig = config?.oauth ?? config ?? {};
    this.config = oauthConfig || {};
    this.disableSSLVerify =
      this.config.disable_ssl_verify === true ||
      process.env.OAUTH_DISABLE_SSL_VERIFY === 'true';

    // Provider type (keycloak, github, google, or custom)
    this.provider = this.config.provider || 'keycloak';

    // Core OAuth2 settings
    this.clientId = this.config.client_id || process.env.OAUTH_CLIENT_ID;
    this.clientSecret = this.config.client_secret || process.env.OAUTH_CLIENT_SECRET;
    this.redirectUri =
      this.config.redirect_uri ||
      process.env.OAUTH_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 3082}/api/oauth/callback`;
    this.scopes = this.config.scopes || ['openid', 'profile', 'email'];

    // Custom endpoints (for generic OAuth2)
    this.customEndpoints = {
      authorization: this.config.authorize_url || process.env.OAUTH_AUTHORIZE_URL,
      token: this.config.token_url || process.env.OAUTH_TOKEN_URL,
      userinfo: this.config.userinfo_url || process.env.OAUTH_USERINFO_URL,
      logout: this.config.logout_url || process.env.OAUTH_LOGOUT_URL,
    };

    // Keycloak-specific settings (backwards compatibility)
    this.keycloakUrl = this.config.keycloak_url || process.env.KEYCLOAK_URL;
    this.realm = this.config.keycloak_realm || process.env.KEYCLOAK_REALM || 'master';

    // PKCE support (default: true for public clients)
    this.usePKCE = this.config.use_pkce !== false;

    this.httpsAgent = createHttpsAgent(this.disableSSLVerify);
  }

  updateConfig(oauthConfig, options = {}) {
    this.applyConfig(oauthConfig);
    if (options.clearTokens !== false) {
      clearTokens();
      oauthStates.clear();
    }
  }

  /**
   * Get OAuth endpoints (supports presets and custom URLs)
   */
  getEndpoints() {
    // If custom endpoints are provided, use them
    if (this.customEndpoints.authorization && this.customEndpoints.token) {
      return this.customEndpoints;
    }

    // Use provider preset
    const preset = PROVIDER_PRESETS[this.provider];
    if (preset) {
      if (this.provider === 'keycloak' && this.keycloakUrl) {
        return preset(this.keycloakUrl, this.realm);
      }
      return preset();
    }

    // Fallback to Keycloak URLs if keycloak_url is set
    if (this.keycloakUrl) {
      return PROVIDER_PRESETS.keycloak(this.keycloakUrl, this.realm);
    }

    return this.customEndpoints;
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured() {
    if (this.config?.disabled) return false;
    const endpoints = this.getEndpoints();
    return !!(endpoints.authorization && endpoints.token && this.clientId);
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  /**
   * Start OAuth flow - returns authorization URL
   */
  startAuth(sessionId) {
    if (!this.isConfigured()) {
      throw new Error(
        'OAuth not configured. Set authorize_url/token_url or keycloak_url, plus client_id.'
      );
    }

    const state = uuidv4();
    let verifier = null;
    let challenge = null;

    // Generate PKCE if enabled
    if (this.usePKCE) {
      const pkce = this.generatePKCE();
      verifier = pkce.verifier;
      challenge = pkce.challenge;
    }

    // Store state for validation
    oauthStates.set(state, {
      sessionId,
      verifier, // May be null if PKCE disabled
      createdAt: Date.now(),
    });

    // Clean up old states (older than 10 minutes)
    this.cleanupStates();

    const endpoints = this.getEndpoints();
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
    });

    // Add PKCE parameters if enabled
    if (this.usePKCE && challenge) {
      params.append('code_challenge', challenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${endpoints.authorization}?${params}`;
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleCallback(code, state) {
    const stateData = oauthStates.get(state);
    if (!stateData) {
      throw new Error('Invalid or expired OAuth state');
    }

    oauthStates.delete(state);

    const endpoints = this.getEndpoints();
    const tokenParams = {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code,
      redirect_uri: this.redirectUri,
    };

    // Add PKCE verifier if it was used
    if (stateData.verifier) {
      tokenParams.code_verifier = stateData.verifier;
    }

    // Add client secret if configured (confidential client)
    if (this.clientSecret) {
      tokenParams.client_secret = this.clientSecret;
    }

    try {
      const response = await axios.post(endpoints.token, new URLSearchParams(tokenParams), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        httpsAgent: this.httpsAgent,
      });

      const tokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        id_token: response.data.id_token,
        expires_at: Date.now() + response.data.expires_in * 1000,
        refresh_expires_at: response.data.refresh_expires_in
          ? Date.now() + response.data.refresh_expires_in * 1000
          : null,
      };

      // Store tokens by session ID
      setToken(stateData.sessionId, tokens);

      // Get user info
      const userInfo = await this.getUserInfo(tokens.access_token);

      return { tokens, userInfo, sessionId: stateData.sessionId };
    } catch (error) {
      console.error('[OAuth] Token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Get user info from token
   */
  async getUserInfo(accessToken) {
    try {
      const endpoints = this.getEndpoints();
      const response = await axios.get(endpoints.userinfo, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000,
        httpsAgent: this.httpsAgent,
      });
      return response.data;
    } catch (error) {
      console.error('[OAuth] Failed to get user info:', error.message);
      return null;
    }
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(sessionId) {
    const tokens = getToken(sessionId);
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const endpoints = this.getEndpoints();
    const params = {
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: tokens.refresh_token,
    };

    if (this.clientSecret) {
      params.client_secret = this.clientSecret;
    }

    try {
      const response = await axios.post(endpoints.token, new URLSearchParams(params), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        httpsAgent: this.httpsAgent,
      });

      const newTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || tokens.refresh_token,
        id_token: response.data.id_token,
        expires_at: Date.now() + response.data.expires_in * 1000,
        refresh_expires_at: response.data.refresh_expires_in
          ? Date.now() + response.data.refresh_expires_in * 1000
          : tokens.refresh_expires_at,
      };

      setToken(sessionId, newTokens);
      return newTokens;
    } catch (error) {
      console.error('[OAuth] Token refresh failed:', error.response?.data || error.message);
      // Clear invalid tokens
      deleteToken(sessionId);
      throw new Error('Token refresh failed - please login again');
    }
  }

  /**
   * Get valid access token for a session (auto-refresh if needed)
   */
  async getAccessToken(sessionId) {
    const tokens = getToken(sessionId);
    if (!tokens) {
      return null;
    }

    // Check if token needs refresh (5 minutes buffer)
    if (tokens.expires_at - Date.now() < 5 * 60 * 1000) {
      try {
        const newTokens = await this.refreshTokens(sessionId);
        return newTokens.access_token;
      } catch (error) {
        return null;
      }
    }

    return tokens.access_token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(sessionId) {
    const tokens = getToken(sessionId);
    return !!tokens?.access_token;
  }

  /**
   * Logout - clear tokens
   */
  logout(sessionId) {
    deleteToken(sessionId);
  }

  /**
   * Get logout URL for Keycloak
   */
  getLogoutUrl(sessionId, postLogoutRedirect) {
    const tokens = getToken(sessionId);
    const endpoints = this.getEndpoints();

    const params = new URLSearchParams({
      client_id: this.clientId,
    });

    if (tokens?.id_token) {
      params.append('id_token_hint', tokens.id_token);
    }

    if (postLogoutRedirect) {
      params.append('post_logout_redirect_uri', postLogoutRedirect);
    }

    this.logout(sessionId);

    return `${endpoints.logout}?${params}`;
  }

  /**
   * Clean up expired OAuth states
   */
  cleanupStates() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [state, data] of oauthStates) {
      if (now - data.createdAt > maxAge) {
        oauthStates.delete(state);
      }
    }
  }
}

// Singleton
let instance = null;

export function createOAuthManager(config) {
  instance = new OAuthManager(config);
  return instance;
}

export function getOAuthManager() {
  return instance;
}

export default OAuthManager;

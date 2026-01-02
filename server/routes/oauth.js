/**
 * OAuth Routes
 * Handles Keycloak/OIDC authentication flow
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOAuthManager } from '../services/OAuthManager.js';
import {
  loadPersistedOAuthConfig,
  savePersistedOAuthConfig
} from '../services/OAuthConfigStore.js';

const router = Router();

/**
 * GET /api/oauth/status
 * Check if user is authenticated
 */
router.get('/status', (req, res) => {
  const oauth = getOAuthManager();
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

  if (!oauth?.isConfigured()) {
    return res.json({
      configured: false,
      authenticated: false,
      message: 'OAuth not configured',
    });
  }

  const isAuth = sessionId ? oauth.isAuthenticated(sessionId) : false;

  res.json({
    configured: true,
    authenticated: isAuth,
    sessionId: isAuth ? sessionId : null,
  });
});

/**
 * GET /api/oauth/config
 * Get current OAuth configuration (safe fields only)
 */
router.get('/config', async (req, res) => {
  const oauth = getOAuthManager();
  const persisted = await loadPersistedOAuthConfig();

  res.json({
    configured: oauth?.isConfigured() || false,
    disabled: oauth?.config?.disabled || false,
    provider: oauth?.provider || 'keycloak',
    client_id: oauth?.clientId || '',
    redirect_uri: oauth?.redirectUri || '',
    scopes: oauth?.scopes || [],
    use_pkce: oauth?.usePKCE !== false,
    keycloak_url: oauth?.keycloakUrl || '',
    keycloak_realm: oauth?.realm || '',
    authorize_url: oauth?.customEndpoints?.authorization || '',
    token_url: oauth?.customEndpoints?.token || '',
    userinfo_url: oauth?.customEndpoints?.userinfo || '',
    logout_url: oauth?.customEndpoints?.logout || '',
    hasClientSecret: !!oauth?.clientSecret,
    source: persisted !== null ? 'ui' : 'config'
  });
});

/**
 * POST /api/oauth/config
 * Update OAuth configuration (persisted)
 */
router.post('/config', async (req, res) => {
  try {
    const oauth = getOAuthManager();
    const existing = (await loadPersistedOAuthConfig()) || {};
    const payload = req.body || {};

    const hasScopes = Object.prototype.hasOwnProperty.call(payload, 'scopes');
    const rawScopes = hasScopes ? payload.scopes : existing.scopes;
    const scopes = Array.isArray(rawScopes)
      ? rawScopes.map(s => String(s).trim()).filter(Boolean)
      : String(rawScopes || '')
          .split(/[\s,]+/)
          .map(s => s.trim())
          .filter(Boolean);

    const nextConfig = {
      provider: payload.provider || existing.provider || 'keycloak',
      client_id: String(payload.client_id ?? existing.client_id ?? '').trim(),
      redirect_uri: String(payload.redirect_uri ?? existing.redirect_uri ?? '').trim(),
      scopes,
      use_pkce: payload.use_pkce !== undefined ? !!payload.use_pkce : existing.use_pkce,
      keycloak_url: String(payload.keycloak_url ?? existing.keycloak_url ?? '').trim(),
      keycloak_realm: String(payload.keycloak_realm ?? existing.keycloak_realm ?? '').trim(),
      authorize_url: String(payload.authorize_url ?? existing.authorize_url ?? '').trim(),
      token_url: String(payload.token_url ?? existing.token_url ?? '').trim(),
      userinfo_url: String(payload.userinfo_url ?? existing.userinfo_url ?? '').trim(),
      logout_url: String(payload.logout_url ?? existing.logout_url ?? '').trim(),
      disabled: payload.disabled === true ? true : false
    };

    if (!nextConfig.client_id && !nextConfig.disabled) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const incomingSecret = (payload.client_secret || '').trim();
    if (incomingSecret) {
      nextConfig.client_secret = incomingSecret;
    } else if (payload.clear_secret === true) {
      delete nextConfig.client_secret;
    } else if (existing.client_secret) {
      nextConfig.client_secret = existing.client_secret;
    }

    await savePersistedOAuthConfig(nextConfig);
    oauth?.updateConfig(nextConfig);

    res.json({
      success: true,
      configured: oauth?.isConfigured() || false,
      provider: oauth?.provider || nextConfig.provider
    });
  } catch (error) {
    console.error('[OAuth] Config update failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/oauth/config
 * Disable OAuth (persisted)
 */
router.delete('/config', async (req, res) => {
  try {
    const oauth = getOAuthManager();
    const disabledConfig = { disabled: true };
    await savePersistedOAuthConfig(disabledConfig);
    oauth?.updateConfig(disabledConfig);
    res.json({ success: true, configured: false });
  } catch (error) {
    console.error('[OAuth] Config disable failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/oauth/login
 * Start OAuth login flow
 */
router.get('/login', (req, res) => {
  const oauth = getOAuthManager();

  if (!oauth?.isConfigured()) {
    return res.status(503).json({ error: 'OAuth not configured' });
  }

  // Create or use existing session ID
  let sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = uuidv4();
  }

  try {
    const authUrl = oauth.startAuth(sessionId);

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return auth URL (frontend will redirect)
    res.json({ authUrl, sessionId });
  } catch (error) {
    console.error('[OAuth] Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/oauth/callback
 * Handle OAuth callback from Keycloak
 */
router.get('/callback', async (req, res) => {
  const oauth = getOAuthManager();
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('[OAuth] Callback error:', error, error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return res.redirect('/?error=missing_code_or_state');
  }

  try {
    const result = await oauth.handleCallback(code, state);

    // Set session cookie
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Redirect to app with success
    res.redirect('/?login=success');
  } catch (error) {
    console.error('[OAuth] Callback error:', error.message);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/oauth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
  const oauth = getOAuthManager();
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

  if (sessionId && oauth) {
    const logoutUrl = oauth.getLogoutUrl(sessionId, 'http://localhost:3080');

    // Clear cookie
    res.clearCookie('sessionId');

    res.json({ logoutUrl });
  } else {
    res.json({ logoutUrl: '/' });
  }
});

/**
 * POST /api/oauth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  const oauth = getOAuthManager();
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

  if (!sessionId) {
    return res.status(401).json({ error: 'No session' });
  }

  try {
    const tokens = await oauth.refreshTokens(sessionId);
    res.json({ success: true, expires_at: tokens.expires_at });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * GET /api/oauth/userinfo
 * Get current user info
 */
router.get('/userinfo', async (req, res) => {
  const oauth = getOAuthManager();
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

  if (!sessionId || !oauth?.isAuthenticated(sessionId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const accessToken = await oauth.getAccessToken(sessionId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Token expired' });
    }

    const userInfo = await oauth.getUserInfo(accessToken);
    res.json(userInfo || { error: 'Could not fetch user info' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

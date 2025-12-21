/**
 * OAuth Routes
 * Handles Keycloak/OIDC authentication flow
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOAuthManager } from '../services/OAuthManager.js';

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
      message: 'OAuth not configured'
    });
  }

  const isAuth = sessionId ? oauth.isAuthenticated(sessionId) : false;

  res.json({
    configured: true,
    authenticated: isAuth,
    sessionId: isAuth ? sessionId : null
  });
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
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
      maxAge: 24 * 60 * 60 * 1000
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

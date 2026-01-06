/**
 * Origin Validator Utility
 * Validates CORS origins to prevent lookalike domain attacks
 */

export function normalizeOrigin(origin) {
  try {
    const url = new URL(origin);
    // Only allow http(s) protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.origin;
  } catch (_error) {
    return null;
  }
}

export function createOriginValidator(allowedOrigins, nodeEnv = 'development') {
  const allowedOriginSet = new Set(
    allowedOrigins.map(normalizeOrigin).filter(Boolean)
  );

  return function isAllowedOrigin(origin) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return true;

    const normalized = normalizeOrigin(origin);
    if (!normalized) return false;

    // Check exact match in allowed list
    if (allowedOriginSet.has(normalized)) return true;

    // In non-production, allow any localhost/127.0.0.1 port
    if (nodeEnv !== 'production') {
      try {
        const parsed = new URL(origin);
        // Strict hostname check - must be exactly localhost or 127.0.0.1
        // This prevents lookalike attacks like localhost.evil.com
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
          return true;
        }
      } catch (_error) {
        return false;
      }
    }

    return false;
  };
}

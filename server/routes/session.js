import { Router } from 'express';
import { getSession, saveSession, clearSession } from '../services/SessionStore.js';
import { logAudit } from '../services/AuditLogger.js';

const router = Router();

function sanitizeSessionPayload(payload = {}) {
  const messages = Array.isArray(payload.messages) ? payload.messages.slice(0, 200) : [];
  const toolHistory = Array.isArray(payload.toolHistory) ? payload.toolHistory.slice(0, 200) : [];
  const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
  return { messages, toolHistory, settings };
}

router.get('/', (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    return res.json({ session: null });
  }
  const session = getSession(sessionId);
  res.json({ session });
});

router.post('/', (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  const payload = sanitizeSessionPayload(req.body || {});
  saveSession(sessionId, payload);
  logAudit('session.save', {
    sessionId,
    messages: payload.messages.length,
    history: payload.toolHistory.length,
  });
  res.json({ success: true });
});

router.delete('/', (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (sessionId) {
    clearSession(sessionId);
    logAudit('session.clear', { sessionId });
  }
  res.json({ success: true });
});

export default router;

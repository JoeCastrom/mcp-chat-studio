import { Router } from 'express';
import { getSession } from '../services/SessionStore.js';
import { createShare, resolveShare } from '../services/SessionShareStore.js';
import { logAudit } from '../services/AuditLogger.js';

const router = Router();

router.post('/', (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  const share = createShare(sessionId);
  if (!share) {
    return res.status(500).json({ error: 'Failed to create share link' });
  }
  logAudit('session.share_create', { sessionId, shareToken: share.token });
  res.json({
    token: share.token,
    expiresAt: share.expiresAt
  });
});

router.get('/:token', (req, res) => {
  const { token } = req.params;
  const share = resolveShare(token);
  if (!share) {
    return res.status(404).json({ error: 'Share link expired or not found' });
  }
  const session = getSession(share.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Shared session not found' });
  }
  logAudit('session.share_resolve', { sessionId: share.sessionId, shareToken: token });
  res.json({ session });
});

export default router;

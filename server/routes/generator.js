import express from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

function sanitizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '') || 'mcp-generator';
}

function isSafeFileName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  return true;
}

router.post('/run', async (req, res) => {
  try {
    const { serverName, files } = req.body || {};
    if (!serverName) {
      return res.status(400).json({ error: 'serverName is required' });
    }
    if (!files || typeof files !== 'object') {
      return res.status(400).json({ error: 'files payload is required' });
    }

    const safeName = sanitizeName(serverName);
    const baseDir = path.join(process.cwd(), '.mcp-generator');
    const runId = `${safeName}-${Date.now()}`;
    const targetDir = path.join(baseDir, runId);
    await fs.mkdir(targetDir, { recursive: true });

    for (const [fileName, content] of Object.entries(files)) {
      if (!isSafeFileName(fileName)) {
        return res.status(400).json({ error: `Invalid file name: ${fileName}` });
      }
      const filePath = path.join(targetDir, fileName);
      await fs.writeFile(filePath, content || '', 'utf8');
    }

    res.json({ cwd: targetDir, runId });
  } catch (error) {
    console.error('[Generator/Run] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

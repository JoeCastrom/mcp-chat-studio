/**
 * OpenAPI Parsing Routes
 */

import express from 'express';
import yaml from 'js-yaml';

const router = express.Router();

/**
 * @swagger
 * /api/openapi/parse:
 *   post:
 *     summary: Parse OpenAPI JSON or YAML into JSON
 *     description: Converts OpenAPI YAML into JSON for UI import.
 *     tags: [OpenAPI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Raw OpenAPI JSON or YAML
 *     responses:
 *       200:
 *         description: Parsed OpenAPI document
 *       400:
 *         description: Invalid OpenAPI input
 */
router.post('/parse', (req, res) => {
  const text = req.body?.text;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const spec = yaml.load(text, { schema: yaml.DEFAULT_SCHEMA });
    if (!spec || typeof spec !== 'object') {
      return res.status(400).json({ error: 'Invalid OpenAPI document' });
    }
    return res.json({ spec });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;

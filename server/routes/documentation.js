/**
 * Documentation Routes
 * Auto-generate documentation for MCP servers
 */

import { Router } from 'express';
import { getDocumentationGenerator } from '../services/DocumentationGenerator.js';

const router = Router();

/**
 * @swagger
 * /api/documentation/generate/{serverName}:
 *   post:
 *     summary: Generate documentation for a server
 *     tags: [Documentation]
 *     parameters:
 *       - in: path
 *         name: serverName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [markdown, html, json]
 *           default: markdown
 *       - in: query
 *         name: save
 *         schema:
 *           type: boolean
 *           default: false
 *         description: "Save to file"
 *     responses:
 *       200:
 *         description: Generated documentation
 */
router.post('/generate/:serverName', async (req, res) => {
  try {
    const generator = getDocumentationGenerator();
    const { serverName } = req.params;
    const { format = 'markdown', save = false } = req.query;
    const sessionId = req.cookies?.sessionId;

    const content = await generator.generateDocumentation(serverName, sessionId, format);

    if (save === 'true' || save === true) {
      const file = generator.saveDocumentation(serverName, content, format);
      res.json({ content, file });
    } else {
      // Return content with appropriate content-type
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
      } else {
        res.setHeader('Content-Type', 'text/plain');
      }

      res.send(content);
    }
  } catch (error) {
    console.error('Documentation generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/documentation/generate-all:
 *   post:
 *     summary: Generate documentation for all connected servers
 *     tags: [Documentation]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [markdown, html, json]
 *           default: markdown
 *     responses:
 *       200:
 *         description: Generated documentation for all servers
 */
router.post('/generate-all', async (req, res) => {
  try {
    const generator = getDocumentationGenerator();
    const { format = 'markdown' } = req.query;
    const sessionId = req.cookies?.sessionId;

    const results = await generator.generateAllDocumentation(sessionId, format);

    res.json({ results });
  } catch (error) {
    console.error('Documentation generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/documentation/preview/{serverName}:
 *   get:
 *     summary: Preview documentation for a server
 *     tags: [Documentation]
 *     parameters:
 *       - in: path
 *         name: serverName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [markdown, html, json]
 *           default: html
 *     responses:
 *       200:
 *         description: Documentation preview
 */
router.get('/preview/:serverName', async (req, res) => {
  try {
    const generator = getDocumentationGenerator();
    const { serverName } = req.params;
    const { format = 'html' } = req.query;
    const sessionId = req.cookies?.sessionId;

    const content = await generator.generateDocumentation(serverName, sessionId, format);

    // Set appropriate content-type
    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
    } else {
      res.setHeader('Content-Type', 'text/plain');
    }

    res.send(content);
  } catch (error) {
    console.error('Documentation preview failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

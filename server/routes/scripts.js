/**
 * Scripts Routes
 * Pre-request and post-response scripts (like Postman scripts)
 */

import { Router } from 'express';
import { getScriptRunner } from '../services/ScriptRunner.js';

const router = Router();

/**
 * @swagger
 * /api/scripts:
 *   get:
 *     summary: Get all scripts
 *     tags: [Scripts]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [pre, post]
 *         description: Filter by script type
 *     responses:
 *       200:
 *         description: List of scripts
 */
router.get('/', (req, res) => {
  try {
    const runner = getScriptRunner();
    const { type } = req.query;

    const scripts = type ? runner.getScriptsByType(type) : runner.getAllScripts();

    res.json({ scripts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/scripts/stats:
 *   get:
 *     summary: Get script statistics
 *     tags: [Scripts]
 *     responses:
 *       200:
 *         description: Script statistics
 */
router.get('/stats', (req, res) => {
  try {
    const runner = getScriptRunner();
    const stats = runner.getStatistics();

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/scripts/{id}:
 *   get:
 *     summary: Get a script by ID
 *     tags: [Scripts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Script details
 */
router.get('/:id', (req, res) => {
  try {
    const runner = getScriptRunner();
    const script = runner.getScript(req.params.id);

    res.json(script);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/scripts:
 *   post:
 *     summary: Create a new script
 *     tags: [Scripts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [pre, post]
 *                 description: "pre = before tool call, post = after response"
 *               code:
 *                 type: string
 *                 description: "JavaScript code to execute"
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Script created
 */
router.post('/', (req, res) => {
  try {
    const runner = getScriptRunner();
    const script = runner.createScript(req.body);

    res.json(script);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/scripts/{id}:
 *   put:
 *     summary: Update a script
 *     tags: [Scripts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Script updated
 */
router.put('/:id', (req, res) => {
  try {
    const runner = getScriptRunner();
    const script = runner.updateScript(req.params.id, req.body);

    res.json(script);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/scripts/{id}:
 *   delete:
 *     summary: Delete a script
 *     tags: [Scripts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Script deleted
 */
router.delete('/:id', (req, res) => {
  try {
    const runner = getScriptRunner();
    const result = runner.deleteScript(req.params.id);

    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/scripts/{id}/execute:
 *   post:
 *     summary: Execute a script manually (for testing)
 *     tags: [Scripts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               context:
 *                 type: object
 *                 description: "Execution context (variables, environment, request, response)"
 *     responses:
 *       200:
 *         description: Script execution result
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const runner = getScriptRunner();
    const script = runner.getScript(req.params.id);
    const { context = {} } = req.body;

    let result;
    if (script.type === 'pre') {
      result = await runner.executePreScript(req.params.id, context);
    } else {
      result = await runner.executePostScript(req.params.id, context, context.response || {});
    }

    res.json(result);
  } catch (error) {
    console.error('Script execution failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/scripts/validate:
 *   post:
 *     summary: Validate script syntax
 *     tags: [Scripts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/validate', (req, res) => {
  try {
    const runner = getScriptRunner();
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = runner.validateScript(code);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * Tool Explorer Routes
 * Visual tool explorer with usage statistics
 */

import { Router } from 'express';
import { getToolExplorer } from '../services/ToolExplorer.js';

const router = Router();

/**
 * @swagger
 * /api/toolexplorer/stats:
 *   get:
 *     summary: Get statistics for all tools
 *     tags: [ToolExplorer]
 *     responses:
 *       200:
 *         description: Tool statistics
 */
router.get('/stats', (req, res) => {
  try {
    const explorer = getToolExplorer();
    const stats = explorer.getAllStats();

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/stats/{serverName}/{toolName}:
 *   get:
 *     summary: Get statistics for a specific tool
 *     tags: [ToolExplorer]
 *     parameters:
 *       - in: path
 *         name: serverName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: toolName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tool statistics
 */
router.get('/stats/:serverName/:toolName', (req, res) => {
  try {
    const { serverName, toolName } = req.params;
    const explorer = getToolExplorer();
    const stats = explorer.getToolStats(serverName, toolName);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/leaderboard:
 *   get:
 *     summary: Get most used tools
 *     tags: [ToolExplorer]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Tool leaderboard
 */
router.get('/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const explorer = getToolExplorer();
    const leaderboard = explorer.getLeaderboard(limit);

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/server/{serverName}:
 *   get:
 *     summary: Get statistics for all tools on a server
 *     tags: [ToolExplorer]
 *     parameters:
 *       - in: path
 *         name: serverName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Server tool statistics
 */
router.get('/server/:serverName', (req, res) => {
  try {
    const { serverName } = req.params;
    const explorer = getToolExplorer();
    const stats = explorer.getStatsByServer(serverName);

    res.json({ serverName, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/health:
 *   get:
 *     summary: Get overall health status
 *     tags: [ToolExplorer]
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', (req, res) => {
  try {
    const explorer = getToolExplorer();
    const health = explorer.getHealthStatus();

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/trends:
 *   get:
 *     summary: Get usage trends
 *     tags: [ToolExplorer]
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Usage trends
 */
router.get('/trends', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const explorer = getToolExplorer();
    const trends = explorer.getTrends(hours);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/record:
 *   post:
 *     summary: Record tool execution
 *     tags: [ToolExplorer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serverName:
 *                 type: string
 *               toolName:
 *                 type: string
 *               duration:
 *                 type: number
 *               success:
 *                 type: boolean
 *               error:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution recorded
 */
router.post('/record', (req, res) => {
  try {
    const { serverName, toolName, duration, success, error } = req.body;

    if (!serverName || !toolName || duration === undefined || success === undefined) {
      return res.status(400).json({
        error: 'serverName, toolName, duration, and success are required'
      });
    }

    const explorer = getToolExplorer();
    explorer.recordExecution(serverName, toolName, duration, success, error);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/reset:
 *   post:
 *     summary: Reset statistics
 *     tags: [ToolExplorer]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serverName:
 *                 type: string
 *               toolName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Statistics reset
 */
router.post('/reset', (req, res) => {
  try {
    const { serverName, toolName } = req.body;
    const explorer = getToolExplorer();
    const result = explorer.resetStats(serverName, toolName);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/export:
 *   get:
 *     summary: Export statistics
 *     tags: [ToolExplorer]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Exported statistics
 */
router.get('/export', (req, res) => {
  try {
    const format = req.query.format || 'json';
    const explorer = getToolExplorer();
    const exported = explorer.exportStats(format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tool-stats.csv"');
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    res.send(exported);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/toolexplorer/example/{serverName}/{toolName}:
 *   get:
 *     summary: Get example usage for a tool
 *     tags: [ToolExplorer]
 *     parameters:
 *       - in: path
 *         name: serverName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: toolName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tool example
 */
router.get('/example/:serverName/:toolName', async (req, res) => {
  try {
    const { serverName, toolName } = req.params;
    const explorer = getToolExplorer();
    const example = await explorer.getToolExample(serverName, toolName);

    if (!example) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    res.json(example);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

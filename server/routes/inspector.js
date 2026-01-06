/**
 * Inspector Enhancement Routes
 * Advanced inspector features: timeline, bulk testing, diff
 */

import { Router } from 'express';
import { getInspectorEnhancer } from '../services/InspectorEnhancer.js';

const router = Router();

// ==========================================
// TIMELINE ROUTES
// ==========================================

/**
 * @swagger
 * /api/inspector/timeline/start:
 *   post:
 *     summary: Start tracking timeline for a session
 *     tags: [Inspector]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Timeline started
 */
router.post('/timeline/start', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const enhancer = getInspectorEnhancer();
    const result = enhancer.startTimeline(sessionId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inspector/timeline/log:
 *   post:
 *     summary: Log a timeline event
 *     tags: [Inspector]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               event:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event logged
 */
router.post('/timeline/log', (req, res) => {
  try {
    const { sessionId, event } = req.body;

    if (!sessionId || !event) {
      return res.status(400).json({ error: 'sessionId and event required' });
    }

    const enhancer = getInspectorEnhancer();
    const entry = enhancer.logEvent(sessionId, event);

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inspector/timeline/{sessionId}:
 *   get:
 *     summary: Get timeline for a session
 *     tags: [Inspector]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: serverName
 *         schema:
 *           type: string
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Timeline events
 */
router.get('/timeline/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { serverName, method, type, limit, offset } = req.query;

    const enhancer = getInspectorEnhancer();
    const timeline = enhancer.getTimeline(sessionId, {
      serverName,
      method,
      type,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inspector/timeline/{sessionId}/export:
 *   get:
 *     summary: Export timeline
 *     tags: [Inspector]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *     responses:
 *       200:
 *         description: Exported timeline
 */
router.get('/timeline/:sessionId/export', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { format = 'json' } = req.query;

    const enhancer = getInspectorEnhancer();
    const exported = enhancer.exportTimeline(sessionId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="timeline-${sessionId}.csv"`);
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
 * /api/inspector/timeline/{sessionId}/clear:
 *   delete:
 *     summary: Clear timeline
 *     tags: [Inspector]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timeline cleared
 */
router.delete('/timeline/:sessionId/clear', (req, res) => {
  try {
    const { sessionId } = req.params;

    const enhancer = getInspectorEnhancer();
    const result = enhancer.clearTimeline(sessionId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inspector/timeline/sessions:
 *   get:
 *     summary: Get all active timeline sessions
 *     tags: [Inspector]
 *     responses:
 *       200:
 *         description: Active sessions
 */
router.get('/timeline/sessions', (req, res) => {
  try {
    const enhancer = getInspectorEnhancer();
    const sessions = enhancer.getActiveSessions();

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// BULK TESTING ROUTES
// ==========================================

/**
 * @swagger
 * /api/inspector/bulk-test:
 *   post:
 *     summary: Run bulk test with multiple inputs
 *     tags: [Inspector]
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
 *               inputs:
 *                 type: array
 *                 items:
 *                   type: object
 *               parallel:
 *                 type: boolean
 *               continueOnError:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bulk test results
 */
router.post('/bulk-test', async (req, res) => {
  try {
    const { serverName, toolName, inputs, parallel, continueOnError } = req.body;

    if (!serverName || !toolName || !inputs || !Array.isArray(inputs)) {
      return res.status(400).json({
        error: 'serverName, toolName, and inputs array required',
      });
    }

    const enhancer = getInspectorEnhancer();
    const results = await enhancer.runBulkTest({
      serverName,
      toolName,
      inputs,
      parallel: parallel !== false, // default true
      continueOnError: continueOnError !== false, // default true
    });

    res.json(results);
  } catch (error) {
    console.error('Bulk test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inspector/bulk-test/{testId}:
 *   get:
 *     summary: Get bulk test results
 *     tags: [Inspector]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bulk test results
 */
router.get('/bulk-test/:testId', (req, res) => {
  try {
    const { testId } = req.params;

    const enhancer = getInspectorEnhancer();
    const results = enhancer.getBulkTestResults(testId);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DIFF ROUTES
// ==========================================

/**
 * @swagger
 * /api/inspector/diff:
 *   post:
 *     summary: Compare two tool call results
 *     tags: [Inspector]
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
 *               args1:
 *                 type: object
 *               args2:
 *                 type: object
 *               label1:
 *                 type: string
 *               label2:
 *                 type: string
 *     responses:
 *       200:
 *         description: Diff results
 */
router.post('/diff', async (req, res) => {
  try {
    const { serverName, toolName, args1, args2, label1, label2 } = req.body;

    if (!serverName || !toolName || !args1 || !args2) {
      return res.status(400).json({
        error: 'serverName, toolName, args1, and args2 required',
      });
    }

    const enhancer = getInspectorEnhancer();
    const diffResult = await enhancer.diffResults({
      serverName,
      toolName,
      args1,
      args2,
      label1,
      label2,
    });

    res.json(diffResult);
  } catch (error) {
    console.error('Diff failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inspector/diff-existing:
 *   post:
 *     summary: Compare two existing results (no execution)
 *     tags: [Inspector]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               result1:
 *                 type: object
 *               result2:
 *                 type: object
 *               label1:
 *                 type: string
 *               label2:
 *                 type: string
 *     responses:
 *       200:
 *         description: Diff results
 */
router.post('/diff-existing', (req, res) => {
  try {
    const { result1, result2, label1, label2 } = req.body;

    if (!result1 || !result2) {
      return res.status(400).json({ error: 'result1 and result2 required' });
    }

    const enhancer = getInspectorEnhancer();
    const diffResult = enhancer.diffExistingResults(result1, result2, label1, label2);

    res.json(diffResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

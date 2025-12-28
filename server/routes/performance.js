/**
 * Performance Testing Routes
 */

import express from 'express';
import { getPerformanceTester } from '../services/PerformanceTester.js';

const router = express.Router();
const tester = getPerformanceTester();

/**
 * @swagger
 * /api/performance/load:
 *   post:
 *     summary: Run load test on a tool
 *     description: Test tool performance under sustained load
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serverName
 *               - toolName
 *             properties:
 *               serverName:
 *                 type: string
 *               toolName:
 *                 type: string
 *               args:
 *                 type: object
 *               concurrency:
 *                 type: number
 *                 default: 10
 *               duration:
 *                 type: number
 *                 default: 10000
 *     responses:
 *       200:
 *         description: Load test results
 */
router.post('/load', async (req, res) => {
  try {
    const { serverName, toolName, args, concurrency, duration } = req.body;

    if (!serverName || !toolName) {
      return res.status(400).json({ error: 'serverName and toolName are required' });
    }

    const results = await tester.runLoadTest({
      serverName,
      toolName,
      args: args || {},
      concurrency: concurrency || 10,
      duration: duration || 10000,
      sessionId: req.cookies?.sessionId
    });

    res.json(results);
  } catch (error) {
    console.error('[Performance/Load] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/performance/stress:
 *   post:
 *     summary: Run stress test on a tool
 *     description: Gradually increase load to find breaking point
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serverName
 *               - toolName
 *             properties:
 *               serverName:
 *                 type: string
 *               toolName:
 *                 type: string
 *               args:
 *                 type: object
 *               startConcurrency:
 *                 type: number
 *                 default: 1
 *               maxConcurrency:
 *                 type: number
 *                 default: 50
 *               step:
 *                 type: number
 *                 default: 5
 *               stepDuration:
 *                 type: number
 *                 default: 5000
 *     responses:
 *       200:
 *         description: Stress test results
 */
router.post('/stress', async (req, res) => {
  try {
    const { serverName, toolName, args, startConcurrency, maxConcurrency, step, stepDuration } = req.body;

    if (!serverName || !toolName) {
      return res.status(400).json({ error: 'serverName and toolName are required' });
    }

    const results = await tester.runStressTest({
      serverName,
      toolName,
      args: args || {},
      startConcurrency: startConcurrency || 1,
      maxConcurrency: maxConcurrency || 50,
      step: step || 5,
      stepDuration: stepDuration || 5000,
      sessionId: req.cookies?.sessionId
    });

    res.json(results);
  } catch (error) {
    console.error('[Performance/Stress] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/performance/spike:
 *   post:
 *     summary: Run spike test on a tool
 *     description: Test tool behavior under sudden traffic spikes
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serverName
 *               - toolName
 *             properties:
 *               serverName:
 *                 type: string
 *               toolName:
 *                 type: string
 *               args:
 *                 type: object
 *               normalConcurrency:
 *                 type: number
 *                 default: 5
 *               spikeConcurrency:
 *                 type: number
 *                 default: 50
 *               normalDuration:
 *                 type: number
 *                 default: 10000
 *               spikeDuration:
 *                 type: number
 *                 default: 5000
 *     responses:
 *       200:
 *         description: Spike test results
 */
router.post('/spike', async (req, res) => {
  try {
    const {
      serverName,
      toolName,
      args,
      normalConcurrency,
      spikeConcurrency,
      normalDuration,
      spikeDuration
    } = req.body;

    if (!serverName || !toolName) {
      return res.status(400).json({ error: 'serverName and toolName are required' });
    }

    const results = await tester.runSpikeTest({
      serverName,
      toolName,
      args: args || {},
      normalConcurrency: normalConcurrency || 5,
      spikeConcurrency: spikeConcurrency || 50,
      normalDuration: normalDuration || 10000,
      spikeDuration: spikeDuration || 5000,
      sessionId: req.cookies?.sessionId
    });

    res.json(results);
  } catch (error) {
    console.error('[Performance/Spike] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/performance/tests:
 *   get:
 *     summary: Get active performance tests
 *     description: Returns list of currently running tests
 *     tags: [Performance]
 *     responses:
 *       200:
 *         description: List of active tests
 */
router.get('/tests', (req, res) => {
  try {
    const activeTests = tester.getActiveTests();
    res.json({ tests: activeTests });
  } catch (error) {
    console.error('[Performance/Tests] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/performance/tests/{testId}:
 *   get:
 *     summary: Get test status
 *     description: Returns status of a specific test
 *     tags: [Performance]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test status
 */
router.get('/tests/:testId', (req, res) => {
  try {
    const { testId } = req.params;
    const test = tester.getTestStatus(testId);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    console.error('[Performance/TestStatus] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/performance/tests/{testId}/cancel:
 *   post:
 *     summary: Cancel a running test
 *     description: Cancels an active performance test
 *     tags: [Performance]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test cancelled
 */
router.post('/tests/:testId/cancel', (req, res) => {
  try {
    const { testId } = req.params;
    const success = tester.cancelTest(testId);

    if (!success) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ success: true, message: 'Test cancelled' });
  } catch (error) {
    console.error('[Performance/Cancel] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * Monitors Routes
 * Scheduled test execution (like Postman Monitors)
 */

import { Router } from 'express';
import { getMonitorManager } from '../services/MonitorManager.js';

const router = Router();

/**
 * @swagger
 * /api/monitors:
 *   get:
 *     summary: Get all monitors
 *     tags: [Monitors]
 *     responses:
 *       200:
 *         description: List of monitors
 */
router.get('/', (req, res) => {
  try {
    const manager = getMonitorManager();
    const monitors = manager.getAllMonitors();

    res.json({ monitors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors/stats:
 *   get:
 *     summary: Get monitor statistics
 *     tags: [Monitors]
 *     responses:
 *       200:
 *         description: Monitor statistics
 */
router.get('/stats', (req, res) => {
  try {
    const manager = getMonitorManager();
    const stats = manager.getStatistics();

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors/{id}:
 *   get:
 *     summary: Get a monitor by ID
 *     tags: [Monitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor details
 */
router.get('/:id', (req, res) => {
  try {
    const manager = getMonitorManager();
    const monitor = manager.getMonitor(req.params.id);

    res.json(monitor);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors:
 *   post:
 *     summary: Create a new monitor
 *     tags: [Monitors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               collectionId:
 *                 type: string
 *               schedule:
 *                 type: string
 *                 description: "Format: 5m, 1h, 30s, or cron */5 * * * *"
 *               environment:
 *                 type: object
 *               enabled:
 *                 type: boolean
 *               notifications:
 *                 type: array
 *     responses:
 *       200:
 *         description: Monitor created
 */
router.post('/', (req, res) => {
  try {
    const manager = getMonitorManager();
    const monitor = manager.createMonitor(req.body);

    res.json(monitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors/{id}:
 *   put:
 *     summary: Update a monitor
 *     tags: [Monitors]
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
 *         description: Monitor updated
 */
router.put('/:id', (req, res) => {
  try {
    const manager = getMonitorManager();
    const monitor = manager.updateMonitor(req.params.id, req.body);

    res.json(monitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors/{id}:
 *   delete:
 *     summary: Delete a monitor
 *     tags: [Monitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor deleted
 */
router.delete('/:id', (req, res) => {
  try {
    const manager = getMonitorManager();
    const result = manager.deleteMonitor(req.params.id);

    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors/{id}/run:
 *   post:
 *     summary: Manually execute a monitor
 *     tags: [Monitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor execution results
 */
router.post('/:id/run', async (req, res) => {
  try {
    const manager = getMonitorManager();
    const results = await manager.executeMonitor(req.params.id);

    res.json(results);
  } catch (error) {
    console.error('Monitor execution failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors/{id}/start:
 *   post:
 *     summary: Start a monitor
 *     tags: [Monitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor started
 */
router.post('/:id/start', (req, res) => {
  try {
    const manager = getMonitorManager();
    manager.startMonitor(req.params.id);

    res.json({ success: true, message: 'Monitor started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monitors/{id}/stop:
 *   post:
 *     summary: Stop a monitor
 *     tags: [Monitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor stopped
 */
router.post('/:id/stop', (req, res) => {
  try {
    const manager = getMonitorManager();
    manager.stopMonitor(req.params.id);

    res.json({ success: true, message: 'Monitor stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

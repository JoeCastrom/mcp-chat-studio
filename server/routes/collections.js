/**
 * Collections Routes
 * Organize scenarios into collections (like Postman)
 */

import { Router } from 'express';
import { getCollectionManager } from '../services/CollectionManager.js';

const router = Router();

/**
 * @swagger
 * /api/collections:
 *   get:
 *     summary: Get all collections
 *     tags: [Collections]
 *     responses:
 *       200:
 *         description: List of collections
 */
router.get('/', (req, res) => {
  try {
    const manager = getCollectionManager();
    const collections = manager.getAllCollections();

    res.json({ collections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/stats:
 *   get:
 *     summary: Get collection statistics
 *     tags: [Collections]
 *     responses:
 *       200:
 *         description: Collection statistics
 */
router.get('/stats', (req, res) => {
  try {
    const manager = getCollectionManager();
    const stats = manager.getStatistics();

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}:
 *   get:
 *     summary: Get a collection by ID
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection details
 */
router.get('/:id', (req, res) => {
  try {
    const manager = getCollectionManager();
    const collection = manager.getCollection(req.params.id);

    res.json(collection);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections:
 *   post:
 *     summary: Create a new collection
 *     tags: [Collections]
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
 *               scenarios:
 *                 type: array
 *               variables:
 *                 type: object
 *     responses:
 *       200:
 *         description: Collection created
 */
router.post('/', (req, res) => {
  try {
    const manager = getCollectionManager();
    const collection = manager.createCollection(req.body);

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}:
 *   put:
 *     summary: Update a collection
 *     tags: [Collections]
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
 *         description: Collection updated
 */
router.put('/:id', (req, res) => {
  try {
    const manager = getCollectionManager();
    const collection = manager.updateCollection(req.params.id, req.body);

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}:
 *   delete:
 *     summary: Delete a collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection deleted
 */
router.delete('/:id', (req, res) => {
  try {
    const manager = getCollectionManager();
    const result = manager.deleteCollection(req.params.id);

    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}/scenarios:
 *   post:
 *     summary: Add scenario to collection
 *     tags: [Collections]
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
 *         description: Scenario added
 */
router.post('/:id/scenarios', (req, res) => {
  try {
    const manager = getCollectionManager();
    const collection = manager.addScenario(req.params.id, req.body);

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}/scenarios/{scenarioId}:
 *   delete:
 *     summary: Remove scenario from collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario removed
 */
router.delete('/:id/scenarios/:scenarioId', (req, res) => {
  try {
    const manager = getCollectionManager();
    const collection = manager.removeScenario(req.params.id, req.params.scenarioId);

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}/run:
 *   post:
 *     summary: Run all scenarios in collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               environment:
 *                 type: object
 *               stopOnError:
 *                 type: boolean
 *               delay:
 *                 type: number
 *     responses:
 *       200:
 *         description: Collection run results
 */
router.post('/:id/run', async (req, res) => {
  try {
    const manager = getCollectionManager();
    const results = await manager.runCollection(req.params.id, req.body);

    res.json(results);
  } catch (error) {
    console.error('Collection run failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}/fork:
 *   post:
 *     summary: Fork (duplicate) a collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Forked collection
 */
router.post('/:id/fork', (req, res) => {
  try {
    const manager = getCollectionManager();
    const forked = manager.forkCollection(req.params.id, req.body.name);

    res.json(forked);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/{id}/export:
 *   get:
 *     summary: Export collection as JSON
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection JSON
 */
router.get('/:id/export', (req, res) => {
  try {
    const manager = getCollectionManager();
    const json = manager.exportCollection(req.params.id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="collection-${req.params.id}.json"`);
    res.send(json);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/import:
 *   post:
 *     summary: Import collection from JSON
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Imported collection
 */
router.post('/import', (req, res) => {
  try {
    const manager = getCollectionManager();
    const collection = manager.importCollection(req.body);

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

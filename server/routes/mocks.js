/**
 * Mock Servers Routes
 * Create runtime mock MCP servers (like Postman Mock Servers)
 */

import { Router } from 'express';
import { getMockServerManager } from '../services/MockServerManager.js';

const router = Router();

/**
 * @swagger
 * /api/mocks:
 *   get:
 *     summary: Get all mock servers
 *     tags: [Mocks]
 *     responses:
 *       200:
 *         description: List of mock servers
 */
router.get('/', (req, res) => {
  try {
    const manager = getMockServerManager();
    const mocks = manager.getAllMocks();

    res.json({ mocks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/stats:
 *   get:
 *     summary: Get mock server statistics
 *     tags: [Mocks]
 *     responses:
 *       200:
 *         description: Mock server statistics
 */
router.get('/stats', (req, res) => {
  try {
    const manager = getMockServerManager();
    const stats = manager.getStatistics();

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}:
 *   get:
 *     summary: Get a mock server by ID
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mock server details
 */
router.get('/:id', (req, res) => {
  try {
    const manager = getMockServerManager();
    const mock = manager.getMock(req.params.id);

    res.json(mock);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks:
 *   post:
 *     summary: Create a new mock server
 *     tags: [Mocks]
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
 *               tools:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     inputSchema:
 *                       type: object
 *                     response:
 *                       type: object
 *               resources:
 *                 type: array
 *               prompts:
 *                 type: array
 *               delay:
 *                 type: number
 *                 description: "Simulated delay in ms"
 *               errorRate:
 *                 type: number
 *                 description: "Error rate (0-1)"
 *     responses:
 *       200:
 *         description: Mock server created
 */
router.post('/', (req, res) => {
  try {
    const manager = getMockServerManager();
    const mock = manager.createMock(req.body);

    res.json(mock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}:
 *   put:
 *     summary: Update a mock server
 *     tags: [Mocks]
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
 *         description: Mock server updated
 */
router.put('/:id', (req, res) => {
  try {
    const manager = getMockServerManager();
    const mock = manager.updateMock(req.params.id, req.body);

    res.json(mock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}:
 *   delete:
 *     summary: Delete a mock server
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mock server deleted
 */
router.delete('/:id', (req, res) => {
  try {
    const manager = getMockServerManager();
    const result = manager.deleteMock(req.params.id);

    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}/tools:
 *   get:
 *     summary: List tools for a mock server
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tools
 */
router.get('/:id/tools', (req, res) => {
  try {
    const manager = getMockServerManager();
    const tools = manager.listTools(req.params.id);

    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}/tools/{toolName}/call:
 *   post:
 *     summary: Call a tool on a mock server
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: toolName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Tool arguments
 *     responses:
 *       200:
 *         description: Tool call result
 */
router.post('/:id/tools/:toolName/call', async (req, res) => {
  try {
    const manager = getMockServerManager();
    const result = await manager.callTool(req.params.id, req.params.toolName, req.body);

    res.json(result);
  } catch (error) {
    console.error('Mock tool call failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}/resources:
 *   get:
 *     summary: List resources for a mock server
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of resources
 */
router.get('/:id/resources', (req, res) => {
  try {
    const manager = getMockServerManager();
    const resources = manager.listResources(req.params.id);

    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}/resources/read:
 *   post:
 *     summary: Read a resource from a mock server
 *     tags: [Mocks]
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
 *               uri:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resource content
 */
router.post('/:id/resources/read', async (req, res) => {
  try {
    const manager = getMockServerManager();
    const result = await manager.getResource(req.params.id, req.body.uri);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}/prompts:
 *   get:
 *     summary: List prompts for a mock server
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of prompts
 */
router.get('/:id/prompts', (req, res) => {
  try {
    const manager = getMockServerManager();
    const prompts = manager.listPrompts(req.params.id);

    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}/prompts/{promptName}/get:
 *   post:
 *     summary: Get a prompt from a mock server
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: promptName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Prompt arguments
 *     responses:
 *       200:
 *         description: Prompt content
 */
router.post('/:id/prompts/:promptName/get', async (req, res) => {
  try {
    const manager = getMockServerManager();
    const result = await manager.getPrompt(req.params.id, req.params.promptName, req.body);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/{id}/reset:
 *   post:
 *     summary: Reset call statistics for a mock server
 *     tags: [Mocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistics reset
 */
router.post('/:id/reset', (req, res) => {
  try {
    const manager = getMockServerManager();
    const result = manager.resetStats(req.params.id);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mocks/from-collection:
 *   post:
 *     summary: Create mock server from a collection
 *     tags: [Mocks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collectionId:
 *                 type: string
 *               collectionName:
 *                 type: string
 *               scenarios:
 *                 type: array
 *     responses:
 *       200:
 *         description: Mock server created from collection
 */
router.post('/from-collection', (req, res) => {
  try {
    const manager = getMockServerManager();
    const { collectionId, collectionName, scenarios } = req.body;

    if (!collectionId || !collectionName || !scenarios) {
      return res
        .status(400)
        .json({ error: 'collectionId, collectionName, and scenarios are required' });
    }

    const mock = manager.createFromCollection(collectionId, collectionName, scenarios);

    res.json(mock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

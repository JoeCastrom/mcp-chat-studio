/**
 * Contract Testing Routes
 * Consumer-driven contract testing for MCP servers
 */

import { Router } from 'express';
import { getContractTester } from '../services/ContractTester.js';

const router = Router();

/**
 * @swagger
 * /api/contracts:
 *   get:
 *     summary: Get all contracts
 *     tags: [Contracts]
 *     responses:
 *       200:
 *         description: List of contracts
 */
router.get('/', (req, res) => {
  try {
    const tester = getContractTester();
    const contracts = tester.getAllContracts();

    res.json({ contracts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{name}:
 *   get:
 *     summary: Get a contract by name
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract details
 */
router.get('/:name', (req, res) => {
  try {
    const tester = getContractTester();
    const contract = tester.loadContract(req.params.name);

    res.json(contract);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts:
 *   post:
 *     summary: Define a new contract
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               server:
 *                 type: string
 *               version:
 *                 type: string
 *               tests:
 *                 type: array
 *     responses:
 *       200:
 *         description: Contract created
 */
router.post('/', (req, res) => {
  try {
    const tester = getContractTester();
    const contract = tester.defineContract(req.body);

    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{name}:
 *   put:
 *     summary: Update a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: name
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
 *         description: Contract updated
 */
router.put('/:name', (req, res) => {
  try {
    const tester = getContractTester();
    const contract = tester.updateContract(req.params.name, req.body);

    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{name}:
 *   delete:
 *     summary: Delete a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract deleted
 */
router.delete('/:name', (req, res) => {
  try {
    const tester = getContractTester();
    const result = tester.deleteContract(req.params.name);

    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{name}/run:
 *   post:
 *     summary: Run contract tests
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test results
 */
router.post('/:name/run', async (req, res) => {
  try {
    const tester = getContractTester();
    const results = await tester.runContract(req.params.name);

    res.json(results);
  } catch (error) {
    console.error('Contract test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/generate:
 *   post:
 *     summary: Generate contract from tool
 *     tags: [Contracts]
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
 *     responses:
 *       200:
 *         description: Generated contract
 */
router.post('/generate', async (req, res) => {
  try {
    const { serverName, toolName } = req.body;

    if (!serverName || !toolName) {
      return res.status(400).json({ error: 'serverName and toolName required' });
    }

    const tester = getContractTester();
    const contract = await tester.generateContractFromTool(serverName, toolName);

    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

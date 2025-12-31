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
 * /api/contracts/{id}:
 *   get:
 *     summary: Get a contract by name
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract details
 */
router.get('/:id', (req, res) => {
  try {
    const tester = getContractTester();
    const contract = tester.loadContract(req.params.id);

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
 *               server:
 *                 type: string
 *               toolName:
 *                 type: string
 *               version:
 *                 type: string
 *               schema:
 *                 type: object
 *               sampleArgs:
 *                 type: object
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
 * /api/contracts/{id}:
 *   put:
 *     summary: Update a contract
 *     tags: [Contracts]
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
 *         description: Contract updated
 */
router.put('/:id', (req, res) => {
  try {
    const tester = getContractTester();
    const contract = tester.updateContract(req.params.id, req.body);

    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{id}:
 *   delete:
 *     summary: Delete a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract deleted
 */
router.delete('/:id', (req, res) => {
  try {
    const tester = getContractTester();
    const result = tester.deleteContract(req.params.id);

    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{id}/validate:
 *   post:
 *     summary: Validate a contract against live tool output
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Validation results
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const tester = getContractTester();
    const result = await tester.validateContract(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{id}/breaking-changes:
 *   get:
 *     summary: Detect breaking changes against baseline response
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Breaking change report
 */
router.get('/:id/breaking-changes', async (req, res) => {
  try {
    const tester = getContractTester();
    const result = await tester.detectBreakingChanges(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/pre-deployment-check:
 *   post:
 *     summary: Validate all contracts before deployment
 *     tags: [Contracts]
 *     responses:
 *       200:
 *         description: Validation summary
 */
router.post('/pre-deployment-check', async (req, res) => {
  try {
    const tester = getContractTester();
    const result = await tester.preDeploymentCheck();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/contracts/{id}/run:
 *   post:
 *     summary: Run contract tests
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test results
 */
router.post('/:id/run', async (req, res) => {
  try {
    const tester = getContractTester();
    const results = await tester.runContract(req.params.id);

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

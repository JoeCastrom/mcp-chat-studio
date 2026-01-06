import { Router } from 'express';
import { getWorkflowEngine } from '../services/WorkflowEngine.js';
import { getWorkflowExporter } from '../services/WorkflowExporter.js';
import { getWorkflowDebugger } from '../services/WorkflowDebugger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getSessionId(req) {
  return req.headers['x-session-id'] || req.cookies?.sessionId || req.sessionID || null;
}

// Helper to load LLM config for execution
function loadLLMConfig() {
  try {
    const configPath = join(__dirname, '../../config.yaml');
    const configContent = readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    // Substitute env vars if needed (simplified here)
    return config.llm || {};
  } catch (error) {
    return { provider: 'ollama', model: 'llama3.2' };
  }
}

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: List all workflows
 *     description: Returns all saved workflows
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: Array of workflows
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   nodes:
 *                     type: array
 *                   edges:
 *                     type: array
 */
router.get('/', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflows = engine.getAllWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/workflows/{id}:
 *   get:
 *     summary: Get a single workflow
 *     description: Returns workflow by ID
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow object
 *       404:
 *         description: Workflow not found
 */
router.get('/:id', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflow = engine.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows
 * Save (create or update) a workflow
 */
router.post('/', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const id = engine.saveWorkflow(req.body);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
router.delete('/:id', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    engine.deleteWorkflow(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/execute
 * Execute a workflow
 */
router.post('/:id/execute', async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'null' || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Workflow id is required', status: 'error' });
    }
    const { input, llmConfig } = req.body;
    const engine = getWorkflowEngine();

    // Use provided config or fallback to file-based load
    const configToUse = llmConfig || loadLLMConfig();

    const sessionId = getSessionId(req);
    const result = await engine.executeWorkflow(req.params.id, input, configToUse, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Workflow execution failed:', error);
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

/**
 * GET /api/workflows/:id/export
 * Export a workflow to code
 */
router.get('/:id/export', async (req, res) => {
  try {
    const { format = 'python' } = req.query;
    const engine = getWorkflowEngine();
    const exporter = getWorkflowExporter();

    const workflow = engine.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const code = await exporter.exportWorkflow(workflow, format);

    // Return as text/plain
    res.setHeader('Content-Type', 'text/plain');
    res.send(code);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// WORKFLOW DEBUGGER ROUTES
// ==========================================

/**
 * POST /api/workflows/:id/debug/start
 * Start a debug session for a workflow
 */
router.post('/:id/debug/start', async (req, res) => {
  try {
    const { input, breakpoints, stepMode, llmConfig } = req.body;
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const session = await workflowDebugger.startDebugSession(req.params.id, input || {}, {
      breakpoints: breakpoints || [],
      stepMode: stepMode || false,
      llmConfig: llmConfig || loadLLMConfig(),
    });

    res.json(session);
  } catch (error) {
    console.error('Failed to start debug session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/debug/:sessionId/execute
 * Execute workflow in debug mode
 */
router.post('/debug/:sessionId/execute', async (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    // Start execution async and return immediately
    workflowDebugger.executeWithDebug(req.params.sessionId).catch(err => {
      console.error('Debug execution error:', err);
    });

    res.json({ status: 'started', sessionId: req.params.sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/debug/:sessionId/resume
 * Resume paused execution
 */
router.post('/debug/:sessionId/resume', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const result = workflowDebugger.resume(req.params.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/debug/:sessionId/step
 * Step to next node
 */
router.post('/debug/:sessionId/step', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const result = workflowDebugger.step(req.params.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/debug/:sessionId/abort
 * Abort execution
 */
router.post('/debug/:sessionId/abort', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const result = workflowDebugger.abort(req.params.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/debug/:sessionId/state
 * Get current debug state
 */
router.get('/debug/:sessionId/state', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const state = workflowDebugger.getState(req.params.sessionId);
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/debug/:sessionId/variables
 * Inspect variables at current state
 */
router.get('/debug/:sessionId/variables', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const variables = workflowDebugger.inspectVariables(req.params.sessionId);
    res.json(variables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/debug/:sessionId/breakpoint/add
 * Add breakpoint
 */
router.post('/debug/:sessionId/breakpoint/add', (req, res) => {
  try {
    const { nodeId } = req.body;
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const result = workflowDebugger.addBreakpoint(req.params.sessionId, nodeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/debug/:sessionId/breakpoint/remove
 * Remove breakpoint
 */
router.post('/debug/:sessionId/breakpoint/remove', (req, res) => {
  try {
    const { nodeId } = req.body;
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const result = workflowDebugger.removeBreakpoint(req.params.sessionId, nodeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/debug/:sessionId
 * End debug session
 */
router.delete('/debug/:sessionId', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const result = workflowDebugger.endSession(req.params.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/debug/sessions
 * Get all active debug sessions
 */
router.get('/debug/sessions', (req, res) => {
  try {
    const engine = getWorkflowEngine();
    const workflowDebugger = getWorkflowDebugger(engine);

    const sessions = workflowDebugger.getActiveSessions();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

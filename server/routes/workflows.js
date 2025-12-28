import { Router } from 'express';
import { getWorkflowEngine } from '../services/WorkflowEngine.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * GET /api/workflows
 * List all workflows
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
 * GET /api/workflows/:id
 * Get a single workflow
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
    const { input, llmConfig } = req.body;
    const engine = getWorkflowEngine();
    
    // Use provided config or fallback to file-based load
    const configToUse = llmConfig || loadLLMConfig();
    
    const result = await engine.executeWorkflow(req.params.id, input, configToUse);
    res.json(result);
  } catch (error) {
    console.error('Workflow execution failed:', error);
    res.status(500).json({ error: error.message, status: 'error' });
  }
});

export default router;

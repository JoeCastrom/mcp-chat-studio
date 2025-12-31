/**
 * Workspace Templates Routes
 * Persist workspace bundles for team/Git sharing
 */

import { Router } from 'express';
import { getWorkspaceTemplateManager } from '../services/WorkspaceTemplateManager.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const manager = getWorkspaceTemplateManager();
    const templates = manager.listTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const manager = getWorkspaceTemplateManager();
    const template = manager.getTemplate(req.params.id);
    res.json(template);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const manager = getWorkspaceTemplateManager();
    const template = manager.createTemplate(req.body);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const manager = getWorkspaceTemplateManager();
    const template = manager.updateTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const manager = getWorkspaceTemplateManager();
    const result = manager.deleteTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

export default router;

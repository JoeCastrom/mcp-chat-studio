/**
 * Workspace Template Manager
 * Persist workspace bundles to disk for team/Git sharing
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WorkspaceTemplateManager {
  constructor() {
    this.templatesFile = join(__dirname, '../../data/workspace-templates.json');
    this.templates = new Map();

    const dataDir = dirname(this.templatesFile);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.loadTemplates();
  }

  loadTemplates() {
    try {
      if (!existsSync(this.templatesFile)) return;
      const content = readFileSync(this.templatesFile, 'utf8');
      const data = JSON.parse(content);
      data.forEach(template => {
        this.templates.set(template.id, template);
      });
      console.log(`[WorkspaceTemplateManager] Loaded ${this.templates.size} templates`);
    } catch (error) {
      console.error('[WorkspaceTemplateManager] Failed to load templates:', error.message);
    }
  }

  saveTemplates() {
    try {
      const data = Array.from(this.templates.values());
      writeFileSync(this.templatesFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[WorkspaceTemplateManager] Failed to save templates:', error.message);
    }
  }

  listTemplates() {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  getTemplate(id) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }
    return template;
  }

  createTemplate(data) {
    const { name, description = '', bundle } = data;
    if (!name) {
      throw new Error('Template name is required');
    }
    if (!bundle) {
      throw new Error('Workspace bundle is required');
    }

    const template = {
      id: this.generateId(),
      name,
      description,
      bundle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(template.id, template);
    this.saveTemplates();
    return template;
  }

  updateTemplate(id, updates) {
    const template = this.getTemplate(id);
    const updated = {
      ...template,
      ...updates,
      id: template.id,
      updatedAt: new Date().toISOString(),
    };

    if (!updated.name) {
      throw new Error('Template name is required');
    }
    if (!updated.bundle) {
      throw new Error('Workspace bundle is required');
    }

    this.templates.set(id, updated);
    this.saveTemplates();
    return updated;
  }

  deleteTemplate(id) {
    this.getTemplate(id);
    this.templates.delete(id);
    this.saveTemplates();
    return { success: true };
  }

  generateId() {
    return `workspace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

let instance = null;
export function getWorkspaceTemplateManager() {
  if (!instance) {
    instance = new WorkspaceTemplateManager();
  }
  return instance;
}

export default WorkspaceTemplateManager;

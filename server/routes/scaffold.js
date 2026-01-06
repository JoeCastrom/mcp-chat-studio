/**
 * MCP Server Scaffolding Routes
 */

import express from 'express';
import { getMCPScaffolder } from '../services/MCPScaffolder.js';

const router = express.Router();
const scaffolder = getMCPScaffolder();

/**
 * @swagger
 * /api/scaffold/generate:
 *   post:
 *     summary: Generate MCP server project
 *     description: Generate a complete MCP server project with best practices
 *     tags: [Scaffold]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - language
 *             properties:
 *               name:
 *                 type: string
 *                 description: Project name
 *               language:
 *                 type: string
 *                 enum: [python, nodejs, typescript]
 *                 description: Programming language
 *               description:
 *                 type: string
 *                 description: Project description
 *               tools:
 *                 type: array
 *                 description: Tool definitions
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     inputSchema:
 *                       type: object
 *     responses:
 *       200:
 *         description: Generated project files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: object
 *       400:
 *         description: Invalid request
 */
router.post('/generate', (req, res) => {
  try {
    const { name, language, description, tools } = req.body;

    if (!name || !language) {
      return res.status(400).json({
        error: 'name and language are required',
      });
    }

    const files = scaffolder.generateProject({
      name,
      language,
      description,
      tools: tools || [],
    });

    res.json({
      success: true,
      files,
      fileCount: Object.keys(files).length,
    });
  } catch (error) {
    console.error('[Scaffold] Generation error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/scaffold/templates:
 *   get:
 *     summary: Get available project templates
 *     description: Returns list of available scaffolding templates
 *     tags: [Scaffold]
 *     responses:
 *       200:
 *         description: List of templates
 */
router.get('/templates', (req, res) => {
  res.json({
    templates: [
      {
        id: 'python-basic',
        name: 'Python FastMCP Basic',
        language: 'python',
        description: 'Basic Python MCP server using FastMCP',
      },
      {
        id: 'nodejs-basic',
        name: 'Node.js MCP SDK Basic',
        language: 'nodejs',
        description: 'Basic Node.js MCP server using official SDK',
      },
      {
        id: 'typescript-basic',
        name: 'TypeScript MCP SDK Basic',
        language: 'typescript',
        description: 'Basic TypeScript MCP server with type safety',
      },
    ],
  });
});

export default router;

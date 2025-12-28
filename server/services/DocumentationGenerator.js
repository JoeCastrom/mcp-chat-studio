/**
 * Documentation Generator
 * Auto-generate documentation for MCP servers (like Postman documentation)
 */

import { getMCPManager } from './MCPManager.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DocumentationGenerator {
  constructor() {
    this.docsDir = join(__dirname, '../../docs');

    // Ensure docs directory exists
    if (!existsSync(this.docsDir)) {
      mkdirSync(this.docsDir, { recursive: true });
    }
  }

  /**
   * Generate documentation for a server
   */
  async generateDocumentation(serverName, sessionId, format = 'markdown') {
    const mcpManager = getMCPManager();

    // Get server capabilities
    const tools = await mcpManager.listTools(serverName, sessionId);
    const resources = await mcpManager.listResources(serverName, sessionId);
    const prompts = await mcpManager.listPrompts(serverName, sessionId);

    const doc = {
      serverName,
      generatedAt: new Date().toISOString(),
      tools: tools.tools || [],
      resources: resources.resources || [],
      prompts: prompts.prompts || []
    };

    if (format === 'markdown') {
      return this.generateMarkdown(doc);
    } else if (format === 'html') {
      return this.generateHTML(doc);
    } else if (format === 'json') {
      return this.generateJSON(doc);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate Markdown documentation
   */
  generateMarkdown(doc) {
    let md = `# ${doc.serverName} Documentation\n\n`;
    md += `*Generated: ${new Date(doc.generatedAt).toLocaleString()}*\n\n`;
    md += `---\n\n`;

    // Table of Contents
    md += `## Table of Contents\n\n`;
    if (doc.tools.length > 0) md += `- [Tools](#tools) (${doc.tools.length})\n`;
    if (doc.resources.length > 0) md += `- [Resources](#resources) (${doc.resources.length})\n`;
    if (doc.prompts.length > 0) md += `- [Prompts](#prompts) (${doc.prompts.length})\n`;
    md += `\n---\n\n`;

    // Tools section
    if (doc.tools.length > 0) {
      md += `## Tools\n\n`;
      md += `This server provides ${doc.tools.length} tool(s).\n\n`;

      for (const tool of doc.tools) {
        md += `### \`${tool.name}\`\n\n`;

        if (tool.description) {
          md += `${tool.description}\n\n`;
        }

        // Input Schema
        if (tool.inputSchema) {
          md += `**Input Schema:**\n\n`;
          md += '```json\n';
          md += JSON.stringify(tool.inputSchema, null, 2);
          md += '\n```\n\n';

          // Generate parameter table if properties exist
          if (tool.inputSchema.properties) {
            md += `**Parameters:**\n\n`;
            md += `| Name | Type | Required | Description |\n`;
            md += `|------|------|----------|-------------|\n`;

            const required = tool.inputSchema.required || [];

            for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
              const type = schema.type || 'any';
              const isRequired = required.includes(name) ? 'Yes' : 'No';
              const description = schema.description || '-';

              md += `| \`${name}\` | ${type} | ${isRequired} | ${description} |\n`;
            }

            md += `\n`;
          }
        }

        md += `**Example:**\n\n`;
        md += '```json\n';
        md += JSON.stringify(this.generateExample(tool), null, 2);
        md += '\n```\n\n';

        md += `---\n\n`;
      }
    }

    // Resources section
    if (doc.resources.length > 0) {
      md += `## Resources\n\n`;
      md += `This server provides ${doc.resources.length} resource(s).\n\n`;

      for (const resource of doc.resources) {
        md += `### \`${resource.uri || resource.name}\`\n\n`;

        if (resource.name && resource.uri !== resource.name) {
          md += `**Name:** ${resource.name}\n\n`;
        }

        if (resource.description) {
          md += `${resource.description}\n\n`;
        }

        if (resource.mimeType) {
          md += `**MIME Type:** \`${resource.mimeType}\`\n\n`;
        }

        md += `---\n\n`;
      }
    }

    // Prompts section
    if (doc.prompts.length > 0) {
      md += `## Prompts\n\n`;
      md += `This server provides ${doc.prompts.length} prompt(s).\n\n`;

      for (const prompt of doc.prompts) {
        md += `### \`${prompt.name}\`\n\n`;

        if (prompt.description) {
          md += `${prompt.description}\n\n`;
        }

        // Arguments
        if (prompt.arguments && prompt.arguments.length > 0) {
          md += `**Arguments:**\n\n`;
          md += `| Name | Required | Description |\n`;
          md += `|------|----------|-------------|\n`;

          for (const arg of prompt.arguments) {
            const required = arg.required ? 'Yes' : 'No';
            const description = arg.description || '-';

            md += `| \`${arg.name}\` | ${required} | ${description} |\n`;
          }

          md += `\n`;
        }

        md += `---\n\n`;
      }
    }

    // Footer
    md += `---\n\n`;
    md += `*Documentation generated by MCP Chat Studio*\n`;

    return md;
  }

  /**
   * Generate HTML documentation
   */
  generateHTML(doc) {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.serverName} Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      margin-bottom: 40px;
      border-radius: 8px;
    }
    h1 { font-size: 2.5em; margin-bottom: 10px; }
    h2 {
      color: #667eea;
      margin: 30px 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    h3 {
      background: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #667eea;
      margin: 20px 0 15px 0;
      font-family: 'Monaco', 'Courier New', monospace;
    }
    .card {
      background: white;
      padding: 30px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .description { margin: 15px 0; color: #666; }
    pre {
      background: #282c34;
      color: #abb2bf;
      padding: 20px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 15px 0;
    }
    code {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #667eea;
    }
    tr:hover { background: #f8f9fa; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .badge-yes { background: #d4edda; color: #155724; }
    .badge-no { background: #f8d7da; color: #721c24; }
    .toc {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .toc ul { list-style: none; }
    .toc li { margin: 8px 0; }
    .toc a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .toc a:hover { text-decoration: underline; }
    footer {
      text-align: center;
      margin-top: 60px;
      padding: 20px;
      color: #999;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${doc.serverName}</h1>
      <p>Generated: ${new Date(doc.generatedAt).toLocaleString()}</p>
    </header>

    <div class="toc card">
      <h2>Table of Contents</h2>
      <ul>
        ${doc.tools.length > 0 ? `<li><a href="#tools">Tools (${doc.tools.length})</a></li>` : ''}
        ${doc.resources.length > 0 ? `<li><a href="#resources">Resources (${doc.resources.length})</a></li>` : ''}
        ${doc.prompts.length > 0 ? `<li><a href="#prompts">Prompts (${doc.prompts.length})</a></li>` : ''}
      </ul>
    </div>
`;

    // Tools section
    if (doc.tools.length > 0) {
      html += `    <div class="card">\n`;
      html += `      <h2 id="tools">Tools</h2>\n`;
      html += `      <p class="description">This server provides ${doc.tools.length} tool(s).</p>\n`;

      for (const tool of doc.tools) {
        html += `      <h3>${tool.name}</h3>\n`;

        if (tool.description) {
          html += `      <p class="description">${tool.description}</p>\n`;
        }

        if (tool.inputSchema && tool.inputSchema.properties) {
          html += `      <h4>Parameters:</h4>\n`;
          html += `      <table>\n`;
          html += `        <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>\n`;
          html += `        <tbody>\n`;

          const required = tool.inputSchema.required || [];

          for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
            const type = schema.type || 'any';
            const isRequired = required.includes(name);
            const badge = isRequired ? 'badge-yes' : 'badge-no';
            const description = schema.description || '-';

            html += `          <tr>
            <td><code>${name}</code></td>
            <td>${type}</td>
            <td><span class="badge ${badge}">${isRequired ? 'Yes' : 'No'}</span></td>
            <td>${description}</td>
          </tr>\n`;
          }

          html += `        </tbody>\n`;
          html += `      </table>\n`;
        }

        html += `      <h4>Example:</h4>\n`;
        html += `      <pre><code>${JSON.stringify(this.generateExample(tool), null, 2)}</code></pre>\n`;
      }

      html += `    </div>\n\n`;
    }

    // Resources section
    if (doc.resources.length > 0) {
      html += `    <div class="card">\n`;
      html += `      <h2 id="resources">Resources</h2>\n`;
      html += `      <p class="description">This server provides ${doc.resources.length} resource(s).</p>\n`;

      for (const resource of doc.resources) {
        html += `      <h3>${resource.uri || resource.name}</h3>\n`;

        if (resource.description) {
          html += `      <p class="description">${resource.description}</p>\n`;
        }

        if (resource.mimeType) {
          html += `      <p><strong>MIME Type:</strong> <code>${resource.mimeType}</code></p>\n`;
        }
      }

      html += `    </div>\n\n`;
    }

    // Prompts section
    if (doc.prompts.length > 0) {
      html += `    <div class="card">\n`;
      html += `      <h2 id="prompts">Prompts</h2>\n`;
      html += `      <p class="description">This server provides ${doc.prompts.length} prompt(s).</p>\n`;

      for (const prompt of doc.prompts) {
        html += `      <h3>${prompt.name}</h3>\n`;

        if (prompt.description) {
          html += `      <p class="description">${prompt.description}</p>\n`;
        }

        if (prompt.arguments && prompt.arguments.length > 0) {
          html += `      <h4>Arguments:</h4>\n`;
          html += `      <table>\n`;
          html += `        <thead><tr><th>Name</th><th>Required</th><th>Description</th></tr></thead>\n`;
          html += `        <tbody>\n`;

          for (const arg of prompt.arguments) {
            const isRequired = arg.required;
            const badge = isRequired ? 'badge-yes' : 'badge-no';
            const description = arg.description || '-';

            html += `          <tr>
            <td><code>${arg.name}</code></td>
            <td><span class="badge ${badge}">${isRequired ? 'Yes' : 'No'}</span></td>
            <td>${description}</td>
          </tr>\n`;
          }

          html += `        </tbody>\n`;
          html += `      </table>\n`;
        }
      }

      html += `    </div>\n\n`;
    }

    html += `    <footer>
      <p>Documentation generated by MCP Chat Studio</p>
    </footer>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate JSON documentation
   */
  generateJSON(doc) {
    return JSON.stringify(doc, null, 2);
  }

  /**
   * Generate example request for a tool
   */
  generateExample(tool) {
    const example = {
      tool: tool.name,
      arguments: {}
    };

    if (tool.inputSchema && tool.inputSchema.properties) {
      for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
        example.arguments[name] = this.generateExampleValue(schema);
      }
    }

    return example;
  }

  /**
   * Generate example value based on schema
   */
  generateExampleValue(schema) {
    switch (schema.type) {
      case 'string':
        return schema.example || schema.default || 'example string';
      case 'number':
        return schema.example || schema.default || 42;
      case 'integer':
        return schema.example || schema.default || 10;
      case 'boolean':
        return schema.example || schema.default || true;
      case 'array':
        return schema.example || ['item1', 'item2'];
      case 'object':
        return schema.example || {};
      default:
        return null;
    }
  }

  /**
   * Save documentation to file
   */
  saveDocumentation(serverName, content, format) {
    const extension = format === 'markdown' ? 'md' : format;
    const filename = `${serverName}.${extension}`;
    const filepath = join(this.docsDir, filename);

    writeFileSync(filepath, content);

    console.log(`[DocumentationGenerator] Saved documentation: ${filepath}`);

    return { filename, filepath };
  }

  /**
   * Generate documentation for all servers
   */
  async generateAllDocumentation(sessionId, format = 'markdown') {
    const mcpManager = getMCPManager();
    const servers = mcpManager.getConnectedServers(sessionId);

    const results = [];

    for (const serverName of servers) {
      try {
        const content = await this.generateDocumentation(serverName, sessionId, format);
        const file = this.saveDocumentation(serverName, content, format);

        results.push({
          serverName,
          ...file,
          success: true
        });
      } catch (error) {
        console.error(`[DocumentationGenerator] Failed for ${serverName}:`, error.message);
        results.push({
          serverName,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Singleton
let instance = null;
export function getDocumentationGenerator() {
  if (!instance) {
    instance = new DocumentationGenerator();
  }
  return instance;
}

export default DocumentationGenerator;

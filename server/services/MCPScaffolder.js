/**
 * MCP Server Scaffolder
 * Generates complete MCP server projects with best practices
 */

export class MCPScaffolder {
  /**
   * Generate a complete MCP server project
   * @param {object} options - Project configuration
   * @param {string} options.name - Project name
   * @param {string} options.language - 'python' or 'nodejs'
   * @param {array} options.tools - Tool definitions
   * @param {string} options.description - Project description
   * @returns {object} - Generated files
   */
  generateProject(options) {
    const { name, language, tools = [], description = '' } = options;

    if (language === 'python') {
      return this.generatePythonProject(name, tools, description);
    } else if (language === 'nodejs' || language === 'typescript') {
      return this.generateNodeProject(name, tools, description, language === 'typescript');
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Generate Python FastMCP project
   */
  generatePythonProject(name, tools, description) {
    const files = {};
    const packageName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // pyproject.toml
    files['pyproject.toml'] = `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "${packageName}"
version = "0.1.0"
description = "${description || `MCP server for ${name}`}"
readme = "README.md"
requires-python = ">=3.10"
dependencies = [
    "mcp>=1.0.0",
]

[project.scripts]
${packageName} = "${packageName}.server:main"

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
]
`;

    // Main server file
    files[`${packageName}/server.py`] = this.generatePythonServer(packageName, tools);

    // __init__.py
    files[`${packageName}/__init__.py`] = `"""${description || name} MCP Server"""
__version__ = "0.1.0"
`;

    // README.md
    files['README.md'] = this.generateReadme(name, 'python', description, tools);

    // .gitignore
    files['.gitignore'] = `__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
.env
.venv
env/
venv/
.pytest_cache/
.coverage
htmlcov/
`;

    // pytest.ini
    files['pytest.ini'] = `[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
`;

    // Example test file
    files[`tests/test_${packageName}.py`] = this.generatePythonTests(packageName, tools);

    return files;
  }

  generatePythonServer(packageName, tools) {
    return `#!/usr/bin/env python3
"""
${packageName} MCP Server

This server provides tools for [describe functionality].
"""

import asyncio
import logging
from typing import Any

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize server
server = Server("${packageName}")

${this.generatePythonToolHandlers(tools)}

async def main():
    """Main entry point for the server."""
    logger.info("Starting ${packageName} MCP server")

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="${packageName}",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  generatePythonToolHandlers(tools) {
    if (tools.length === 0) {
      return `
@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="example_tool",
            description="An example tool that returns a greeting",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name to greet"
                    }
                },
                "required": ["name"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent | ImageContent | EmbeddedResource]:
    """Handle tool execution requests."""
    if name == "example_tool":
        user_name = arguments.get("name", "World")
        return [
            TextContent(
                type="text",
                text=f"Hello, {user_name}! This is an example tool response."
            )
        ]
    else:
        raise ValueError(f"Unknown tool: {name}")
`;
    }

    let code = '\n@server.list_tools()\nasync def handle_list_tools() -> list[Tool]:\n';
    code += '    """List available tools."""\n';
    code += '    return [\n';

    tools.forEach(tool => {
      code += `        Tool(\n`;
      code += `            name="${tool.name}",\n`;
      code += `            description="${tool.description || 'No description'}",\n`;
      code += `            inputSchema=${JSON.stringify(tool.inputSchema || { type: 'object', properties: {} }, null, 16).replace(/\n/g, '\n            ')}\n`;
      code += `        ),\n`;
    });

    code += '    ]\n\n';

    code += '@server.call_tool()\n';
    code +=
      'async def handle_call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent | ImageContent | EmbeddedResource]:\n';
    code += '    """Handle tool execution requests."""\n';

    tools.forEach((tool, index) => {
      code += `    ${index === 0 ? 'if' : 'elif'} name == "${tool.name}":\n`;
      code += `        # TODO: Implement ${tool.name} logic\n`;
      code += `        # Access arguments: arguments.get('param_name')\n`;
      code += `        return [\n`;
      code += `            TextContent(\n`;
      code += `                type="text",\n`;
      code += `                text=f"Executed ${tool.name} with args: {arguments}"\n`;
      code += `            )\n`;
      code += `        ]\n`;
    });

    code += '    else:\n';
    code += '        raise ValueError(f"Unknown tool: {name}")\n';

    return code;
  }

  generatePythonTests(packageName, _tools) {
    return `"""Tests for ${packageName}"""

import pytest
from mcp.types import TextContent

# Import your server here
# from ${packageName}.server import handle_call_tool, handle_list_tools


@pytest.mark.asyncio
async def test_list_tools():
    """Test that tools are listed correctly."""
    # tools = await handle_list_tools()
    # assert len(tools) > 0
    # assert tools[0].name == "example_tool"
    pass


@pytest.mark.asyncio
async def test_example_tool():
    """Test example tool execution."""
    # result = await handle_call_tool("example_tool", {"name": "Test"})
    # assert len(result) > 0
    # assert isinstance(result[0], TextContent)
    # assert "Test" in result[0].text
    pass
`;
  }

  /**
   * Generate Node.js MCP SDK project
   */
  generateNodeProject(name, tools, description, isTypescript) {
    const files = {};
    const packageName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // package.json
    files['package.json'] = JSON.stringify(
      {
        name: packageName,
        version: '0.1.0',
        description: description || `MCP server for ${name}`,
        type: 'module',
        main: isTypescript ? 'dist/index.js' : 'src/index.js',
        bin: {
          [packageName]: isTypescript ? './dist/index.js' : './src/index.js',
        },
        scripts: {
          start: isTypescript ? 'node dist/index.js' : 'node src/index.js',
          dev: isTypescript ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
          build: isTypescript ? 'tsc' : 'echo "No build needed"',
          test: 'jest',
          lint: isTypescript ? 'eslint src/**/*.ts' : 'eslint src/**/*.js',
        },
        dependencies: {
          '@modelcontextprotocol/sdk': '^1.0.0',
        },
        devDependencies: isTypescript
          ? {
              '@types/node': '^20.0.0',
              typescript: '^5.0.0',
              tsx: '^4.0.0',
              jest: '^29.0.0',
              '@types/jest': '^29.0.0',
              'ts-jest': '^29.0.0',
              eslint: '^8.0.0',
              '@typescript-eslint/parser': '^6.0.0',
              '@typescript-eslint/eslint-plugin': '^6.0.0',
            }
          : {
              jest: '^29.0.0',
              eslint: '^8.0.0',
            },
      },
      null,
      2
    );

    // Main server file
    const ext = isTypescript ? 'ts' : 'js';
    files[`src/index.${ext}`] = this.generateNodeServer(packageName, tools, isTypescript);

    if (isTypescript) {
      // tsconfig.json
      files['tsconfig.json'] = JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'node',
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist', '**/*.test.ts'],
        },
        null,
        2
      );
    }

    // README.md
    files['README.md'] = this.generateReadme(
      name,
      isTypescript ? 'typescript' : 'nodejs',
      description,
      tools
    );

    // .gitignore
    files['.gitignore'] = `node_modules/
${isTypescript ? 'dist/' : ''}
.env
*.log
.DS_Store
coverage/
.vscode/
.idea/
`;

    // jest.config.js
    files['jest.config.js'] = isTypescript
      ? `export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
`
      : `export default {
  testEnvironment: 'node',
};
`;

    // Example test
    files[`src/index.test.${ext}`] = this.generateNodeTests(packageName, tools, isTypescript);

    return files;
  }

  generateNodeServer(packageName, tools, isTypescript) {
    const types = isTypescript ? ': Server' : '';
    const toolTypes = isTypescript ? ': CallToolRequest' : '';

    return `#!/usr/bin/env node
/**
 * ${packageName} MCP Server
 *
 * ${packageName} server implementation using MCP SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

${this.generateNodeToolDefinitions(tools, isTypescript)}

// Create server instance
const server${types} = new Server(
  {
    name: '${packageName}',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request${toolTypes}) => {
  const { name, arguments: args } = request.params;

  try {
    ${this.generateNodeToolSwitch(tools)}
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: \`Error: \${errorMessage}\`,
        },
      ],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('${packageName} MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
`;
  }

  generateNodeToolDefinitions(tools, isTypescript) {
    if (tools.length === 0) {
      const type = isTypescript ? ': Tool[]' : '';
      return `const TOOLS${type} = [
  {
    name: 'example_tool',
    description: 'An example tool that returns a greeting',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet',
        },
      },
      required: ['name'],
    },
  },
];`;
    }

    const type = isTypescript ? ': Tool[]' : '';
    return `const TOOLS${type} = ${JSON.stringify(
      tools.map(t => ({
        name: t.name,
        description: t.description || 'No description',
        inputSchema: t.inputSchema || { type: 'object', properties: {} },
      })),
      null,
      2
    )};`;
  }

  generateNodeToolSwitch(tools) {
    if (tools.length === 0) {
      return `if (name === 'example_tool') {
      const userName = (args as any).name || 'World';
      return {
        content: [
          {
            type: 'text',
            text: \`Hello, \${userName}! This is an example tool response.\`,
          },
        ],
      };
    }

    throw new Error(\`Unknown tool: \${name}\`);`;
    }

    let code = '';
    tools.forEach((tool, index) => {
      code += `${index === 0 ? 'if' : 'else if'} (name === '${tool.name}') {\n`;
      code += `      // TODO: Implement ${tool.name} logic\n`;
      code += `      // Access arguments: (args as any).param_name\n`;
      code += `      return {\n`;
      code += `        content: [\n`;
      code += `          {\n`;
      code += `            type: 'text',\n`;
      code += `            text: \`Executed ${tool.name} with args: \${JSON.stringify(args)}\`,\n`;
      code += `          },\n`;
      code += `        ],\n`;
      code += `      };\n`;
      code += `    }\n`;
    });

    code += `\n    throw new Error(\`Unknown tool: \${name}\`);`;
    return code;
  }

  generateNodeTests(packageName, _tools, _isTypescript) {
    return `/**
 * Tests for ${packageName}
 */

describe('${packageName}', () => {
  test('should list tools', () => {
    // TODO: Add tool listing test
    expect(true).toBe(true);
  });

  test('should execute example tool', () => {
    // TODO: Add tool execution test
    expect(true).toBe(true);
  });
});
`;
  }

  generateReadme(name, language, description, tools) {
    const languageInfo = {
      python: {
        badge: '![Python](https://img.shields.io/badge/python-3.10+-blue.svg)',
        cmd: `pip install -e .`,
      },
      nodejs: {
        badge: '![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)',
        cmd: 'npm install',
      },
      typescript: {
        badge: '![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)',
        cmd: 'npm install && npm run build',
      },
    };

    const info = languageInfo[language] || languageInfo.nodejs;

    return `# ${name}

${info.badge}
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

${description || `MCP server for ${name}`}

## Installation

\`\`\`bash
${info.cmd}
\`\`\`

## Usage

### With MCP Chat Studio

Add to your \`config.yaml\`:

\`\`\`yaml
mcpServers:
  ${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}:
    type: stdio
    command: ${language === 'python' ? 'python' : 'node'}
    args:
${
  language === 'python'
    ? `      - "-m"
      - "${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.server"`
    : `      - "src/index.js"`
}
    description: "${description || name}"
\`\`\`

### Standalone

\`\`\`bash
${language === 'python' ? `python -m ${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.server` : 'npm start'}
\`\`\`

## Available Tools

${
  tools.length > 0
    ? tools
        .map(
          t => `### \`${t.name}\`

${t.description || 'No description'}

**Parameters:**
\`\`\`json
${JSON.stringify(t.inputSchema?.properties || {}, null, 2)}
\`\`\`
`
        )
        .join('\n')
    : '### `example_tool`\n\nAn example tool to get you started.\n'
}

## Development

### Running Tests

\`\`\`bash
${language === 'python' ? 'pytest' : 'npm test'}
\`\`\`

### Linting

\`\`\`bash
${language === 'python' ? 'black . && ruff .' : 'npm run lint'}
\`\`\`

## License

MIT
`;
  }
}

// Singleton export
let instance = null;
export function getMCPScaffolder() {
  if (!instance) {
    instance = new MCPScaffolder();
  }
  return instance;
}

export default MCPScaffolder;

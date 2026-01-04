/**
 * MCP Routes with OAuth Support
 * Endpoints for MCP server management and tool access
 */

import { Router } from 'express';
import { getMCPManager } from '../services/MCPManager.js';
import { getOAuthManager } from '../services/OAuthManager.js';
import { getToolExplorer } from '../services/ToolExplorer.js';
import { loadPersistedServers, upsertPersistedServer, removePersistedServer } from '../services/MCPConfigStore.js';

const router = Router();

/**
 * Helper to get session ID from request
 */
function getSessionId(req) {
  return req.cookies?.sessionId || req.headers['x-session-id'];
}

/**
 * @swagger
 * /api/mcp/status:
 *   get:
 *     summary: Get MCP server status
 *     description: Returns connection status of all configured MCP servers
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: Server status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 servers:
 *                   type: object
 */
router.get('/status', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const mcpManager = getMCPManager();
    let status = mcpManager.getStatus(sessionId);

    const persistedServers = await loadPersistedServers();
    const persistedEntries = Object.entries(persistedServers || {});
    if (persistedEntries.length > 0) {
      let added = false;
      for (const [name, config] of persistedEntries) {
        if (!mcpManager.configs.has(name)) {
          mcpManager.addServerConfig(name, { ...config, startup: false });
          added = true;
        }
      }
      if (added) {
        status = mcpManager.getStatus(sessionId);
      }
    }

    res.json(status);
  } catch (error) {
    console.error('[MCP/Status] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/mcp/tools:
 *   get:
 *     summary: Get all available MCP tools
 *     description: Returns list of all tools from connected MCP servers
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: List of available tools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tools:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       serverName:
 *                         type: string
 *                       description:
 *                         type: string
 *                       inputSchema:
 *                         type: object
 */
router.get('/tools', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const mcpManager = getMCPManager();
    const tools = mcpManager.getAllTools(sessionId);
    res.json({ tools });
  } catch (error) {
    console.error('[MCP/Tools] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcp/auth-required
 * Get list of servers that require authentication
 */
router.get('/auth-required', (req, res) => {
  try {
    const mcpManager = getMCPManager();
    const servers = mcpManager.getAuthRequiredServers();
    res.json({ servers });
  } catch (error) {
    console.error('[MCP/AuthRequired] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/connect/:serverName
 * Connect to a specific MCP server
 * For servers requiring auth, user must be logged in
 */
router.post('/connect/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const sessionId = getSessionId(req);
    const mcpManager = getMCPManager();
    const oauth = getOAuthManager();

    const config = mcpManager.configs.get(serverName);
    if (!config) {
      return res.status(404).json({ error: `Server not found: ${serverName}` });
    }

    const requiresAuth = config.requiresAuth || config.requiresOAuth;

    if (requiresAuth) {
      // Check if user is authenticated
      if (!sessionId || !oauth?.isAuthenticated(sessionId)) {
        return res.status(401).json({
          error: 'Authentication required',
          message: `${serverName} requires OAuth authentication. Please login first.`,
        });
      }

      // Get user's access token
      const userToken = await oauth.getAccessToken(sessionId);
      if (!userToken) {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please login again.',
        });
      }

      // Create user-specific connection
      await mcpManager.getUserConnection(sessionId, serverName, userToken);
    } else {
      // Shared connection (no auth needed)
      await mcpManager.connectServer(serverName);
    }

    res.json({
      success: true,
      message: `Connected to ${serverName}`,
      status: mcpManager.getStatus(sessionId)[serverName],
    });
  } catch (error) {
    console.error(`[MCP/Connect] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/disconnect/:serverName
 * Disconnect from a specific MCP server
 */
router.post('/disconnect/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const sessionId = getSessionId(req);
    const mcpManager = getMCPManager();

    // Try to disconnect user-specific connection first
    if (sessionId) {
      await mcpManager.disconnectUserServer(sessionId, serverName);
    }

    // Also try shared connection
    await mcpManager.disconnectServer(serverName);

    res.json({
      success: true,
      message: `Disconnected from ${serverName}`,
    });
  } catch (error) {
    console.error(`[MCP/Disconnect] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/add
 * Add a new MCP server configuration dynamically
 */
router.post('/add', async (req, res) => {
  try {
    const { name, type, command, args, url, env, description, requiresAuth, timeout, mockId, cwd } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }

    const resolvedType = type || (mockId ? 'mock' : command ? 'stdio' : 'sse');

    if (resolvedType !== 'mock' && !command && !url) {
      return res
        .status(400)
        .json({ error: 'Either command (for stdio) or url (for SSE) is required' });
    }
    if (resolvedType === 'mock' && !mockId) {
      return res.status(400).json({ error: 'mockId is required for mock servers' });
    }

    const mcpManager = getMCPManager();

    // Build config object
    const config = {
      type: resolvedType,
      description: description || `Dynamic MCP server: ${name}`,
      requiresAuth: requiresAuth || false,
      timeout: timeout || 60000,
      startup: false, // Don't auto-start dynamic servers
    };

    if (resolvedType === 'mock') {
      config.mockId = mockId;
    } else if (command) {
      config.command = command;
      config.args = args || [];
      if (cwd) config.cwd = cwd;
      if (env) config.env = env;
    } else {
      config.url = url;
    }

    // Debug logging
    console.log(`[MCP/Add] Adding server "${name}" with config:`, JSON.stringify(config, null, 2));

    const serverConfig = mcpManager.addServerConfig(name, config);
    try {
      await upsertPersistedServer(name, config);
    } catch (error) {
      console.warn('[MCP/Add] Failed to persist server config:', error.message);
    }

    res.json({
      success: true,
      message: `Added server: ${name}`,
      server: serverConfig,
    });
  } catch (error) {
    console.error(`[MCP/Add] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mcp/update/:serverName
 * Update an existing MCP server configuration
 */
router.put('/update/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const { type, command, args, url, env, description, requiresAuth, timeout, mockId, cwd } = req.body;

    const mcpManager = getMCPManager();
    const existingConfig = mcpManager.configs.get(serverName);

    // Check if server exists
    if (!mcpManager.configs.has(serverName)) {
      return res.status(404).json({ error: `Server not found: ${serverName}` });
    }

    // Build updated config
    const resolvedType = type || (mockId ? 'mock' : command ? 'stdio' : 'sse');
    const config = {
      type: resolvedType,
      description: description || `MCP server: ${serverName}`,
      requiresAuth: requiresAuth || false,
      timeout: timeout || 60000,
      startup: false,
    };

    if (resolvedType === 'mock') {
      if (!mockId) {
        return res.status(400).json({ error: 'mockId is required for mock servers' });
      }
      config.mockId = mockId;
    } else if (command) {
      config.command = command;
      config.args = args || [];
      if (cwd) config.cwd = cwd;
      if (env) config.env = env;
    } else {
      config.url = url;
    }

    console.log(`[MCP/Update] Updating server "${serverName}" with config:`, JSON.stringify(config, null, 2));

    // Disconnect if connected
    await mcpManager.disconnectServer(serverName);
    
    // Remove and re-add (effectively update)
    mcpManager.configs.delete(serverName);
    const serverConfig = mcpManager.addServerConfig(serverName, config);
    try {
      await upsertPersistedServer(serverName, config);
    } catch (error) {
      console.warn('[MCP/Update] Failed to persist server config:', error.message);
    }

    res.json({
      success: true,
      message: `Updated server: ${serverName}`,
      server: serverConfig,
    });
  } catch (error) {
    console.error(`[MCP/Update] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/mcp/remove/:serverName
 * Remove an MCP server configuration
 */
router.delete('/remove/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const mcpManager = getMCPManager();

    await mcpManager.removeServerConfig(serverName);
    try {
      await removePersistedServer(serverName);
    } catch (error) {
      console.warn('[MCP/Remove] Failed to update persisted servers:', error.message);
    }

    res.json({
      success: true,
      message: `Removed server: ${serverName}`,
    });
  } catch (error) {
    console.error(`[MCP/Remove] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/call
 * Call an MCP tool directly
 */
router.post('/call', async (req, res) => {
  const startTime = Date.now();
  try {
    const { serverName, toolName, args = {} } = req.body;
    const sessionId = getSessionId(req);

    if (!serverName || !toolName) {
      return res.status(400).json({ error: 'serverName and toolName are required' });
    }

    const mcpManager = getMCPManager();
    const result = await mcpManager.callTool(serverName, toolName, args, sessionId);

    // Record successful execution
    const duration = Date.now() - startTime;
    const explorer = getToolExplorer();
    explorer.recordExecution(serverName, toolName, duration, true);

    res.json({ result });
  } catch (error) {
    console.error(`[MCP/Call] Error:`, error.message);

    // Record failed execution
    const duration = Date.now() - startTime;
    const explorer = getToolExplorer();
    const { serverName, toolName } = req.body;
    if (serverName && toolName) {
      explorer.recordExecution(serverName, toolName, duration, false, error.message);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/call-by-name
 * Call an MCP tool using full name (serverName__toolName)
 */
router.post('/call-by-name', async (req, res) => {
  try {
    const { fullName, args = {} } = req.body;
    const sessionId = getSessionId(req);

    if (!fullName) {
      return res.status(400).json({ error: 'fullName is required' });
    }

    const mcpManager = getMCPManager();
    const result = await mcpManager.callToolByFullName(fullName, args, sessionId);

    res.json({ result });
  } catch (error) {
    console.error(`[MCP/CallByName] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcp/resources/:serverName
 * List resources from a server
 */
router.get('/resources/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const sessionId = getSessionId(req);
    const mcpManager = getMCPManager();

    const resources = await mcpManager.listResources(serverName, sessionId);
    res.json({ resources });
  } catch (error) {
    console.error(`[MCP/Resources] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/resources/read
 * Read a specific resource
 */
router.post('/resources/read', async (req, res) => {
  try {
    const { serverName, uri } = req.body;
    const sessionId = getSessionId(req);

    if (!serverName || !uri) {
      return res.status(400).json({ error: 'serverName and uri are required' });
    }

    const mcpManager = getMCPManager();
    const result = await mcpManager.readResource(serverName, uri, sessionId);
    res.json({ result });
  } catch (error) {
    console.error(`[MCP/ReadResource] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcp/prompts/:serverName
 * List prompts from a server
 */
router.get('/prompts/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const sessionId = getSessionId(req);
    const mcpManager = getMCPManager();

    const prompts = await mcpManager.listPrompts(serverName, sessionId);
    res.json({ prompts });
  } catch (error) {
    console.error(`[MCP/Prompts] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/prompts/get
 * Get a specific prompt
 */
router.post('/prompts/get', async (req, res) => {
  try {
    const { serverName, name, args = {} } = req.body;
    const sessionId = getSessionId(req);

    if (!serverName || !name) {
      return res.status(400).json({ error: 'serverName and name are required' });
    }

    const mcpManager = getMCPManager();
    const result = await mcpManager.getPrompt(serverName, name, args, sessionId);
    res.json({ result });
  } catch (error) {
    console.error(`[MCP/GetPrompt] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/resources/:serverName/read
 * Read a specific resource from a server (URL-based server name)
 */
router.post('/resources/:serverName/read', async (req, res) => {
  try {
    const { serverName } = req.params;
    const { uri } = req.body;
    const sessionId = getSessionId(req);

    if (!uri) {
      return res.status(400).json({ error: 'uri is required' });
    }

    const mcpManager = getMCPManager();
    const contents = await mcpManager.readResource(serverName, uri, sessionId);
    res.json({ contents });
  } catch (error) {
    console.error(`[MCP/ReadResource] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/prompts/:serverName/get
 * Get a specific prompt from a server (URL-based server name)
 */
router.post('/prompts/:serverName/get', async (req, res) => {
  try {
    const { serverName } = req.params;
    const { name, arguments: promptArgs = {} } = req.body;
    const sessionId = getSessionId(req);

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const mcpManager = getMCPManager();
    const messages = await mcpManager.getPrompt(serverName, name, promptArgs, sessionId);
    res.json({ messages });
  } catch (error) {
    console.error(`[MCP/GetPrompt] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CONTRACT VALIDATION ROUTES
// ==========================================

import ContractValidator from '../services/ContractValidator.js';
import { getProtocolCompliance } from '../services/ProtocolCompliance.js';

/**
 * POST /api/mcp/validate
 * Validate tool call inputs against the tool's schema
 */
router.post('/validate', async (req, res) => {
  try {
    const { serverName, toolName, args = {} } = req.body;
    const sessionId = getSessionId(req);

    if (!serverName || !toolName) {
      return res.status(400).json({ error: 'serverName and toolName are required' });
    }

    const mcpManager = getMCPManager();
    const tools = mcpManager.getAllTools(sessionId);
    const tool = tools.find(t => t.serverName === serverName && t.name === toolName);

    if (!tool) {
      return res.status(404).json({ error: `Tool not found: ${serverName}/${toolName}` });
    }

    const validation = ContractValidator.validateInput(args, tool.inputSchema);
    
    res.json({
      tool: toolName,
      server: serverName,
      validation
    });
  } catch (error) {
    console.error(`[MCP/Validate] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/call-with-validation
 * Call a tool with input validation and optional output contract checking
 */
router.post('/call-with-validation', async (req, res) => {
  try {
    const { serverName, toolName, args = {}, outputContract } = req.body;
    const sessionId = getSessionId(req);

    if (!serverName || !toolName) {
      return res.status(400).json({ error: 'serverName and toolName are required' });
    }

    const mcpManager = getMCPManager();
    const tools = mcpManager.getAllTools(sessionId);
    const tool = tools.find(t => t.serverName === serverName && t.name === toolName);

    if (!tool) {
      return res.status(404).json({ error: `Tool not found: ${serverName}/${toolName}` });
    }

    // Validate input
    const inputValidation = ContractValidator.validateInput(args, tool.inputSchema);
    
    if (!inputValidation.valid) {
      return res.json({
        success: false,
        phase: 'input_validation',
        inputValidation,
        result: null
      });
    }

    // Call the tool
    const startTime = Date.now();
    const result = await mcpManager.callTool(serverName, toolName, args, sessionId);
    const duration = Date.now() - startTime;

    // Validate output if contract provided
    let outputValidation = { valid: true, errors: [], warnings: [] };
    if (outputContract) {
      outputValidation = ContractValidator.validateOutput(result, outputContract);
    }

    res.json({
      success: true,
      result,
      duration,
      inputValidation,
      outputValidation
    });
  } catch (error) {
    console.error(`[MCP/CallWithValidation] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/contract/generate
 * Generate a contract from a tool response (baseline capture)
 */
router.post('/contract/generate', (req, res) => {
  try {
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({ error: 'response is required' });
    }

    const contract = ContractValidator.createContractFromResponse(response);
    
    res.json({
      contract,
      message: 'Contract generated from response. Save this to use as your output contract.'
    });
  } catch (error) {
    console.error(`[MCP/ContractGenerate] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/contract/compare
 * Compare baseline vs actual response to detect schema drift
 */
router.post('/contract/compare', (req, res) => {
  try {
    const { baseline, actual } = req.body;

    if (!baseline || !actual) {
      return res.status(400).json({ error: 'baseline and actual responses are required' });
    }

    const comparison = ContractValidator.compareSchemas(baseline, actual);

    res.json(comparison);
  } catch (error) {
    console.error(`[MCP/ContractCompare] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PROTOCOL COMPLIANCE ROUTES
// ==========================================

/**
 * POST /api/mcp/compliance/check
 * Check MCP server compliance with protocol spec
 */
router.post('/compliance/check', async (req, res) => {
  try {
    const { serverName } = req.body;
    const sessionId = getSessionId(req);

    if (!serverName) {
      return res.status(400).json({ error: 'serverName is required' });
    }

    const mcpManager = getMCPManager();
    const connection = mcpManager.getConnection(serverName, sessionId);

    if (!connection) {
      return res.status(404).json({ error: `Server not found: ${serverName}` });
    }

    const compliance = getProtocolCompliance();
    const results = await compliance.checkServerCompliance(connection);

    res.json({
      server: serverName,
      compliance: results
    });
  } catch (error) {
    console.error(`[MCP/Compliance] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/compliance/validate-message
 * Validate a JSON-RPC message format
 */
router.post('/compliance/validate-message', (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const compliance = getProtocolCompliance();
    const result = compliance.validateJsonRpc(message);

    res.json(result);
  } catch (error) {
    console.error(`[MCP/Compliance/ValidateMessage] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;


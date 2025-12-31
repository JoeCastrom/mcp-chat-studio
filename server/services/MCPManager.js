/**
 * MCP Manager with OAuth Support
 * Uses @modelcontextprotocol/sdk for MCP server connections
 * Supports passing user OAuth tokens to MCP servers
 *
 * IMPORTANT: This implementation bypasses the SDK's response validation
 * for tool calls because FastMCP (Python) returns Pydantic schemas that
 * are incompatible with the JavaScript SDK's Zod validation.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { getMockServerManager } from './MockServerManager.js';

console.log('[MCP] Loading MCPManager with raw transport tool calls (bypasses SDK validation)');

class MCPConnection {
  constructor(serverName, config) {
    this.serverName = serverName;
    this.config = config;
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.tools = [];
    this.requiresAuth = config.requiresAuth || config.requiresOAuth || false;
    this._requestId = 0;
    this._pendingRequests = new Map();
  }

  /**
   * Connect to MCP server
   * @param {string} userToken - Optional user OAuth token for authenticated servers
   */
  async connect(userToken = null) {
    try {
      console.log(`[MCP][${this.serverName}] Connecting...`);

      // Create client
      this.client = new Client(
        { name: 'minimal-chat-client', version: '1.0.0' },
        { capabilities: {} }
      );

      // Build environment with optional token
      const env = { ...getDefaultEnvironment(), ...(this.config.env || {}) };

      // Pass token as environment variable for stdio servers that need it
      if (userToken && this.requiresAuth) {
        env.USER_ACCESS_TOKEN = userToken;
        env.AUTHORIZATION = `Bearer ${userToken}`;
      }

      // Create transport based on config type
      if (this.config.type === 'stdio' || this.config.command) {
        this.transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args || [],
          env,
        });
      } else if (this.config.type === 'sse' || this.config.url) {
        const url = new URL(this.config.url);

        // Build headers with optional auth
        const headers = { ...(this.config.headers || {}) };
        if (userToken && this.requiresAuth) {
          headers['Authorization'] = `Bearer ${userToken}`;
        }

        this.transport = new SSEClientTransport(url, {
          requestInit: { headers },
        });
      } else {
        throw new Error(`Unsupported MCP server type for ${this.serverName}`);
      }

      // Set up raw message handler for tool call responses
      this._setupRawMessageHandler();

      // Connect with timeout
      const timeout = this.config.timeout || 30000;
      await Promise.race([
        this.client.connect(this.transport),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Connection timeout after ${timeout}ms`)), timeout)
        ),
      ]);

      this.connected = true;
      console.log(`[MCP][${this.serverName}] Connected successfully`);

      // Fetch available tools
      await this.refreshTools();

      return true;
    } catch (error) {
      console.error(`[MCP][${this.serverName}] Connection failed:`, error.message);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Set up handler for raw JSON-RPC messages
   * This intercepts responses before SDK validation
   */
  _setupRawMessageHandler() {
    // Store original onmessage if exists
    const originalOnMessage = this.transport.onmessage;

    this.transport.onmessage = message => {
      // Check if this is a response to one of our raw requests
      if (message.id && this._pendingRequests.has(message.id)) {
        const { resolve, reject } = this._pendingRequests.get(message.id);
        this._pendingRequests.delete(message.id);

        if (message.error) {
          reject(new Error(message.error.message || 'RPC Error'));
        } else {
          resolve(message.result);
        }
        return; // Don't pass to SDK - we handled it
      }

      // Pass to original handler (SDK) for other messages
      if (originalOnMessage) {
        originalOnMessage.call(this.transport, message);
      }
    };
  }

  /**
   * Send a raw JSON-RPC request via transport
   * Bypasses SDK validation entirely
   */
  async _sendRawRequest(method, params, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const id = ++this._requestId;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Store pending request
      this._pendingRequests.set(id, {
        resolve: result => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: error => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      // Send raw JSON-RPC message
      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      // Use transport's send method
      try {
        this.transport.send(message);
      } catch (error) {
        this._pendingRequests.delete(id);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  async refreshTools() {
    if (!this.connected || !this.client) return [];

    try {
      // Use SDK for listing tools (no validation issues here)
      const { tools } = await this.client.listTools();
      this.tools = tools || [];
      console.log(`[MCP][${this.serverName}] Found ${this.tools.length} tools`);
      return this.tools;
    } catch (error) {
      console.error(`[MCP][${this.serverName}] Failed to list tools:`, error.message);
      return [];
    }
  }

  /**
   * Call a tool using raw JSON-RPC to bypass SDK validation
   */
  async callTool(toolName, args = {}) {
    if (!this.connected || !this.transport) {
      throw new Error(`Not connected to ${this.serverName}`);
    }

    console.log(`[MCP][${this.serverName}] Calling tool: ${toolName}`);

    try {
      // Use raw transport messaging to bypass SDK validation
      const result = await this._sendRawRequest(
        'tools/call',
        { name: toolName, arguments: args },
        this.config.timeout || 60000
      );

      console.log(`[MCP][${this.serverName}] Tool call successful`);
      return result;
    } catch (error) {
      console.error(`[MCP][${this.serverName}] Tool call failed:`, error.message);
      throw error;
    }
  }

  /**
   * List available resources from this server
   */
  async listResources() {
    if (!this.connected || !this.client) return [];

    try {
      const { resources } = await this.client.listResources();
      console.log(`[MCP][${this.serverName}] Found ${resources?.length || 0} resources`);
      return resources || [];
    } catch (error) {
      // Server may not support resources
      console.log(`[MCP][${this.serverName}] Resources not supported or error: ${error.message}`);
      return [];
    }
  }

  /**
   * Read a specific resource
   */
  async readResource(uri) {
    if (!this.connected || !this.client) {
      throw new Error(`Not connected to ${this.serverName}`);
    }

    try {
      const result = await this.client.readResource({ uri });
      return result;
    } catch (error) {
      console.error(`[MCP][${this.serverName}] Read resource failed:`, error.message);
      throw error;
    }
  }

  /**
   * List available prompts from this server
   */
  async listPrompts() {
    if (!this.connected || !this.client) return [];

    try {
      const { prompts } = await this.client.listPrompts();
      console.log(`[MCP][${this.serverName}] Found ${prompts?.length || 0} prompts`);
      return prompts || [];
    } catch (error) {
      // Server may not support prompts
      console.log(`[MCP][${this.serverName}] Prompts not supported or error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a specific prompt with arguments
   */
  async getPrompt(name, args = {}) {
    if (!this.connected || !this.client) {
      throw new Error(`Not connected to ${this.serverName}`);
    }

    try {
      const result = await this.client.getPrompt({ name, arguments: args });
      return result;
    } catch (error) {
      console.error(`[MCP][${this.serverName}] Get prompt failed:`, error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        // Ignore close errors
      }
    }
    this.connected = false;
    this.transport = null;
    this._pendingRequests.clear();
    console.log(`[MCP][${this.serverName}] Disconnected`);
  }

  isConnected() {
    return this.connected;
  }
}

class MockConnection {
  constructor(serverName, config) {
    this.serverName = serverName;
    this.config = config;
    this.mockId = config.mockId;
    this.mockManager = getMockServerManager();
    this.connected = false;
    this.tools = [];
    this.requiresAuth = false;
  }

  async connect() {
    if (!this.mockId) {
      throw new Error(`Mock connection missing mockId for ${this.serverName}`);
    }

    // Ensure mock exists before marking connected
    this.mockManager.getMock(this.mockId);
    this.connected = true;
    await this.refreshTools();
    console.log(`[MCP][${this.serverName}] Connected to mock ${this.mockId}`);
    return true;
  }

  async refreshTools() {
    if (!this.connected) return [];
    const { tools } = this.mockManager.listTools(this.mockId);
    this.tools = tools || [];
    return this.tools;
  }

  async callTool(toolName, args = {}) {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.serverName}`);
    }
    return this.mockManager.callTool(this.mockId, toolName, args);
  }

  async listResources() {
    if (!this.connected) return [];
    const { resources } = this.mockManager.listResources(this.mockId);
    return resources || [];
  }

  async readResource(uri) {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.serverName}`);
    }
    return this.mockManager.getResource(this.mockId, uri);
  }

  async listPrompts() {
    if (!this.connected) return [];
    const { prompts } = this.mockManager.listPrompts(this.mockId);
    return prompts || [];
  }

  async getPrompt(name, args = {}) {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.serverName}`);
    }
    return this.mockManager.getPrompt(this.mockId, name, args);
  }

  async disconnect() {
    this.connected = false;
    this.tools = [];
    console.log(`[MCP][${this.serverName}] Disconnected`);
  }

  isConnected() {
    return this.connected;
  }
}

export class MCPManager {
  constructor() {
    this.connections = new Map();
    this.configs = new Map();
    this.userConnections = new Map(); // Map<sessionId, Map<serverName, MCPConnection>>
  }

  /**
   * Initialize MCP servers from config
   * @param {Object} mcpServersConfig - MCP servers configuration from yaml
   */
  async initialize(mcpServersConfig) {
    if (!mcpServersConfig) {
      console.log('[MCPManager] No MCP servers configured');
      return;
    }

    console.log('[MCPManager] Initializing MCP servers...');

    for (const [serverName, config] of Object.entries(mcpServersConfig)) {
      this.configs.set(serverName, config);

      // Only auto-connect servers that don't require auth and have startup: true
      const requiresAuth = config.requiresAuth || config.requiresOAuth;
      if (!requiresAuth && config.startup !== false) {
        try {
          await this.connectServer(serverName);
        } catch (error) {
          console.error(`[MCPManager] Failed to connect ${serverName}:`, error.message);
        }
      } else if (requiresAuth) {
        console.log(`[MCPManager] ${serverName} requires OAuth - will connect per-user`);
      }
    }

    console.log(`[MCPManager] Initialized ${this.connections.size} MCP connections`);
  }

  /**
   * Add a new MCP server configuration dynamically
   * @param {string} serverName - Name for the server
   * @param {Object} config - Server configuration
   */
  addServerConfig(serverName, config) {
    if (this.configs.has(serverName)) {
      throw new Error(`Server ${serverName} already exists`);
    }

    // Validate config
    if (!config.type) {
      if (config.mockId) {
        config.type = 'mock';
      } else if (config.command) {
        config.type = 'stdio';
      } else if (config.url) {
        config.type = 'sse';
      } else {
        throw new Error('Server config must have either command (stdio) or url (sse)');
      }
    }
    if (config.type === 'mock' && !config.mockId) {
      throw new Error('Mock server config must include mockId');
    }

    this.configs.set(serverName, config);
    console.log(`[MCPManager] Added server config: ${serverName} (${config.type})`);
    return { name: serverName, ...config };
  }

  /**
   * Remove a server configuration (and disconnect if connected)
   * @param {string} serverName - Name of the server to remove
   */
  async removeServerConfig(serverName) {
    console.log(`[MCPManager] Removing server: ${serverName}`);

    if (!this.configs.has(serverName)) {
      throw new Error(`Server ${serverName} not found`);
    }

    // Disconnect if connected
    if (this.connections.has(serverName)) {
      console.log(`[MCPManager] Disconnecting ${serverName} before removal...`);
      try {
        await this.disconnectServer(serverName);
      } catch (e) {
        console.log(`[MCPManager] Disconnect error (continuing anyway): ${e.message}`);
      }
    }

    // Remove from all user connections too
    for (const userConns of this.userConnections.values()) {
      if (userConns.has(serverName)) {
        try {
          const conn = userConns.get(serverName);
          await conn.disconnect();
        } catch (e) {
          console.log(`[MCPManager] User connection disconnect error: ${e.message}`);
        }
        userConns.delete(serverName);
      }
    }

    this.configs.delete(serverName);
    console.log(`[MCPManager] Removed server config: ${serverName}`);
  }

  /**
   * Connect to a specific MCP server (shared connection, no auth)
   */
  async connectServer(serverName, userToken = null) {
    const config = this.configs.get(serverName);
    if (!config) {
      throw new Error(`No configuration found for server: ${serverName}`);
    }

    // Disconnect existing connection if any
    if (this.connections.has(serverName)) {
      await this.disconnectServer(serverName);
    }

    const connection =
      config.type === 'mock'
        ? new MockConnection(serverName, config)
        : new MCPConnection(serverName, config);
    await connection.connect(userToken);
    this.connections.set(serverName, connection);

    return connection;
  }

  /**
   * Get or create a user-specific connection for servers requiring OAuth
   * @param {string} sessionId - User session ID
   * @param {string} serverName - MCP server name
   * @param {string} userToken - User's OAuth access token
   */
  async getUserConnection(sessionId, serverName, userToken) {
    const config = this.configs.get(serverName);
    if (!config) {
      throw new Error(`No configuration found for server: ${serverName}`);
    }

    // Get or create user's connection map
    if (!this.userConnections.has(sessionId)) {
      this.userConnections.set(sessionId, new Map());
    }
    const userConns = this.userConnections.get(sessionId);

    // Check if we have an existing connection
    let connection = userConns.get(serverName);
    if (connection?.isConnected()) {
      return connection;
    }

    // Create new user-specific connection
    console.log(
      `[MCPManager] Creating user connection for ${serverName} (session: ${sessionId.slice(
        0,
        8
      )}...)`
    );
    connection = new MCPConnection(serverName, config);
    await connection.connect(userToken);
    userConns.set(serverName, connection);

    return connection;
  }

  /**
   * Disconnect a user's connection to a server
   */
  async disconnectUserServer(sessionId, serverName) {
    const userConns = this.userConnections.get(sessionId);
    if (userConns?.has(serverName)) {
      const connection = userConns.get(serverName);
      await connection.disconnect();
      userConns.delete(serverName);
    }
  }

  /**
   * Disconnect all connections for a user session
   */
  async disconnectUserSession(sessionId) {
    const userConns = this.userConnections.get(sessionId);
    if (userConns) {
      for (const [serverName, connection] of userConns) {
        await connection.disconnect();
      }
      this.userConnections.delete(sessionId);
    }
  }

  /**
   * Disconnect from a specific MCP server (shared connection)
   */
  async disconnectServer(serverName) {
    const connection = this.connections.get(serverName);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(serverName);
    }
  }

  /**
   * Get all available tools from all connected servers
   * @param {string} sessionId - Optional session ID to include user-specific connections
   */
  getAllTools(sessionId = null) {
    const allTools = [];

    // Add tools from shared connections
    for (const [serverName, connection] of this.connections) {
      if (connection.isConnected()) {
        for (const tool of connection.tools) {
          allTools.push({
            ...tool,
            serverName,
            fullName: `${serverName}__${tool.name}`,
            requiresAuth: false,
          });
        }
      }
    }

    // Add tools from user-specific connections
    if (sessionId) {
      const userConns = this.userConnections.get(sessionId);
      if (userConns) {
        for (const [serverName, connection] of userConns) {
          if (connection.isConnected()) {
            for (const tool of connection.tools) {
              allTools.push({
                ...tool,
                serverName,
                fullName: `${serverName}__${tool.name}`,
                requiresAuth: true,
              });
            }
          }
        }
      }
    }

    // Add info about servers that require auth but aren't connected
    for (const [serverName, config] of this.configs) {
      if (
        (config.requiresAuth || config.requiresOAuth) &&
        !this.connections.has(serverName) &&
        !this.userConnections.get(sessionId)?.has(serverName)
      ) {
        // Server requires auth but not connected
        allTools.push({
          name: `[Login Required] ${serverName}`,
          description: `This server requires authentication. Please login to access its tools.`,
          serverName,
          fullName: `${serverName}__login_required`,
          requiresAuth: true,
          notConnected: true,
        });
      }
    }

    return allTools;
  }

  /**
   * Simplify tool schema by removing verbose descriptions and examples
   * Reduces payload size while keeping essential parameter information
   */
  simplifySchema(schema) {
    if (!schema || typeof schema !== 'object') return schema;

    const simplified = { ...schema };

    // Remove verbose fields
    delete simplified.title;
    delete simplified.examples;
    delete simplified.default;
    delete simplified.additionalProperties;

    // Shorten description if too long (keep first 150 chars)
    if (simplified.description && simplified.description.length > 150) {
      simplified.description = simplified.description.substring(0, 150) + '...';
    }

    // Recursively simplify nested objects
    if (simplified.properties) {
      const newProps = {};
      for (const [key, value] of Object.entries(simplified.properties)) {
        newProps[key] = this.simplifySchema(value);
      }
      simplified.properties = newProps;
    }

    // Simplify array items
    if (simplified.items) {
      simplified.items = this.simplifySchema(simplified.items);
    }

    // Simplify $defs (definitions) - these are often huge
    if (simplified.$defs) {
      const newDefs = {};
      for (const [key, value] of Object.entries(simplified.$defs)) {
        newDefs[key] = this.simplifySchema(value);
      }
      simplified.$defs = newDefs;
    }

    // Simplify anyOf/oneOf/allOf
    if (simplified.anyOf) {
      simplified.anyOf = simplified.anyOf.map(s => this.simplifySchema(s));
    }
    if (simplified.oneOf) {
      simplified.oneOf = simplified.oneOf.map(s => this.simplifySchema(s));
    }
    if (simplified.allOf) {
      simplified.allOf = simplified.allOf.map(s => this.simplifySchema(s));
    }

    return simplified;
  }

  /**
   * Get tools formatted for LLM (OpenAI-compatible function calling format)
   * With simplified schemas to reduce payload size
   */
  getToolsForLLM(sessionId = null) {
    return this.getAllTools(sessionId)
      .filter(tool => !tool.notConnected) // Exclude placeholder tools
      .map(tool => {
        // Simplify the input schema to reduce payload size
        const simplifiedSchema = this.simplifySchema(
          tool.inputSchema || { type: 'object', properties: {} }
        );

        return {
          type: 'function',
          function: {
            name: tool.fullName,
            description: tool.description
              ? tool.description.length > 200
                ? tool.description.substring(0, 200) + '...'
                : tool.description
              : `Tool from ${tool.serverName}`,
            parameters: simplifiedSchema,
          },
        };
      });
  }

  /**
   * Call a tool on a specific server
   * @param {string} serverName - Server name
   * @param {string} toolName - Tool name
   * @param {Object} args - Tool arguments
   * @param {string} sessionId - Optional session ID for user-specific connections
   */
  async callTool(serverName, toolName, args = {}, sessionId = null) {
    // First check user-specific connections
    if (sessionId) {
      const userConns = this.userConnections.get(sessionId);
      const userConnection = userConns?.get(serverName);
      if (userConnection?.isConnected()) {
        return userConnection.callTool(toolName, args);
      }
    }

    // Fall back to shared connections
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`Server not connected: ${serverName}. It may require authentication.`);
    }

    return connection.callTool(toolName, args);
  }

  /**
   * Call a tool using the full name (serverName__toolName)
   * @param {string} fullName - Full tool name (serverName__toolName)
   * @param {Object} args - Tool arguments from LLM
   * @param {string} sessionId - User session ID
   * @param {string} userToken - User's OAuth access token for OBO
   */
  async callToolByFullName(fullName, args = {}, sessionId = null, userToken = null) {
    const [serverName, ...toolParts] = fullName.split('__');
    const toolName = toolParts.join('__'); // Handle tool names with __

    // Inject user token into obo_context parameter for OBO (On-Behalf-Of)
    // NOTE: We use 'obo_context' NOT 'ctx' because FastMCP intercepts 'ctx' and replaces
    // it with its own Context object. Using a different parameter name ensures our token
    // actually reaches the Python function.
    if (userToken) {
      const obo_context = JSON.stringify({ user_token: userToken });
      args = { ...args, obo_context };
      console.log(`[MCPManager] Injecting user token into obo_context for OBO`);
    }

    return this.callTool(serverName, toolName, args, sessionId);
  }

  /**
   * Get connection status for all servers
   */
  getStatus(sessionId = null) {
    const status = {};

    for (const [serverName, config] of this.configs) {
      const sharedConnection = this.connections.get(serverName);
      const userConnection = sessionId
        ? this.userConnections.get(sessionId)?.get(serverName)
        : null;
      const connection = userConnection || sharedConnection;
      const requiresAuth = config.requiresAuth || config.requiresOAuth;

      status[serverName] = {
        configured: true,
        connected: connection?.isConnected() || false,
        toolCount: connection?.tools?.length || 0,
        type: config.type || (config.command ? 'stdio' : 'sse'),
        requiresAuth,
        userConnected: userConnection?.isConnected() || false,
        config, // Include config for export feature
      };
    }

    return status;
  }

  /**
   * Get servers that require authentication
   */
  getAuthRequiredServers() {
    const servers = [];
    for (const [serverName, config] of this.configs) {
      if (config.requiresAuth || config.requiresOAuth) {
        servers.push({
          name: serverName,
          type: config.type || (config.command ? 'stdio' : 'sse'),
          description: config.description || `MCP server: ${serverName}`,
        });
      }
    }
    return servers;
  }

  /**
   * List tools from a server
   */
  async listTools(serverName, sessionId = null) {
    const connection = this._getConnection(serverName, sessionId);
    if (!connection) return { tools: [] };
    return { tools: connection.tools || [] };
  }

  /**
   * List resources from a server
   */
  async listResources(serverName, sessionId = null) {
    const connection = this._getConnection(serverName, sessionId);
    if (!connection) return [];
    return connection.listResources();
  }

  /**
   * Read a resource from a server
   */
  async readResource(serverName, uri, sessionId = null) {
    const connection = this._getConnection(serverName, sessionId);
    if (!connection) throw new Error(`Not connected to ${serverName}`);
    return connection.readResource(uri);
  }

  /**
   * List prompts from a server
   */
  async listPrompts(serverName, sessionId = null) {
    const connection = this._getConnection(serverName, sessionId);
    if (!connection) return [];
    return connection.listPrompts();
  }

  /**
   * Get a prompt from a server
   */
  async getPrompt(serverName, name, args = {}, sessionId = null) {
    const connection = this._getConnection(serverName, sessionId);
    if (!connection) throw new Error(`Not connected to ${serverName}`);
    return connection.getPrompt(name, args);
  }

  /**
   * Helper to get connection (user or shared)
   */
  _getConnection(serverName, sessionId = null) {
    if (sessionId) {
      const userConn = this.userConnections.get(sessionId)?.get(serverName);
      if (userConn?.isConnected()) return userConn;
    }
    const sharedConn = this.connections.get(serverName);
    return sharedConn?.isConnected() ? sharedConn : null;
  }

  /**
   * Shutdown all connections
   */
  async shutdown() {
    console.log('[MCPManager] Shutting down all connections...');

    // Disconnect shared connections
    for (const serverName of this.connections.keys()) {
      await this.disconnectServer(serverName);
    }

    // Disconnect user connections
    for (const sessionId of this.userConnections.keys()) {
      await this.disconnectUserSession(sessionId);
    }
  }
}

// Singleton instance
let instance = null;

export function getMCPManager() {
  if (!instance) {
    instance = new MCPManager();
  }
  return instance;
}

export default MCPManager;

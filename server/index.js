/**
 * MCP Chat Studio Server
 *
 * Features:
 * - Multi-provider LLM support (Ollama, OpenAI, Anthropic, Gemini, Azure, Groq, Together)
 * - MCP server support (STDIO and SSE transports)
 * - Generic OAuth2/OIDC for MCP servers requiring user auth
 * - Chat API with tool calling and streaming
 * - Tool testing and debugging (Inspector)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';

import { getMCPManager } from './services/MCPManager.js';
import { createLLMClient } from './services/LLMClient.js';
import { createOAuthManager, getOAuthManager } from './services/OAuthManager.js';
import chatRoutes from './routes/chat.js';
import mcpRoutes from './routes/mcp.js';
import oauthRoutes from './routes/oauth.js';
import llmRoutes from './routes/llm.js';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3082;

// CORS configuration - secure by default
function getCorsOrigins() {
  // Always allow localhost variants
  const localOrigins = [
    'http://localhost:3082',
    'http://127.0.0.1:3082',
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`
  ];

  // Allow additional origins via environment variable
  const envOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [];

  return [...new Set([...localOrigins, ...envOrigins])];
}

const allowedOrigins = getCorsOrigins();
const corsMode = process.env.CORS_ORIGINS ? 'custom' : 'localhost-only';

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/:\d+$/, '')))) {
      return callback(null, true);
    }

    // In development, allow all localhost ports if configured or default to safer regex
    // Stricter regex to prevent subdomains or similar looking domains
    if (process.env.NODE_ENV !== 'production' && origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }

    callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
}));

// Log CORS configuration at startup
console.log(`[CORS] Mode: ${corsMode}`);
if (corsMode === 'custom') {
  console.log(`[CORS] Origins: ${process.env.CORS_ORIGINS}`);
} else {
  console.log('[CORS] Origins: localhost only (set CORS_ORIGINS to allow external origins)');
}
app.use(cookieParser());
app.use(express.json());

// Rate limiting - different limits for different endpoints
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for chat
  message: { error: 'Too many chat requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

const mcpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for MCP calls
  message: { error: 'Too many MCP requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute general
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

app.use(express.static(join(__dirname, '../public')));

// Helper function to substitute environment variables in config
function substituteEnvVars(obj) {
  if (typeof obj === 'string') {
    // Replace ${VAR_NAME} with process.env.VAR_NAME
    return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
  } else if (Array.isArray(obj)) {
    return obj.map(item => substituteEnvVars(item));
  } else if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = substituteEnvVars(obj[key]);
    }
    return result;
  }
  return obj;
}

// Load configuration
function loadConfig() {
  try {
    const configPath = join(__dirname, '../config.yaml');
    const configContent = readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    // Substitute environment variables in the config
    return substituteEnvVars(config);
  } catch (error) {
    console.error('Failed to load config.yaml:', error.message);
    // Return default config (Ollama local)
    return {
      llm: {
        provider: 'ollama',
        model: 'llama3.2',
        temperature: 0.7,
        base_url: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
      },
      oauth: {},
      mcpServers: {},
    };
  }
}

// Initialize services
async function initializeServices(config) {
  console.log('Initializing services...');

  // Initialize OAuth Manager
  const oauthManager = createOAuthManager(config);
  if (oauthManager.isConfigured()) {
    console.log('OAuth configured for Keycloak:', oauthManager.keycloakUrl);
  } else {
    console.log(
      'OAuth not configured (set KEYCLOAK_URL and OAUTH_CLIENT_ID for MCP OAuth support)'
    );
  }

  // Initialize LLM client
  const llmClient = createLLMClient(config);
  const validation = llmClient.validateConfig();

  if (validation.warnings.length > 0) {
    console.warn('LLM Config Warnings:', validation.warnings);
  }

  if (!validation.valid) {
    console.error('LLM Config Errors:', validation.errors);
    console.warn('Chat functionality will be limited without proper LLM credentials.');
  } else {
    // Test authentication
    try {
      await llmClient.authenticate();
      console.log('LLM client authenticated successfully');
    } catch (error) {
      console.error('LLM authentication failed:', error.message);
    }
  }

  // Initialize MCP Manager
  const mcpManager = getMCPManager();
  if (config.mcpServers) {
    await mcpManager.initialize(config.mcpServers);
  }

  return { llmClient, mcpManager, oauthManager };
}

// Routes with rate limiting
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/mcp', mcpLimiter, mcpRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/llm', llmRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mcpManager = getMCPManager();
  const oauth = getOAuthManager();
  const sessionId = req.cookies?.sessionId;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    oauth: {
      configured: oauth?.isConfigured() || false,
      authenticated: sessionId ? oauth?.isAuthenticated(sessionId) : false,
    },
    mcp: mcpManager.getStatus(sessionId),
  });
});

// Config endpoint (for UI)
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  const oauth = getOAuthManager();

  // Return safe config (no secrets)
  res.json({
    llm: {
      model: config.llm?.model,
      base_url: config.llm?.base_url,
    },
    oauth: {
      configured: oauth?.isConfigured() || false,
      keycloakUrl: oauth?.keycloakUrl,
      realm: oauth?.realm,
    },
    mcpServers: Object.entries(config.mcpServers || {}).map(([name, cfg]) => ({
      name,
      type: cfg.type || (cfg.command ? 'stdio' : 'sse'),
      requiresAuth: cfg.requiresAuth || cfg.requiresOAuth || false,
      description: cfg.description,
    })),
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  const mcpManager = getMCPManager();
  await mcpManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  const mcpManager = getMCPManager();
  await mcpManager.shutdown();
  process.exit(0);
});

// Start server
async function start() {
  try {
    const config = loadConfig();
    await initializeServices(config);

    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  Minimal Chat Server`);
      console.log(`  with MCP + OAuth Support`);
      console.log(`========================================`);
      console.log(`  Server:  http://localhost:${PORT}`);
      console.log(`  API:     http://localhost:${PORT}/api`);
      console.log(`  Health:  http://localhost:${PORT}/api/health`);
      console.log(`========================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

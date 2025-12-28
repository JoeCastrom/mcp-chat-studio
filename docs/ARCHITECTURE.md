# MCP Chat Studio Architecture

This document provides a comprehensive overview of MCP Chat Studio's architecture, design decisions, and implementation details.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Performance Considerations](#performance-considerations)
- [Extensibility](#extensibility)

---

## Overview

MCP Chat Studio is a full-stack web application for testing and developing Model Context Protocol (MCP) servers. It provides:

- Multi-provider LLM support (8 providers)
- MCP server management (STDIO & SSE transports)
- Tool testing and debugging capabilities
- Workflow builder for tool orchestration
- Performance testing and compliance checking

### Technology Stack

**Frontend:**
- Vanilla JavaScript (ES6+)
- CSS3 with custom properties (glassmorphism design)
- No frontend framework (intentional for simplicity)

**Backend:**
- Node.js 18+ with ES Modules
- Express.js for REST API
- MCP SDK (@modelcontextprotocol/sdk)
- vm2 for sandboxed JavaScript execution

**Storage:**
- localStorage for client-side data (sessions, scenarios, branches)
- File system for workflows (workflows.json)
- In-memory for active connections and OAuth tokens

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐  │
│  │    Chat    │  │ Inspector  │  │  Workflow Builder   │  │
│  │ Interface  │  │     UI     │  │        UI           │  │
│  └──────┬─────┘  └──────┬─────┘  └─────────┬───────────┘  │
│         │                │                  │               │
│         └────────────────┴──────────────────┘               │
│                         │                                    │
│                  WebSocket / HTTP                            │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                  Express Server                               │
│  ┌─────────────────────┴────────────────────────────────┐   │
│  │              REST API Routes                          │   │
│  │  /api/chat │ /api/mcp │ /api/workflows │ /api/perf │   │
│  └──────┬──────────┬──────────┬───────────────┬─────────┘   │
│         │          │          │               │              │
│  ┌──────▼──────┐ ┌▼──────────▼┐ ┌────────────▼──────────┐  │
│  │  LLM Client │ │ MCP Manager │ │ Workflow Engine       │  │
│  │             │ │             │ │                       │  │
│  │ - Ollama    │ │ - STDIO     │ │ - Node Execution      │  │
│  │ - OpenAI    │ │ - SSE       │ │ - Tool Orchestration  │  │
│  │ - Anthropic │ │ - OAuth     │ │ - Python Export       │  │
│  │ - Gemini    │ │             │ │                       │  │
│  │ - Azure     │ └──────┬──────┘ └───────────────────────┘  │
│  │ - Groq      │        │                                   │
│  │ - Together  │        │                                   │
│  │ - OpenRouter│        │                                   │
│  └─────────────┘        │                                   │
└────────────────────────┼────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼─────────┐           ┌───────────▼─────────┐
│  MCP Server 1   │           │  MCP Server N       │
│  (STDIO/SSE)    │    ...    │  (STDIO/SSE)        │
│                 │           │                     │
│  - Tools        │           │  - Tools            │
│  - Resources    │           │  - Resources        │
│  - Prompts      │           │  - Prompts          │
└─────────────────┘           └─────────────────────┘
```

---

## Frontend Architecture

### Component Structure

```
public/
├── index.html          # Main HTML (single page)
├── app.js              # Core application logic (5,820 lines)
├── workflow.js         # Workflow builder logic (1,220 lines)
├── brain.js            # Agent visualization (205 lines)
└── style.css           # Styling with CSS variables
```

### Key Design Patterns

#### 1. **Module Pattern**
Each major feature is encapsulated in its own scope:

```javascript
// Session management
const sessionManager = {
  saveSession() { /* ... */ },
  loadSession() { /* ... */ },
  createBranch() { /* ... */ }
};
```

#### 2. **Event-Driven Architecture**
Keyboard shortcuts, UI interactions, and API responses drive the application:

```javascript
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'k') {
    // Focus tool search
  }
});
```

#### 3. **State Management**
State is managed via:
- `localStorage` for persistence
- In-memory variables for runtime state
- DOM as the source of truth for UI state

### Data Flow (Frontend)

```
User Action
    │
    ▼
Event Handler
    │
    ▼
API Call (fetch)
    │
    ▼
Server Response
    │
    ▼
UI Update (DOM manipulation)
    │
    ▼
localStorage Update (if needed)
```

---

## Backend Architecture

### Service Layer

```
server/services/
├── LLMClient.js            # Multi-provider LLM abstraction (547 lines)
├── MCPManager.js           # MCP server lifecycle management (822 lines)
├── OAuthManager.js         # OAuth2/OIDC authentication (380 lines)
├── WorkflowEngine.js       # Workflow execution engine (301 lines)
├── WorkflowExporter.js     # Python code generation (245 lines)
├── MCPScaffolder.js        # Project scaffolding (NEW)
├── ContractValidator.js    # Schema validation (265 lines)
├── ProtocolCompliance.js   # MCP spec validation (NEW)
└── PerformanceTester.js    # Load testing (NEW)
```

### Route Layer

```
server/routes/
├── chat.js          # Chat & LLM operations
├── mcp.js           # MCP server management
├── llm.js           # LLM configuration
├── oauth.js         # OAuth authentication
├── workflows.js     # Workflow CRUD
├── scaffold.js      # Project generation (NEW)
└── performance.js   # Performance testing (NEW)
```

### Key Design Patterns

#### 1. **Singleton Pattern**
Services are singletons to maintain state:

```javascript
let instance = null;
export function getMCPManager() {
  if (!instance) {
    instance = new MCPManager();
  }
  return instance;
}
```

#### 2. **Strategy Pattern**
LLM providers use strategy pattern:

```javascript
class LLMClient {
  async chat(payload) {
    switch (this.provider) {
      case 'openai':
        return this.chatOpenAI(payload);
      case 'anthropic':
        return this.chatAnthropic(payload);
      // ...
    }
  }
}
```

#### 3. **Adapter Pattern**
Each LLM provider has request/response transformers:

```javascript
transformForAnthropic(payload) {
  // OpenAI format → Anthropic format
}

transformAnthropicResponse(response) {
  // Anthropic format → OpenAI format
}
```

---

## Data Flow

### Tool Execution Flow

```
1. User clicks "Execute" in Inspector
   │
   ▼
2. Frontend: POST /api/mcp/call
   │
   ▼
3. Backend: mcpRoutes.js validates request
   │
   ▼
4. MCPManager.callTool(serverName, toolName, args)
   │
   ▼
5. MCPConnection._sendRawRequest() via JSON-RPC
   │
   ▼
6. MCP Server processes tool call
   │
   ▼
7. Response validated (optional: ContractValidator)
   │
   ▼
8. Result returned to frontend
   │
   ▼
9. UI updated with response
```

### Chat with Tools Flow

```
1. User sends message with "Use MCP Tools" enabled
   │
   ▼
2. POST /api/chat with message + available tools
   │
   ▼
3. LLMClient.chat() calls provider API
   │
   ▼
4. LLM decides to use tools (tool_calls in response)
   │
   ▼
5. Backend executes each tool via MCPManager
   │
   ▼
6. Tool results returned to LLM
   │
   ▼
7. POST /api/chat/continue with tool results
   │
   ▼
8. LLM generates final response
   │
   ▼
9. Response streamed to frontend
```

### Workflow Execution Flow

```
1. User triggers workflow execution
   │
   ▼
2. POST /api/workflows/:id/execute
   │
   ▼
3. WorkflowEngine.executeWorkflow(workflowId, inputData)
   │
   ▼
4. Topological sort of nodes (BFS)
   │
   ▼
5. For each node:
   │  - trigger: Pass input data
   │  - tool: Call MCP tool
   │  - llm: Call LLM
   │  - javascript: Execute in vm2 sandbox
   │  - assert: Validate condition
   │
   ▼
6. Variable substitution: {{nodeId.output}}
   │
   ▼
7. Results collected and returned
```

---

## Security Model

### 1. **Sandboxing**
JavaScript nodes execute in vm2 sandbox:

```javascript
const vm = new VM({
  timeout: 5000,
  sandbox: {
    input: context.steps,
    console: { log, error }
  }
});
```

**Protections:**
- No file system access
- No network access
- 5-second timeout
- Limited global scope

### 2. **OAuth Token Management**

```javascript
class OAuthManager {
  constructor() {
    this.tokens = new Map(); // sessionId → tokens
  }

  storeTokens(sessionId, tokens) {
    // In-memory only (production should use Redis)
  }
}
```

**Recommendations:**
- Use Redis for multi-instance deployments
- Implement token rotation
- Add token revocation

### 3. **Rate Limiting**

```javascript
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30 // 30 requests per minute
});

const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100 // 100 requests per minute
});
```

### 4. **Input Validation**

```javascript
// Zod schema validation for workflows
const WorkflowSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema)
});

const result = WorkflowSchema.safeParse(workflow);
if (!result.success) {
  throw new Error('Invalid workflow');
}
```

### 5. **CORS Configuration**

```javascript
app.use(cors({
  origin: (origin, callback) => {
    // Strict localhost-only by default
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'), false);
    }
  },
  credentials: true
}));
```

---

## Performance Considerations

### 1. **Connection Pooling**
MCP connections are reused per session:

```javascript
class MCPManager {
  constructor() {
    this.connections = new Map(); // serverName → connection
    this.sessionConnections = new Map(); // sessionId → connections
  }
}
```

### 2. **Caching**
- Tool lists cached per connection
- LLM configurations cached
- Session data in localStorage

### 3. **Parallel Execution**
Workflows support concurrent node execution:

```javascript
// Add nodes to queue and execute in parallel if no dependencies
const queue = [...startNodes];
while (queue.length > 0) {
  const node = queue.shift();
  // Check dependencies and execute
}
```

### 4. **Response Streaming**
LLM responses streamed for better UX:

```javascript
const stream = await llmClient.chatStream(messages);
for await (const chunk of stream) {
  // Send chunk to client via SSE
}
```

### 5. **Lazy Loading**
MCP servers connect on-demand:

```javascript
async connect(serverName, sessionId) {
  if (this.connections.has(serverName)) {
    return; // Already connected
  }
  // Create new connection
}
```

---

## Extensibility

### Adding a New LLM Provider

1. **Update LLMClient.js:**

```javascript
case 'new-provider':
  return await this.chatNewProvider(payload);
```

2. **Implement provider methods:**

```javascript
async chatNewProvider(payload) {
  const transformed = this.transformForNewProvider(payload);
  const response = await fetch(/* ... */);
  return this.transformNewProviderResponse(response);
}
```

3. **Update configuration:**

```javascript
getBaseUrl() {
  case 'new-provider':
    return 'https://api.newprovider.com/v1';
}
```

### Adding a New Workflow Node Type

1. **Update Zod schema:**

```javascript
const NodeSchema = z.object({
  type: z.enum(['trigger', 'tool', 'llm', 'javascript', 'assert', 'NEW_TYPE'])
});
```

2. **Implement execution logic:**

```javascript
case 'NEW_TYPE':
  // Custom logic
  return result;
```

3. **Update UI:**
Add node type to workflow builder (`workflow.js`)

### Adding a New API Route

1. **Create route file:**

```javascript
// server/routes/newfeature.js
import express from 'express';
const router = express.Router();

router.get('/endpoint', (req, res) => {
  // Logic
});

export default router;
```

2. **Register in server/index.js:**

```javascript
import newFeatureRoutes from './routes/newfeature.js';
app.use('/api/newfeature', newFeatureRoutes);
```

3. **Add Swagger docs:**

```javascript
/**
 * @swagger
 * /api/newfeature/endpoint:
 *   get:
 *     summary: Description
 *     tags: [NewFeature]
 */
```

---

## Testing Strategy

### Unit Tests
```
server/__tests__/
├── LLMClient.test.js          # LLM provider transforms
├── MCPManager.test.js         # Connection management
├── WorkflowEngine.test.js     # Workflow execution
└── ContractValidator.test.js  # Schema validation
```

### Integration Tests
Test API endpoints end-to-end:

```javascript
describe('POST /api/mcp/call', () => {
  it('should execute tool successfully', async () => {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      body: JSON.stringify({ serverName, toolName, args })
    });
    expect(response.ok).toBe(true);
  });
});
```

### Performance Tests
Use PerformanceTester service:

```javascript
const results = await tester.runLoadTest({
  serverName: 'test-server',
  toolName: 'test-tool',
  concurrency: 50,
  duration: 10000
});
```

---

## Deployment Architecture

### Single Instance

```
┌─────────────────┐
│   Load Balancer │
│   (nginx/Apache)│
└────────┬────────┘
         │
    ┌────▼────┐
    │  Node   │
    │ Process │
    └─────────┘
```

### Multi-Instance (Recommended for Production)

```
┌──────────────────┐
│  Load Balancer   │
└────────┬─────────┘
         │
    ┌────┼────┐
    │    │    │
┌───▼┐ ┌─▼──┐ ┌▼───┐
│ N1 │ │ N2 │ │ N3 │
└──┬─┘ └──┬─┘ └─┬──┘
   │      │     │
   └──────┼─────┘
          │
    ┌─────▼──────┐
    │   Redis    │ (session store)
    └────────────┘
```

---

## Configuration Management

### Environment Variables (.env)
```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Server
PORT=3082
NODE_ENV=production

# CORS
CORS_ORIGINS=https://app.example.com
```

### Config File (config.yaml)
```yaml
llm:
  provider: openai
  model: gpt-4o

mcpServers:
  github:
    type: stdio
    command: npx
    args: ['@modelcontextprotocol/server-github']
    env:
      GITHUB_TOKEN: '${GITHUB_TOKEN}'
```

### Swagger Configuration
```javascript
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MCP Chat Studio API',
      version: '1.1.0'
    }
  },
  apis: ['./server/routes/*.js']
};
```

---

## Monitoring and Observability

### Logging
```javascript
console.log(`[${service}] ${message}`);
console.error(`[${service}] Error:`, error);
```

### Health Checks
```bash
curl http://localhost:3082/api/health
```

### Performance Metrics
Available via `/api/performance/*` endpoints

---

## Future Architecture Considerations

### 1. **Microservices Split**
- LLM Gateway Service
- MCP Proxy Service
- Workflow Execution Service

### 2. **Event-Driven Architecture**
Replace HTTP polling with WebSockets/SSE for real-time updates

### 3. **Database Layer**
Add PostgreSQL for:
- User management
- Workflow persistence
- Audit logs

### 4. **Plugin System**
Allow third-party extensions:
```javascript
class MCPPlugin {
  onToolCall(result) { /* custom logic */ }
  onWorkflowComplete(result) { /* custom logic */ }
}
```

---

## Glossary

- **MCP**: Model Context Protocol
- **STDIO**: Standard Input/Output transport
- **SSE**: Server-Sent Events transport
- **LLM**: Large Language Model
- **OAuth**: Open Authorization
- **PKCE**: Proof Key for Code Exchange
- **JSON-RPC**: JSON Remote Procedure Call

---

## Resources

- [MCP Specification](https://modelcontextprotocol.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Swagger/OpenAPI](https://swagger.io/)
- [vm2 Security](https://github.com/patriksimek/vm2)

---

**Last Updated**: 2025-12-28
**Version**: 1.1.0

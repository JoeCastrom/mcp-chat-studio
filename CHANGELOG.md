# Changelog

All notable changes to MCP Chat Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-12-29

### 🚀 Major Features

**Workflow Debugger:**
- ✨ **Breakpoint debugging** - Pause workflow execution at specific nodes
- ✨ **Step-through mode** - Execute workflows one node at a time
- ✨ **Variable inspection** - View context, inputs, and outputs at any point
- ✨ **Execution control** - Pause, resume, step, and abort running workflows
- ✨ **Debug sessions** - Full session management with state tracking
- ✨ **11 API endpoints** - Complete debug API at `/api/workflows/debug/*`

**Advanced Inspector Features:**
- ✨ **Message Timeline** - Chronological log of all JSON-RPC messages with timestamps
- ✨ **Bulk Testing** - Execute tools with multiple inputs, parallel or sequential
- ✨ **Result Diff** - Side-by-side comparison of tool outputs with similarity scoring
- ✨ **Timeline filtering** - Filter by server, method, and message type
- ✨ **Performance metrics** - Track latency statistics (avg, min, max, p50, p95)
- ✨ **Export capability** - Export timeline to JSON/CSV formats
- ✨ **3 new sub-tabs** - Timeline, Bulk Test, and Diff in Inspector panel

**Contract Testing Suite:**
- ✨ **Consumer-driven contracts** - Define expected tool behavior
- ✨ **Multiple assertion types** - Schema, contains, equals, response time, custom
- ✨ **Contract versioning** - Track contract changes over time
- ✨ **Auto-generation** - Generate contracts from tool schemas
- ✨ **CRUD operations** - Full contract lifecycle management
- ✨ **Test reporting** - Detailed pass/fail results with error tracking
- ✨ **API endpoints** - `/api/contracts/*` for programmatic access

**Tool Explorer & Analytics:**
- ✨ **Usage statistics** - Track calls, success rates, latency per tool
- ✨ **Performance metrics** - Avg/min/max/p50/p95/p99 latency tracking
- ✨ **Error tracking** - Record and display recent errors per tool
- ✨ **Leaderboard** - Most-used tools across all servers
- ✨ **Health dashboard** - Overall system health and problematic tools
- ✨ **Trend analysis** - Usage patterns over configurable time periods
- ✨ **Automatic tracking** - All tool executions automatically recorded
- ✨ **Export stats** - Export to JSON or CSV formats

### ✨ New Features

**Inspector Enhancements:**
- ✨ **6 sub-tabs total** - Tools, Resources, Prompts, Timeline, Bulk Test, Diff
- ✨ **Real-time tracking** - Live updates during tool execution
- ✨ **Similarity scoring** - Percentage-based diff comparison
- ✨ **Test summaries** - Comprehensive result breakdowns

**Contract Testing:**
- ✨ **Path-based assertions** - Query nested response properties
- ✨ **Custom operators** - equals, notEquals, greaterThan, lessThan, contains, exists
- ✨ **Contract storage** - Persisted to `contracts/` directory
- ✨ **Test suites** - Multiple tests per contract

**Developer Experience:**
- ✨ **11 new API endpoints** - Workflow debugging routes
- ✨ **12 new API endpoints** - Inspector enhancement routes
- ✨ **7 new API endpoints** - Contract testing routes
- ✨ **11 new API endpoints** - Tool explorer routes
- ✨ **Swagger documentation** - All new endpoints fully documented
- ✨ **TypeScript-ready** - Clean interfaces and types

### Changed

- 📝 **Swagger tags** - Added Inspector, Contracts, ToolExplorer tags
- 📝 **Inspector UI** - Enhanced with 3 new sub-tab panels
- 📝 **Tool execution** - Now automatically tracked for analytics
- 📝 **Route organization** - New routes for debugging, contracts, analytics

### Fixed

- 🐛 **Inspector tab switching** - Now supports 6 tabs dynamically
- 🐛 **Server population** - Bulk test and diff dropdowns auto-populated

### Documentation

- 📚 **API documentation** - 41 new endpoints in Swagger
- 📚 **Feature coverage** - Complete debugging, testing, and analytics suite

---

## [1.2.0] - 2025-12-28

### 🚀 Major Features

**MCP Server Scaffolding:**
- ✨ **Full project generation** - Create complete MCP servers with one API call
- ✨ **Multi-language support** - Python (FastMCP), Node.js, TypeScript
- ✨ **Best practices included** - Tests, linting, README, .gitignore
- ✨ **API endpoint** - `/api/scaffold/generate` for programmatic access

**Protocol Compliance Checker:**
- ✨ **JSON-RPC 2.0 validation** - Validate message format compliance
- ✨ **MCP spec validation** - Check tools, resources, prompts format
- ✨ **Initialization validation** - Verify server capabilities
- ✨ **Tool result validation** - Check content array format
- ✨ **API endpoints** - `/api/mcp/compliance/check` and `/api/mcp/compliance/validate-message`

**Performance Testing:**
- ✨ **Load testing** - Sustained concurrent requests
- ✨ **Stress testing** - Gradually increase load to find limits
- ✨ **Spike testing** - Test sudden traffic bursts
- ✨ **Metrics** - Latency percentiles (p50, p95, p99), throughput, error rates
- ✨ **API endpoints** - `/api/performance/load`, `/api/performance/stress`, `/api/performance/spike`

### 🔒 Security Improvements

- ✨ **vm2 sandboxing** - JavaScript workflow nodes now execute in secure sandbox
- ✨ **Input validation** - Zod schema validation for workflows
- ✨ **Timeout protection** - 5-second timeout for JavaScript execution
- ✨ **Isolated scope** - No file system or network access from workflow scripts

### ✨ New Features

**Enhanced Testing:**
- ✨ **MCPManager tests** - Comprehensive unit tests (13 test cases)
- ✨ **ContractValidator tests** - Schema validation tests (12 test cases)
- ✨ **Total test coverage** - 51 tests across 4 test suites

**Keyboard Shortcuts:**
- ✨ **Ctrl+T** - Quick tool search
- ✨ **Ctrl+R** - Refresh all servers
- ✨ **F5** - Re-run last tool call
- ✨ **Ctrl+1-5** - Switch between tabs
- ✨ **Enhanced help** - Organized shortcut categories

**CI/CD Integration:**
- ✨ **GitHub Actions template** - Ready-to-use workflow for MCP servers
- ✨ **GitLab CI template** - Complete pipeline configuration
- ✨ **Documentation** - Comprehensive CI/CD integration guide
- ✨ **Pre-commit hooks** - Example hooks for local testing

**Developer Tools:**
- ✨ **Architecture documentation** - Complete system architecture guide
- ✨ **API documentation** - Swagger specs for all new endpoints
- ✨ **Extension guide** - How to add providers, nodes, routes

### Changed

- 📝 **Swagger tags** - Added Scaffold, Performance tags
- 📝 **Dependencies** - Added vm2 for secure sandboxing
- 📝 **Swagger dependencies** - Added swagger-jsdoc, swagger-ui-express

### Fixed

- 🐛 **Security vulnerability** - Replaced unsafe eval() with vm2 sandbox
- 🐛 **Workflow validation** - Added proper Zod schema validation

### Documentation

- 📚 **ARCHITECTURE.md** - Complete system architecture documentation
- 📚 **CI_CD_INTEGRATION.md** - CI/CD setup and best practices
- 📚 **Swagger API docs** - Interactive API documentation at `/api-docs`

---

## [1.1.0] - 2025-12-28

### 🚀 Major Features

**Visual Workflow Builder:**

- ✨ **Drag-and-drop workflow canvas** - Chain MCP tools visually
- ✨ **4 Node Types:**
  - 🟢 Trigger - Starting point with input data
  - 🔵 MCP Tool - Execute any connected server tool
  - 🟠 LLM - Process data with AI
  - 🟣 JavaScript - Custom logic/glue code
- ✨ **Variable substitution** - Use `{{nodeId.output}}` to pipe data between nodes
- ✨ **Workflow execution engine** - BFS-based with dependency resolution
- ✨ **Save/Load workflows** - Persist to `workflows.json`
- ✨ **Export to Python** - Generate standalone MCP scripts

**AI Workflow Builder:**

- ✨ **Natural language workflow generation** - Describe your goal, AI builds the workflow
- ✨ Uses connected tools to create practical workflows

**Brain Visualization:**

- ✨ **Real-time agent trace** - See message flow as a visual graph
- ✨ **Split-panel view** - Toggle alongside chat
- ✨ **Node type detection** - User, Assistant, Tool calls visualized differently

**LLM Providers:**

- ✨ **OpenRouter support** - Access 100+ models via single API (8th provider!)

### Changed

- 📝 Updated CI workflow to include unit tests
- 📝 Improved documentation with workflow guide

### Fixed

- 🐛 Fixed `escapeHtml` dependency in brain.js

---

## [1.0.0] - 2025-12-21

### 🎉 Initial Release

#### Features

**LLM Support:**

- ✨ Multi-provider LLM support (7 providers)
  - Ollama (local, default)
  - OpenAI (GPT-4o, GPT-4, GPT-3.5)
  - Anthropic Claude (Claude 3.5, Claude 3)
  - Google Gemini (Gemini Pro, Gemini Flash)
  - Azure OpenAI (Enterprise deployments)
  - Groq (Ultra-fast inference)
  - Together AI (Open-source models)
- ✨ Real-time streaming with typing effect
- ✨ Tool calling support for all providers
- ✨ Provider-specific request/response transformation

**MCP Protocol:**

- ✨ Dynamic MCP server management (add/remove at runtime)
- ✨ STDIO transport support
- ✨ SSE (Server-Sent Events) transport support
- ✨ Environment variable injection per server
- ✨ Auto-connect on startup (configurable)
- ✨ Tool namespacing to prevent collisions
- ✨ Resources API support
- ✨ Prompts API support

**Tool Testing:**

- ✨ "Test All Tools" feature - smoke test all connected tools
- ✨ Response preview and timing measurement
- ✨ Safe mode - skip risky tools (Click, Type, Launch)
- ✨ Error detection using MCP's `isError` field
- ✨ Tool schema viewer with parameter details

**Inspector:**

- ✨ Manual tool execution without LLM
- ✨ Auto-generated forms from JSON schema
- ✨ Raw MCP request/response viewer
- ✨ SSE event viewer for real-time debugging
- ✨ Support for all parameter types (string, number, boolean, array, object, enum)

**Authentication:**

- ✨ OAuth2/OIDC support with PKCE
- ✨ Provider presets (Keycloak, GitHub, Google)
- ✨ Custom OAuth2 provider support
- ✨ Per-user MCP server connections
- ✨ Automatic token refresh
- ✨ Secure session management

**Configuration:**

- ✨ YAML/JSON config import/export
- ✨ Paste config from documentation
- ✨ Live config preview before adding servers
- ✨ Environment variable substitution
- ✨ Config persistence

**UI/UX:**

- ✨ Modern glassmorphism design
- ✨ Dark/Light theme toggle
- ✨ Responsive layout
- ✨ Keyboard shortcuts
- ✨ Tool forcing mode
- ✨ Settings panel for LLM configuration
- ✨ Server status indicators
- ✨ Tool count badges

**Developer Experience:**

- ✨ Docker support (Dockerfile + docker-compose)
- ✨ ESLint and Prettier configuration
- ✨ Development mode with auto-reload
- ✨ Health check endpoint
- ✨ Comprehensive documentation
- ✨ Contributing guidelines

#### Security

- 🔒 Configurable SSL verification (secure by default)
- 🔒 Environment-based secret management
- 🔒 In-memory token storage (production: use Redis)
- 🔒 PKCE support for OAuth flows
- 🔒 Secure HTTPS agent configuration

#### Documentation

- 📚 Comprehensive README with examples
- 📚 Configuration guide (.env.example)
- 📚 Config examples (config.yaml.example)
- 📚 Contributing guidelines
- 📚 API endpoint documentation
- 📚 Troubleshooting section
- 📚 Keyboard shortcuts reference

#### Development

- 🛠️ ESLint configuration
- 🛠️ Prettier configuration
- 🛠️ Docker support with health checks
- 🛠️ Development mode with auto-reload
- 🛠️ Clean project structure

### Notes

This is the initial public release of MCP Chat Studio. All VW-specific code and configurations have been removed to create a clean, general-purpose MCP testing tool suitable for the community.

---

## Format Guide

Types of changes:

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements

# Changelog

All notable changes to MCP Chat Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

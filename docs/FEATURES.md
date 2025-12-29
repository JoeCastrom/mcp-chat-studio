# MCP Chat Studio - Complete Feature Guide

**Version**: 1.5.0
**Last Updated**: December 29, 2025

> The Ultimate Testing Platform for Model Context Protocol (MCP) - "Postman for MCP"

---

## Table of Contents

- [Core Features](#core-features)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Development Tools](#development-tools)
- [Debugging & Inspection](#debugging--inspection)
- [Analytics & Monitoring](#analytics--monitoring)
- [Automation](#automation)
- [Documentation](#documentation)
- [Integration & Export](#integration--export)
- [Quick Start Guides](#quick-start-guides)

---

## Core Features

### 1. Multi-Provider LLM Support
**What it does**: Connect to 8+ LLM providers with a single configuration.

**Supported Providers**:
- **Ollama** (local, no API key needed)
- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude 3.5 Sonnet, Opus, Haiku)
- **Google Gemini** (Gemini 1.5 Pro/Flash)
- **Azure OpenAI**
- **Groq** (ultra-fast inference)
- **Together AI**
- **OpenRouter** (100+ models via single API)

**How to use**:
```yaml
# config.yaml
llm:
  provider: ollama
  model: llama3.1:8b
  temperature: 0.7
  base_url: http://localhost:11434/v1
```

**API Endpoint**: `GET /api/llm/config`, `POST /api/llm/config`

---

### 2. MCP Server Management
**What it does**: Connect and manage multiple MCP servers (STDIO and SSE transports).

**How to use**:
```yaml
# config.yaml
mcpServers:
  filesystem:
    type: stdio
    command: npx
    args:
      - "@modelcontextprotocol/server-filesystem"
      - "/path/to/directory"
    description: "File system access"
    startup: true
```

**UI**:
- View connected servers in left sidebar
- Connect/disconnect servers
- See connection status (green dot = connected)

**API Endpoints**:
- `GET /api/mcp/servers` - List all servers
- `POST /api/mcp/connect/:name` - Connect to server
- `POST /api/mcp/disconnect/:name` - Disconnect from server

---

### 3. Chat Interface
**What it does**: Interactive AI chat with automatic tool calling and streaming responses.

**Features**:
- Streaming responses for real-time feedback
- Automatic tool calling based on context
- Message history
- Model selection per message
- Export conversations

**How to use**:
1. Navigate to **Chat** tab
2. Type your message
3. LLM automatically calls MCP tools as needed
4. View tool calls and results inline

**API Endpoint**: `POST /api/chat`

**Example**:
```json
{
  "messages": [
    { "role": "user", "content": "List files in /tmp" }
  ],
  "stream": true,
  "useTools": true
}
```

---

### 4. Tool Inspector
**What it does**: Manually test and debug MCP tools with custom inputs.

**How to use**:
1. Navigate to **Inspector** tab
2. Select **Tools** sub-tab
3. Choose a server and tool
4. Enter JSON arguments
5. Click **Call Tool**
6. View response with syntax highlighting

**Features**:
- JSON schema validation
- Syntax highlighting
- Error handling
- Response time tracking

**API Endpoint**: `POST /api/mcp/call`

---

### 5. OAuth Support
**What it does**: Generic OAuth2/OIDC for MCP servers requiring user authentication.

**Supported**:
- GitHub OAuth
- Google OAuth
- Custom OAuth2 providers
- PKCE support

**How to configure**:
```yaml
# config.yaml
oauth:
  provider: github
  client_id: "${OAUTH_CLIENT_ID}"
  client_secret: "${OAUTH_CLIENT_SECRET}"
  redirect_uri: "http://localhost:3082/api/oauth/callback"
```

**API Endpoints**:
- `GET /api/oauth/login` - Initiate OAuth flow
- `GET /api/oauth/callback` - Handle callback
- `GET /api/oauth/status` - Check auth status

---

## Testing & Quality Assurance

### 6. Collections System (like Postman Collections)
**What it does**: Organize test scenarios into reusable collections.

**How to use**:
1. Navigate to **Scenarios** tab → **Collections**
2. Click **Create Collection**
3. Add name, description, environment variables
4. Add scenarios to collection
5. Run entire collection with one click

**Features**:
- Environment variables at collection level
- Authentication configuration
- Scenario ordering
- Run all scenarios sequentially or with delays

**API Endpoints** (12 total):
- `POST /api/collections` - Create collection
- `GET /api/collections` - List all collections
- `GET /api/collections/:id` - Get collection details
- `POST /api/collections/:id/run` - Run collection
- `POST /api/collections/:id/fork` - Duplicate collection
- `GET /api/collections/:id/export` - Export as JSON
- `POST /api/collections/import` - Import from JSON

**Example**:
```json
{
  "name": "API Test Suite",
  "description": "Full integration tests",
  "variables": {
    "baseUrl": "https://api.example.com",
    "apiKey": "{{API_KEY}}"
  },
  "scenarios": [
    { "name": "Test 1", "server": "github", "tool": "search_repositories" },
    { "name": "Test 2", "server": "filesystem", "tool": "read_file" }
  ]
}
```

---

### 7. CLI Runner - `mcp-test` (like newman)
**What it does**: Run collections from the command line for CI/CD integration.

**How to use**:
```bash
# Install
npm install -g mcp-chat-studio

# Run a collection
mcp-test run ./collections/api-tests.json

# With options
mcp-test run ./collections/api-tests.json \
  --environment ./env/production.json \
  --reporters cli,junit \
  --export ./results.json \
  --bail \
  --delay 1000

# Validate collection
mcp-test validate ./collections/api-tests.json

# List collections
mcp-test list
```

**Reporters**:
- **CLI**: Color-coded terminal output (✓ = pass, ✗ = fail)
- **JSON**: Machine-readable results
- **JUnit**: XML format for Jenkins/GitLab CI

**Exit codes**:
- `0` = All tests passed
- `1` = One or more tests failed

**Example CI/CD** (GitHub Actions):
```yaml
- name: Run MCP Tests
  run: mcp-test run ./collections/integration-tests.json --reporters junit

- name: Publish Test Results
  uses: EnricoMi/publish-unit-test-result-action@v2
  with:
    files: ./junit-results.xml
```

---

### 8. Monitors (like Postman Monitors)
**What it does**: Schedule collections to run automatically.

**How to use**:
1. Navigate to **Monitors** section (via API or future UI)
2. Create monitor with:
   - Name
   - Collection ID
   - Schedule (5m, 1h, 30s, or cron expression)
   - Webhook notification URL (optional)
3. Monitor runs automatically

**Schedule Formats**:
- Simple: `5m`, `1h`, `30s`
- Cron: `0 */6 * * *` (every 6 hours)

**API Endpoints** (9 total):
- `POST /api/monitors` - Create monitor
- `GET /api/monitors` - List monitors
- `POST /api/monitors/:id/run` - Manual run
- `POST /api/monitors/:id/start` - Start scheduling
- `POST /api/monitors/:id/stop` - Stop scheduling
- `GET /api/monitors/stats` - Monitor statistics

**Example**:
```json
{
  "name": "Nightly API Tests",
  "collectionId": "col_123456",
  "schedule": "0 2 * * *",
  "enabled": true,
  "notifications": [
    {
      "type": "webhook",
      "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    }
  ]
}
```

**Auto-start**: Monitors automatically resume on server restart.

---

### 9. Contract Testing Suite
**What it does**: Consumer-driven contract testing to ensure MCP tools behave as expected.

**How to use**:
1. Navigate to **Contracts** section (via API)
2. Create contract defining expected behavior
3. Run contract tests
4. View pass/fail results

**Assertion Types**:
- **Schema**: Validate response structure
- **Equals**: Exact value match
- **Contains**: String/array contains value
- **Response Time**: Performance assertion
- **Custom**: JavaScript expressions

**API Endpoints** (7 total):
- `POST /api/contracts` - Create contract
- `GET /api/contracts` - List contracts
- `POST /api/contracts/:id/test` - Run contract test
- `POST /api/contracts/generate/:server/:tool` - Auto-generate from schema

**Example Contract**:
```json
{
  "name": "GitHub Search Contract",
  "server": "github",
  "tool": "search_repositories",
  "version": "1.0.0",
  "tests": [
    {
      "name": "Returns array of repositories",
      "input": { "query": "mcp" },
      "assertions": [
        { "type": "schema", "path": "items", "schema": { "type": "array" } },
        { "type": "response_time", "operator": "lessThan", "value": 2000 }
      ]
    }
  ]
}
```

---

### 10. Bulk Testing
**What it does**: Test a tool with multiple inputs in parallel or sequence.

**How to use**:
1. Navigate to **Inspector** → **Bulk Test** tab
2. Select server and tool
3. Add multiple test cases
4. Choose parallel or sequential execution
5. Run and compare results

**Features**:
- Parallel execution for speed
- Sequential execution for order-dependent tests
- Result comparison table
- Export results as CSV/JSON

**API Endpoint**: `POST /api/inspector/bulk-test`

**Example**:
```json
{
  "server": "filesystem",
  "tool": "read_file",
  "testCases": [
    { "name": "Config file", "arguments": { "path": "/config.json" } },
    { "name": "Package file", "arguments": { "path": "/package.json" } },
    { "name": "README", "arguments": { "path": "/README.md" } }
  ],
  "parallel": true
}
```

---

### 11. Result Diff
**What it does**: Side-by-side comparison of tool outputs with similarity scoring.

**How to use**:
1. Navigate to **Inspector** → **Diff** tab
2. Select two test results
3. View visual diff with highlighting
4. See similarity percentage

**Features**:
- JSON diff visualization
- Similarity scoring (0-100%)
- Character-by-character comparison
- Export diff report

**API Endpoint**: `POST /api/inspector/diff`

---

### 12. Test History
**What it does**: Automatic logging of all test executions.

**Features**:
- Stores all tool calls with timestamps
- Searchable history
- Filter by server/tool/date
- Replay previous tests
- Export history

**How to use**:
1. Navigate to **History** tab
2. View chronological test log
3. Click any entry to view details
4. Click "Replay" to re-run with same inputs

**API Endpoint**: `GET /api/history`

---

## Development Tools

### 13. MCP Server Scaffolding
**What it does**: Generate complete MCP server projects with best practices.

**Supported Languages**:
- **Python** (FastMCP framework)
- **Node.js** (JavaScript)
- **TypeScript**

**How to use**:
1. Navigate to **Generator** tab
2. Select language
3. Enter project details
4. Add tools, resources, prompts
5. Click **Generate**
6. Download ZIP file

**What's included**:
- Complete project structure
- Tool implementations (stubs)
- Tests (pytest, jest)
- Linting config
- README with usage instructions
- .gitignore

**API Endpoint**: `POST /api/scaffold/generate`

**Example**:
```json
{
  "language": "python",
  "projectName": "my-mcp-server",
  "description": "Custom MCP tools",
  "tools": [
    {
      "name": "process_data",
      "description": "Process CSV data",
      "parameters": {
        "file_path": { "type": "string", "description": "Path to CSV" }
      }
    }
  ]
}
```

---

### 14. Visual Workflow Builder
**What it does**: Create complex multi-step workflows with drag-and-drop interface.

**How to use**:
1. Navigate to **Workflows** tab
2. Click **New Workflow**
3. Drag nodes from toolbar onto canvas
4. Connect nodes to define flow
5. Configure each node
6. Click **Run Workflow**

**Node Types**:
- **Trigger**: Starting point
- **Tool**: Call MCP tool
- **LLM**: AI analysis/reasoning
- **JavaScript**: Custom code
- **Assert**: Validation checks

**Features**:
- Variable passing between nodes (`{{node_id.output}}`)
- Conditional branching
- Error handling
- Visual execution tracking
- Export/import workflows as JSON

**API Endpoints**:
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows
- `POST /api/workflows/:id/execute` - Run workflow

---

### 15. AI Workflow Builder
**What it does**: Generate workflows from natural language descriptions using AI.

**How to use**:
1. Navigate to **Workflows** tab
2. Click **AI Builder** button
3. Describe what you want: "Search GitHub for MCP projects, read the README of the top result, and summarize it"
4. Click **Generate**
5. AI creates complete workflow
6. Review and run

**Default Model**: `llama3.1:8b` (configurable in config.yaml)

**Features**:
- Analyzes available MCP tools
- Generates optimal node placement
- Connects nodes logically
- Adds error handling

---

### 16. Mock MCP Servers
**What it does**: Create runtime mock servers that return canned responses for testing.

**How to use**:

**API Method**:
```bash
# Create mock server
curl -X POST http://localhost:3082/api/mocks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mock GitHub",
    "tools": [
      {
        "name": "search_repositories",
        "description": "Search repos",
        "inputSchema": { "type": "object" },
        "response": {
          "items": [
            { "name": "{{query}}-result-1", "stars": 100 },
            { "name": "{{query}}-result-2", "stars": 50 }
          ]
        }
      }
    ],
    "delay": 100,
    "errorRate": 0.1
  }'

# Call mock tool
curl -X POST http://localhost:3082/api/mocks/mock_123/tools/search_repositories/call \
  -H "Content-Type: application/json" \
  -d '{ "query": "mcp" }'
```

**Variable Substitution**: Use `{{variableName}}` in responses to inject argument values.

**Features**:
- Simulate network delays
- Configure error rates for reliability testing
- Track call counts
- Auto-generate from collections

**API Endpoints** (14 total):
- `POST /api/mocks` - Create mock
- `POST /api/mocks/:id/tools/:tool/call` - Call mock tool
- `POST /api/mocks/from-collection` - Generate from collection
- `POST /api/mocks/:id/reset` - Reset statistics

---

### 17. Pre/Post Scripts (like Postman Scripts)
**What it does**: Execute JavaScript before tool calls (pre-request) or after responses (post-response).

**How to use**:

**Create Pre-Request Script**:
```javascript
// Set variables before request
pm.variables.set('timestamp', Date.now());
pm.environment.set('apiKey', 'secret-key-123');

console.log('Request will use key:', pm.environment.get('apiKey'));
```

**Create Post-Response Script**:
```javascript
// Validate response
pm.test('Response has data', function() {
  pm.expect(pm.response).to.have.property('content');
});

pm.test('Response time is acceptable', function() {
  pm.expect(pm.response.duration).to.be.below(2000);
});

// Extract data for next request
const result = JSON.parse(pm.response.content[0].text);
pm.variables.set('userId', result.id);
```

**Postman-Compatible API**:
- `pm.variables.get()` / `pm.variables.set()`
- `pm.environment.get()` / `pm.environment.set()`
- `pm.test(name, function)` - Create test assertion
- `pm.expect(value)` - Chai-style assertions
- `console.log()` - Debug logging

**Assertion Methods**:
```javascript
pm.expect(value).to.equal(expected)
pm.expect(value).to.contain(substring)
pm.expect(value).to.have.property(key)
pm.expect(value).to.have.length(n)
pm.expect(value).not.to.equal(other)
```

**API Endpoints** (8 total):
- `POST /api/scripts` - Create script
- `GET /api/scripts?type=pre` - List pre-scripts
- `POST /api/scripts/:id/execute` - Test script
- `POST /api/scripts/validate` - Validate syntax

**Security**: Scripts run in sandboxed VM (5-second timeout, no file system access).

---

## Debugging & Inspection

### 18. Workflow Debugger
**What it does**: Step-by-step debugging of workflows with breakpoints.

**How to use**:
1. Open workflow in Workflows tab
2. Click node → **Add Breakpoint**
3. Click **Debug** (instead of Run)
4. Workflow pauses at breakpoint
5. Use controls: **Step**, **Resume**, **Inspect Variables**, **Abort**

**Features**:
- Pause at any node
- Step through one node at a time
- Inspect variables at each step
- View inputs/outputs
- Multiple debug sessions

**API Endpoints** (11 total):
- `POST /api/workflows/debug/start` - Start debug session
- `POST /api/workflows/debug/:session/step` - Step one node
- `POST /api/workflows/debug/:session/resume` - Continue execution
- `GET /api/workflows/debug/:session/state` - Get current state
- `POST /api/workflows/debug/:session/breakpoint` - Add breakpoint

---

### 19. Message Timeline
**What it does**: Chronological log of all JSON-RPC messages between client and MCP servers.

**How to use**:
1. Navigate to **Inspector** → **Timeline** tab
2. View real-time message stream
3. Filter by server, method, or type
4. Click message to view full JSON
5. Export timeline to JSON/CSV

**Features**:
- Request/response pairing
- Latency measurement
- Color coding (request=blue, response=green, error=red)
- Search/filter
- Copy messages as cURL

**API Endpoints**:
- `GET /api/inspector/timeline` - Get timeline
- `POST /api/inspector/timeline/filter` - Filter messages
- `GET /api/inspector/timeline/export` - Export as JSON/CSV

---

### 20. Variable Inspection
**What it does**: View and modify workflow context and variables during execution.

**How to use**:
1. During workflow debug session
2. Click **Inspect Variables**
3. View all context data:
   - Input variables
   - Step outputs
   - Environment variables
   - Intermediate values
4. Modify values for testing

**API Endpoint**: `GET /api/workflows/debug/:session/variables`

---

### 21. Protocol Compliance Checker
**What it does**: Validate JSON-RPC 2.0 message format compliance.

**How to use**:
1. Navigate to **Performance** tab → **Compliance**
2. View automatic compliance checks
3. See violations with explanations

**Checks**:
- JSON-RPC version field
- Request ID presence
- Method name format
- Parameter structure
- Error object format

**API Endpoint**: `POST /api/performance/compliance/check`

---

## Analytics & Monitoring

### 22. Tool Explorer & Analytics
**What it does**: Comprehensive usage statistics and performance metrics for all tools.

**How to use**:
1. Navigate to **Tool Explorer** section (via API or future UI)
2. View dashboards:
   - Usage statistics per tool
   - Performance metrics (latency percentiles)
   - Error rates and recent errors
   - Most-used tools (leaderboard)
   - Health overview

**Metrics Tracked**:
- Total calls
- Success rate
- Error count
- Avg/min/max latency
- p50/p95/p99 latency percentiles
- Recent errors

**API Endpoints** (11 total):
- `GET /api/toolexplorer/stats` - Overall statistics
- `GET /api/toolexplorer/stats/:server/:tool` - Tool-specific stats
- `GET /api/toolexplorer/leaderboard` - Most-used tools
- `GET /api/toolexplorer/health` - System health
- `GET /api/toolexplorer/trends` - Usage trends over time
- `GET /api/toolexplorer/export` - Export stats to JSON/CSV

**Example Response**:
```json
{
  "server": "github",
  "tool": "search_repositories",
  "totalCalls": 1247,
  "successRate": 0.98,
  "avgLatency": 342,
  "p50": 310,
  "p95": 890,
  "p99": 1450,
  "errors": [
    { "message": "Rate limit exceeded", "count": 15, "lastSeen": "2025-12-29T10:30:00Z" }
  ]
}
```

---

### 23. Performance Profiling
**What it does**: Track and analyze latency, throughput, and resource usage.

**Metrics**:
- Request latency (per tool, per server)
- Throughput (requests/second)
- Success/failure rates
- Resource usage trends

**How to use**:
1. Navigate to **Performance** tab
2. View real-time charts
3. Filter by time range
4. Export reports

**API Endpoints**:
- `GET /api/performance/metrics` - Current metrics
- `GET /api/performance/history` - Historical data

---

### 24. Health Dashboard
**What it does**: System-wide health monitoring and alerting.

**Indicators**:
- 🟢 Healthy: <5% error rate, <1s avg latency
- 🟡 Warning: 5-15% error rate or 1-3s latency
- 🔴 Critical: >15% error rate or >3s latency

**How to use**:
1. Check `GET /api/toolexplorer/health`
2. View problematic tools
3. Investigate errors

**API Response**:
```json
{
  "status": "warning",
  "totalServers": 5,
  "healthyTools": 42,
  "warningTools": 3,
  "criticalTools": 1,
  "problematicTools": [
    {
      "server": "github",
      "tool": "create_issue",
      "status": "critical",
      "errorRate": 0.23,
      "avgLatency": 4200
    }
  ]
}
```

---

### 25. Trend Analysis
**What it does**: Analyze usage patterns over configurable time periods.

**Time Ranges**:
- Last hour
- Last 24 hours
- Last 7 days
- Last 30 days
- Custom range

**How to use**:
```bash
GET /api/toolexplorer/trends?period=24h&server=github&tool=search_repositories
```

**Response**:
```json
{
  "period": "24h",
  "dataPoints": [
    { "timestamp": "2025-12-29T00:00:00Z", "calls": 45, "avgLatency": 320 },
    { "timestamp": "2025-12-29T01:00:00Z", "calls": 38, "avgLatency": 310 }
  ],
  "summary": {
    "totalCalls": 1024,
    "peakHour": "14:00",
    "peakCalls": 127
  }
}
```

---

## Automation

### 26. Webhook Notifications
**What it does**: Send test results to external services (Slack, Discord, custom webhooks).

**How to use**:
```json
{
  "monitor": {
    "id": "mon_123",
    "name": "API Tests"
  },
  "notifications": [
    {
      "type": "webhook",
      "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ"
    }
  ]
}
```

**Payload Format**:
```json
{
  "monitor": { "id": "mon_123", "name": "API Tests" },
  "results": {
    "status": "failed",
    "total": 10,
    "passed": 8,
    "failed": 2,
    "duration": 3420
  },
  "timestamp": "2025-12-29T10:30:00Z"
}
```

**Slack Example**:
```json
{
  "text": "❌ Monitor 'API Tests' failed: 2/10 tests failed"
}
```

---

### 27. Scheduled Execution
**What it does**: Auto-run collections on cron-like schedules.

**Schedule Formats**:
- **Simple**: `5m`, `10m`, `1h`, `6h`, `1d`
- **Cron**: `0 */6 * * *` (every 6 hours)
- **Cron**: `0 2 * * *` (daily at 2 AM)
- **Cron**: `0 9 * * 1` (Mondays at 9 AM)

**Use Cases**:
- Nightly integration tests
- Hourly health checks
- Weekly smoke tests
- On-demand regression suites

---

## Documentation

### 28. Auto-Documentation Generator
**What it does**: Generate beautiful documentation from MCP server schemas.

**Supported Formats**:
- **Markdown**: GitHub-ready docs
- **HTML**: Styled, standalone pages
- **JSON**: Machine-readable schema

**How to use**:

**Via API**:
```bash
# Generate Markdown for one server
POST /api/documentation/generate/github?format=markdown&save=true

# Generate HTML for all servers
POST /api/documentation/generate-all?format=html

# Preview in browser
GET /api/documentation/preview/github?format=html
```

**What's Generated**:
- Table of contents
- Tool documentation with:
  - Description
  - Parameter tables (name, type, required, description)
  - Input schema (JSON)
  - Example requests
- Resource documentation
- Prompt documentation
- Timestamp

**HTML Output Features**:
- Beautiful gradient header
- Responsive design
- Syntax-highlighted code blocks
- Color-coded parameter tables
- Anchor links for navigation

**Example Markdown Output**:
```markdown
# github Documentation

*Generated: 12/29/2025, 10:30:00 AM*

---

## Table of Contents

- [Tools](#tools) (5)
- [Resources](#resources) (0)
- [Prompts](#prompts) (0)

---

## Tools

### `search_repositories`

Search for repositories on GitHub.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `sort` | string | No | Sort order |

**Example:**

\`\`\`json
{
  "tool": "search_repositories",
  "arguments": {
    "query": "mcp",
    "sort": "stars"
  }
}
\`\`\`

---
```

**API Endpoints** (3 total):
- `POST /api/documentation/generate/:server` - Generate for one server
- `POST /api/documentation/generate-all` - Generate for all servers
- `GET /api/documentation/preview/:server` - Preview in browser

**Saved Location**: `docs/` directory with filenames like `github.md`, `filesystem.html`

---

## Integration & Export

### 29. Import/Export Collections
**What it does**: Share collections as JSON files for version control and collaboration.

**Export**:
```bash
GET /api/collections/:id/export
```

**Import**:
```bash
POST /api/collections/import
Content-Type: application/json

{
  "name": "Imported Tests",
  "scenarios": [...]
}
```

**Use Cases**:
- Share test suites with team
- Version control in Git
- Backup collections
- Migrate between environments

---

### 30. CI/CD Integration
**What it does**: Integrate MCP tests into CI/CD pipelines.

**GitHub Actions Example**:
```yaml
name: MCP Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install MCP Chat Studio
        run: npm install -g mcp-chat-studio

      - name: Run Tests
        run: mcp-test run ./tests/integration.json --reporters junit,cli

      - name: Publish Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: './junit-results.xml'
```

**GitLab CI Example**:
```yaml
test:
  stage: test
  script:
    - npm install -g mcp-chat-studio
    - mcp-test run ./tests/integration.json --reporters junit
  artifacts:
    reports:
      junit: junit-results.xml
```

---

### 31. Export Statistics
**What it does**: Export analytics data for external analysis.

**Formats**:
- **JSON**: For programmatic access
- **CSV**: For Excel/Google Sheets

**How to use**:
```bash
# Export tool statistics
GET /api/toolexplorer/export?format=csv

# Export timeline
GET /api/inspector/timeline/export?format=json
```

**CSV Example**:
```csv
Server,Tool,Total Calls,Success Rate,Avg Latency,P95 Latency,Errors
github,search_repositories,1247,0.98,342,890,2
filesystem,read_file,892,1.00,45,120,0
```

---

### 32. Workflow Export/Import
**What it does**: Save and share workflows as JSON.

**Export**:
```bash
GET /api/workflows/:id/export
```

Returns:
```json
{
  "name": "GitHub Analysis Pipeline",
  "nodes": [...],
  "edges": [...]
}
```

**Import**:
```bash
POST /api/workflows/import
Content-Type: application/json

{
  "name": "Imported Workflow",
  "nodes": [...],
  "edges": [...]
}
```

---

## Quick Start Guides

### Getting Started: First 5 Minutes

**1. Connect an MCP Server** (2 min):
```yaml
# config.yaml
mcpServers:
  filesystem:
    type: stdio
    command: npx
    args:
      - "@modelcontextprotocol/server-filesystem"
      - "/tmp"
    startup: true
```

**2. Test a Tool** (1 min):
- Go to **Inspector** → **Tools**
- Select `filesystem` → `read_file`
- Enter: `{"path": "/tmp/test.txt"}`
- Click **Call Tool**

**3. Create Your First Workflow** (2 min):
- Go to **Workflows** → **AI Builder**
- Type: "List files in /tmp and count them"
- Click **Generate**
- Click **Run Workflow**

---

### Quick Start: Collections & Testing

**1. Create a Collection** (2 min):
```bash
POST /api/collections
{
  "name": "Quick Tests",
  "scenarios": [
    { "name": "Test 1", "server": "filesystem", "tool": "list_directory", "args": "{\"path\": \"/tmp\"}" }
  ]
}
```

**2. Run from CLI** (1 min):
```bash
mcp-test run ./collections/quick-tests.json --reporters cli
```

**3. Schedule It** (2 min):
```bash
POST /api/monitors
{
  "name": "Hourly Check",
  "collectionId": "col_123",
  "schedule": "1h",
  "enabled": true
}
```

---

### Quick Start: Mock Testing

**1. Create Mock** (2 min):
```bash
POST /api/mocks
{
  "name": "Mock API",
  "tools": [{
    "name": "get_user",
    "response": { "id": 123, "name": "Test User" }
  }]
}
```

**2. Use Mock** (1 min):
```bash
POST /api/mocks/mock_123/tools/get_user/call
{}
```

---

## Feature Matrix

| Feature | Version | API Endpoints | CLI Support | Web UI |
|---------|---------|---------------|-------------|--------|
| Chat Interface | 1.0 | 1 | ❌ | ✅ |
| Tool Inspector | 1.0 | 1 | ❌ | ✅ |
| MCP Management | 1.0 | 5 | ❌ | ✅ |
| OAuth | 1.0 | 3 | ❌ | ✅ |
| Scaffolding | 1.2 | 1 | ❌ | ✅ |
| Performance | 1.2 | 3 | ❌ | ✅ |
| Test History | 1.2 | 1 | ❌ | ✅ |
| Debugger | 1.3 | 11 | ❌ | ✅ |
| Inspector Advanced | 1.3 | 12 | ❌ | ✅ |
| Contracts | 1.3 | 7 | ❌ | ❌ |
| Tool Explorer | 1.3 | 11 | ❌ | ❌ |
| Collections | 1.4 | 12 | ✅ | ❌ |
| CLI Runner | 1.4 | - | ✅ | ❌ |
| Monitors | 1.4 | 9 | ❌ | ❌ |
| Mocks | 1.5 | 14 | ❌ | ❌ |
| Scripts | 1.5 | 8 | ❌ | ❌ |
| Documentation | 1.5 | 3 | ❌ | ❌ |
| Workflows | 1.3 | 8 | ❌ | ✅ |
| AI Builder | 1.3 | - | ❌ | ✅ |

**Total**: 87+ API endpoints, 82 features

---

## Comparison: MCP Chat Studio vs Postman

| Feature | Postman | MCP Chat Studio |
|---------|---------|-----------------|
| **Collections** | ✅ | ✅ |
| **Environments** | ✅ | ✅ |
| **CLI Runner** | ✅ (newman) | ✅ (mcp-test) |
| **Monitors** | ✅ | ✅ |
| **Mock Servers** | ✅ | ✅ |
| **Pre/Post Scripts** | ✅ | ✅ |
| **Documentation Generator** | ✅ | ✅ |
| **Contract Testing** | ❌ | ✅ |
| **Visual Workflows** | ❌ | ✅ |
| **AI Workflow Builder** | ❌ | ✅ |
| **Workflow Debugger** | ❌ | ✅ |
| **Real-time Analytics** | ❌ | ✅ |
| **Server Scaffolding** | ❌ | ✅ |
| **Multi-LLM Support** | ❌ | ✅ (8 providers) |

---

## Support & Resources

- **API Documentation**: http://localhost:3082/api-docs
- **GitHub**: https://github.com/JoeCastrom/mcp-chat-studio
- **Issues**: https://github.com/JoeCastrom/mcp-chat-studio/issues
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md)

---

**Built with ❤️ for the MCP Community**

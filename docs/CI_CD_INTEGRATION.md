# CI/CD Integration Guide

This guide shows how to integrate MCP Chat Studio into your CI/CD pipeline for automated testing of MCP servers.

## GitHub Actions

### Basic Setup

1. Copy `.github/workflows/mcp-server-test.yml` to your MCP server repository
2. Customize the test steps for your server
3. Push to trigger the workflow

### Custom Testing Example

```yaml
name: MCP Server CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test with MCP Chat Studio
        run: |
          # Install MCP Chat Studio CLI
          npx mcp-chat-studio test scenarios.json --fail-on-diff
```

## GitLab CI

### Basic Setup

1. Copy `.gitlab-ci.yml.template` to `.gitlab-ci.yml` in your repository
2. Customize for your server
3. Push to trigger pipeline

### Example with Custom Scenarios

```yaml
test-scenarios:
  stage: test
  script:
    - npm install -g @modelcontextprotocol/cli
    - npx mcp-chat-studio test test-scenarios.json
  artifacts:
    reports:
      junit: test-results.xml
```

## Docker-based Testing

### Using Docker Compose

```yaml
version: '3.8'

services:
  mcp-chat-studio:
    image: ghcr.io/joecastrom/mcp-chat-studio:latest
    ports:
      - "3082:3082"
    volumes:
      - ./config.yaml:/app/config.yaml

  your-mcp-server:
    build: .
    depends_on:
      - mcp-chat-studio
```

## Pre-commit Hooks

### Install Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Run scenario tests before commit
npx mcp-chat-studio test scenarios.json

if [ $? -ne 0 ]; then
  echo "❌ MCP tests failed! Fix errors before committing."
  exit 1
fi

echo "✅ MCP tests passed!"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Azure Pipelines

### azure-pipelines.yml

```yaml
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm test
    displayName: 'Run unit tests'

  - script: |
      git clone https://github.com/JoeCastrom/mcp-chat-studio.git
      cd mcp-chat-studio
      npm ci
      npm start &
      sleep 10
    displayName: 'Start MCP Chat Studio'

  - script: |
      curl -X POST http://localhost:3082/api/mcp/add \
        -H "Content-Type: application/json" \
        -d '{"name": "test", "config": {"type": "stdio", "command": "node", "args": ["dist/index.js"]}}'
    displayName: 'Test MCP server'
```

## Test Scenarios Format

### Example scenarios.json

```json
[
  {
    "name": "Test tool execution",
    "steps": [
      {
        "server": "my-server",
        "tool": "my-tool",
        "args": {"param": "value"},
        "expectedResponse": {
          "content": [
            {
              "type": "text",
              "text": "Expected result"
            }
          ]
        }
      }
    ]
  }
]
```

## Best Practices

### 1. Separate Test Environments

```yaml
# Different configs for different environments
dev:
  mcpServers:
    my-server:
      command: npm
      args: ["run", "dev"]

production:
  mcpServers:
    my-server:
      command: node
      args: ["dist/index.js"]
```

### 2. Matrix Testing

Test against multiple Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### 3. Cache Dependencies

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 4. Fail Fast

```yaml
# Stop on first failure
fail-fast: true
```

## Notifications

### Slack Notifications

```yaml
- name: Notify Slack
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'MCP Server tests failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Discord Notifications

```yaml
- name: Discord notification
  uses: Ilshidur/action-discord@master
  with:
    args: 'MCP Server CI completed: ${{ job.status }}'
  env:
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
```

## Performance Testing in CI

```yaml
- name: Run performance tests
  run: |
    curl -X POST http://localhost:3082/api/performance/load \
      -H "Content-Type: application/json" \
      -d '{
        "serverName": "test-server",
        "toolName": "test-tool",
        "concurrency": 10,
        "duration": 5000
      }' > perf-results.json

    # Check if average latency is acceptable
    AVG_LATENCY=$(jq '.summary.avgLatency' perf-results.json)
    if (( $(echo "$AVG_LATENCY > 1000" | bc -l) )); then
      echo "❌ Performance degradation detected!"
      exit 1
    fi
```

## Debugging CI Failures

### Enable Debug Logging

```yaml
env:
  DEBUG: 'mcp:*'
  LOG_LEVEL: debug
```

### Save Artifacts

```yaml
- uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: debug-logs
    path: |
      logs/
      *.log
```

## Integration with MCP Chat Studio API

### Full API Testing Example

```bash
#!/bin/bash
set -e

# Add server
curl -X POST http://localhost:3082/api/mcp/add \
  -H "Content-Type: application/json" \
  -d @server-config.json

# Connect
curl -X POST http://localhost:3082/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"serverName": "test-server"}'

# List tools
TOOLS=$(curl http://localhost:3082/api/mcp/tools)
echo "Available tools: $TOOLS"

# Call tool
curl -X POST http://localhost:3082/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "serverName": "test-server",
    "toolName": "my-tool",
    "args": {"test": true}
  }'

# Check compliance
curl -X POST http://localhost:3082/api/mcp/compliance/check \
  -H "Content-Type: application/json" \
  -d '{"serverName": "test-server"}'
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [MCP Chat Studio API Documentation](http://localhost:3082/api-docs)

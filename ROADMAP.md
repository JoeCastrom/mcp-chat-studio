# MCP Chat Studio Roadmap

Goal: become the best-in-class MCP testing platform (Postman-level parity plus MCP-native superpowers).

## Current strengths (v2)
- Classic + Workspace layouts with panels, command palette, sessions, and export/import
- Inspector with tool execution, protocol log, bulk test, diff, timeline
- Scenarios, Collections, Run Reports
- Contracts + breaking-change checks
- Mocks + mock server connect
- Workflow builder + AI Builder + debugger
- Analytics, performance, monitors
- Docs generator
- CLI (collections + schema diff)

## Competitive parity checklist (Postman-level)
Status legend: [x] shipped, [~] partial, [ ] missing

- [~] Team workspaces + shared collections
- [ ] Cloud sync (hosted or self-hosted)
- [ ] Role-based access control (org, project, read-only)
- [~] Environments and variables (global/env/request) with secure vault
- [ ] OAuth session management per server/env + token refresh UI
- [~] Runner at scale (data files, retries, parallelism, fail-fast)
- [~] Monitors / scheduled runs with historical trends
- [ ] Visual variable inspector + substitution preview
- [ ] Rich artifacts (attachments, screenshots, binary responses)
- [~] Mocking (needs record/replay + proxy capture)
- [ ] Collaboration features (comments, change history, approvals)
- [ ] Import/export compatibility (versioned bundles)

## Roadmap by phase

### Phase 1: Rock-Solid Local + CI (0-2 months)
Single-user excellence: one engineer, one workspace, zero friction.
- Environment vault: encrypted secrets, scoped variables, substitution preview
- Runner upgrades: data-driven iterations (CSV/JSON), retries, parallelism controls
- Reports: run history, trend charts, failure diffs, export to JUnit/HTML
- Deterministic runs: record → replay with stable inputs and outputs
- Mock recording: capture real tool calls and auto-create mocks
- Workspace bundles: export/import full project (env + collections + contracts)
- Polished errors: actionable validation for tool args and LLM nodes
- CI-first runner: headless mode, exit codes, artifacts, flake analysis

### Phase 2: Collaboration + Cloud (2-5 months)
- Team workspaces with sharing and permissions
- Sync service (hosted) + self-hosted option
- Portable bundles as the base unit of sync (no lock-in)
- Version history and audit trail for collections/contracts/workflows
- Commenting and review flows for contract changes
- OAuth/session management UI per server and environment

### Phase 3: Enterprise-Grade (5-9 months)
- Governance: schema regression gates, CI templates, release badges
- Policy checks: disallow risky tools per environment
- SSO integrations (OIDC, SAML gateway)
- SLA dashboards, reliability scores, flake tracking
- Agent testing harness (repeatable tool runs + dataset benchmarks)
  - Deterministic datasets + replay to benchmark agents

### Phase 4: Beyond Postman (9-12 months)
- MCP-native graph testing: tool dependency graphs + impact analysis
- AI-assisted test generation (from tool schemas + history)
- "Live studio" replay: reproduce failures with one click
- Local-first + offline bundle replay
- Plugin system for custom panels and exporters

## What makes us surpass Postman
- MCP-native workflows, contracts, and tool schemas
- Workspace canvas for multi-panel orchestration
- Built-in AI for workflow and test generation
- Real-time protocol visibility (timeline + diff)
- Mock-from-history with deterministic replay

## Success metrics
- Time to first tool call under 3 minutes
- 90% of failures show a clear action to fix
- Runner can execute 1,000+ tool calls per run without UI lag
- Teams can share a workspace bundle in under 30 seconds

## Open questions
- Hosted cloud vs self-hosted first?
- Free vs paid tiers (team features, history retention)
- Monetization anchor: governance, history retention, and team controls
- Plugin ecosystem design (JS sandbox or WASM?)

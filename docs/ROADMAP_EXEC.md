# MCP Chat Studio Roadmap (Executive Summary)

## Vision
Build the best-in-class MCP testing platform: Postman-level parity plus MCP-native superpowers.

## Positioning
- **Parity**: collections, environments, monitors, reports, mocks, contracts, CI
- **Beyond**: workflow canvas, protocol timeline + diff, AI-assisted test generation

## Phases

### Phase 1: Rock-Solid Local + CI (0-2 months)
Single-user excellence and dependable CI results.
- Encrypted env vault + variable scopes
- Data-driven runner (CSV/JSON), retries, parallelism controls
- Run reports with trends + JUnit/HTML export
- Deterministic record/replay and mock-from-history
- Workspace bundles (env + collections + contracts)
- Clear, actionable errors for tool args + LLM nodes
- Headless CI runner with exit codes + artifacts

### Phase 2: Collaboration + Cloud (2-5 months)
- Team workspaces, sharing, and permissions
- Sync service (hosted + self-hosted)
- Version history and review workflows
- OAuth/session management per server and environment

### Phase 3: Enterprise-Grade (5-9 months)
- Governance gates, policy checks, and SSO
- Reliability dashboards and flake tracking
- Agent testing harness with deterministic datasets

### Phase 4: Beyond Postman (9-12 months)
- MCP dependency graphs + impact analysis
- AI-generated tests from tool schemas + history
- Live replay for failure reproduction
- Plugin system for panels and exporters

## Success Metrics
- Time to first tool call under 3 minutes
- 90% of failures show a clear fix action
- 1,000+ tool calls per run without UI lag
- Share a workspace bundle in under 30 seconds

## What We Ship Next
Phase 1 milestone plan is in `docs/PHASE1_MILESTONES.md`.

# Phase 1 Milestones (Rock-Solid Local + CI)

Goal: single-user excellence and repeatable CI runs.

## M1: Env Vault + Variables (2 weeks)
- Encrypted secrets store (per user, per env)
- Variable scopes: global, env, collection, step
- Substitution preview + unresolved variable warnings
- UI inspector for current variable values

**Exit criteria**
- Variable substitution works across Inspector, Scenarios, Collections, Workflows
- No secrets are written to logs or exports

## M2: Runner Upgrades (2-3 weeks)
- Iteration data (CSV/JSON)
- Retry + backoff per step
- Fail-fast and continue-on-error modes
- Parallel execution limit

**Exit criteria**
- Collections run 1,000+ tool calls without UI lag
- Report shows per-iteration stats and failures

## M3: Reports + CI Artifacts (2 weeks)
- HTML + JUnit export
- Trend charts (pass rate, latency)
- Run history with filters

**Exit criteria**
- CI runner returns exit codes and saves artifacts

## M4: Deterministic Replay + Mocks (2 weeks)
- Record tool calls and create mocks automatically
- Replay using locked inputs/outputs
- Hash-based run IDs for reproducibility

**Exit criteria**
- Same inputs yield same outputs in replay mode

## M5: Workspace Bundles (1-2 weeks)
- Export/import full project bundle (env + collections + contracts + mocks)
- Versioned bundle format

**Exit criteria**
- Import recreates a workspace reliably on a fresh clone

## M6: Error Clarity + UX Polish (1 week)
- Tool args validation surfaced in UI
- LLM node prompt validation + previews
- Actionable error hints

**Exit criteria**
- 90% of failures include a suggested fix

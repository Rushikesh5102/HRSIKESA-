# Dynamic Capability Ecosystem

## 1. Overview
The Capability Ecosystem unifies internal tools (Phases 0–20), dynamically discovered MCP integrations (Phase 21), and specialized agent skills into a single vendor-neutral registry and resolution engine.

## 2. Provider Hierarchy & Resolution Strategy
`AgentCapabilityRouter` resolves capabilities using a deterministic preference hierarchy:
1. **Native Tools (`priority = 100`):** Fast, in-process TypeScript tools (filesystem, terminal, Ollama, system).
2. **Local MCP Servers (`priority = 80`):** Secure, local subprocess MCP tools via stdio or in-memory transport.
3. **Remote MCP Servers (`priority = 50`):** Remote HTTP/SSE MCP servers (governed and authenticated).

## 3. Explainable Resolution Rationale
Every capability query returns an explainable descriptor:
- `available`: Boolean status.
- `source`: `'native' | 'mcp' | 'skill' | 'none'`.
- `provider`: Human-readable origin label.
- `reason`: Machine- and human-readable explanation of why this provider was chosen.
- `capabilities`: Exact permission and capability strings satisfied.

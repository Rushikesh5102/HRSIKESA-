# HṚṢĪKEŚA (हृषीकेश) — PHASE 21: DYNAMIC MCP & CAPABILITY ECOSYSTEM

## 1. Executive Overview
Phase 21 delivers an industrial-grade, secure, dynamic capability ecosystem enabling HṚṢĪKEŚA to discover, statically inspect, validate, authorize, register, sandbox, execute, observe, audit, update, and revoke Model Context Protocol (MCP) servers and external capability providers without modifying core runtime binaries.

---

## 2. Core Architectural Principles
1. **MCP Is an Integration Protocol, Not a Trust Boundary:**
   External MCP servers are treated as untrusted third-party binaries until statically scanned, danger-classified, human-authorized (by ROOT_RUSHIKESH), and runtime-governed.
2. **Strict ToolExecutionBus Mediation:**
   Adapted MCP tools execute strictly through `ToolExecutionBus`, `PermissionManager`, `ToolAuditManager`, and `ResourceGovernor`. No direct unmediated socket or stdio execution is permitted.
3. **Deterministic Human-In-The-Loop Approval:**
   Any newly discovered server, capability addition, schema mutation, or permission escalation shifts the server to `PENDING_APPROVAL`, halting autonomous execution until explicit operator authorization.
4. **Resilience & Fault Isolation:**
   Process crashes are bounded (max 3 restarts). High memory pressure triggers automatic child process throttling. Invocations are enforced with a strict 30s default timeout and 1MB output truncation ceiling.
5. **Zero Plaintext Secret Persistence:**
   Environment tokens, credentials, and API keys are dynamically injected at runtime and never persisted in SQLite catalogs, logs, or knowledge graph entities.

---

## 3. Subsystem Implementation Matrix

| Subsystem / Service | Location | Responsibilities |
|---|---|---|
| **Schema Migration 012** | `src/persistence/migrations/012_mcp_capability_ecosystem_schema.ts` | Tables for servers, versions, tools, resources, prompts, capability bindings, reviews, and execution telemetry. |
| **MCP Domain Types** | `src/mcp/interfaces/mcp.types.ts` | Type definitions for transports, server statuses, trust levels, danger tiers, JSON-RPC 2.0 payloads. |
| **Persistence Repositories** | `src/mcp/repositories/*.ts` | SQLite repositories for servers, tools, resources, prompts, and security reviews. |
| **MCPSecurityValidator** | `src/mcp/services/mcp-security-validator.service.ts` | Static inspection, command regex matching, secret scanning, prompt injection defanging, danger tier classification. |
| **MCPTransportFactory** | `src/mcp/services/mcp-transport.factory.ts` | `InMemoryMcpTransport`, `StdioMcpTransport`, `HttpMcpTransport` with JSON-RPC 2.0 framing. |
| **MCPClientService** | `src/mcp/services/mcp-client.service.ts` | JSON-RPC handshake, `tools/list`, `resources/list`, `prompts/list`, `tools/call`, 1MB output bounding. |
| **MCPProcessManager** | `src/mcp/services/mcp-process-manager.service.ts` | Child process lifecycle, PID tracking, graceful shutdown, crash recovery, memory pressure throttling. |
| **MCPServerRegistry** | `src/mcp/services/mcp-server-registry.service.ts` | Lifecycle transitions (`approve`, `authorize`, `disable`, `revoke`, `remove`), Knowledge Graph synchronization. |
| **MCPCapabilityAdapter** | `src/mcp/services/mcp-capability-adapter.service.ts` | Bi-directional adapter converting MCP tools into `ITool` and `ICapabilityAdapter`. |
| **MCPCapabilityDiscovery** | `src/mcp/services/mcp-capability-discovery.service.ts` | Live introspection, catalog persistence, preview document generation. |
| **MCPRefreshService** | `src/mcp/services/mcp-refresh.service.ts` | Schema drift detection, tool addition detection, permission escalation defense. |
| **AgentCapabilityRouter** | `src/capabilities/routing/agent.capability.router.ts` | Provider-aware ranking (Native > Local MCP > Remote MCP) and explainable resolution. |
| **HTTP REST Endpoints** | `src/api/http.server.ts` | 14 REST endpoints under `/mcp/*` for full server, tool, and capability lifecycle control. |
| **MCP Control Center UI** | `ui/src/views/MCPView.tsx` | Full-featured React/Tailwind frontend tab with stats, server cards, inspector modal, and test runner. |

---

## 4. Verification & Quality Gates
- **Unit & Integration Suite (`tests/phase21-mcp.test.ts`):** 35/35 test cases PASS (100%).
- **Live Verifier Script (`scripts/live-phase21-verifier.ts`):** 35/35 live execution scenarios PASS (100%).
- **Full Project Regression (`npm test`):** 506/506 test cases PASS across all 77 suites (100%).
- **TypeScript Static Verification (`npx tsc --noEmit`):** 0 errors.
- **Frontend UI Production Build (`npm --prefix ui run build`):** Clean build in 7.53s.

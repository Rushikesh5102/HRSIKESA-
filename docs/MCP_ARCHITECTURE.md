# MCP Architecture in HṚṢĪKEŚA

## 1. Architectural Layers

The Model Context Protocol (MCP) subsystem in HṚṢĪKEŚA connects external tool/resource/prompt providers to the 17-agent workforce through a strictly governed pipeline:

```
[External MCP Server (stdio / http / in-memory)]
                       ▲
                       │ JSON-RPC 2.0 (stdio/HTTP)
                       ▼
           [MCPTransportFactory]
                       │
             [MCPClientService]
                       │
            [MCPProcessManager]  ◀─── [ResourceGovernor] (Memory Throttling)
                       │
          [MCPCapabilityAdapter]
                       │
       ┌───────────────┴──────────────┐
       ▼                              ▼
 [ToolRegistry]              [CapabilityRegistry]
       │                              │
[ToolExecutionBus]           [AgentCapabilityRouter]
 (Permissions, Auditing,      (Provider-aware ranking:
  Sandboxing, Redaction)      Native > Local MCP > Remote MCP)
```

## 2. Transports Supported
- **`in-memory`**: High-performance internal testing and mock servers with zero IPC overhead.
- **`stdio`**: Local subprocess spawning (`child_process.spawn`) with stdin/stdout JSON-RPC framing, PID management, and automatic kill signal cascade.
- **`http`**: Remote endpoints using HTTP POST JSON-RPC 2.0 and Server-Sent Events (SSE), requiring HTTPS for remote hosts.

## 3. Storage & Persistence (Migration 012)
- `mcp_servers`: Master server directory, transport settings, authorization and health states.
- `mcp_server_versions`: Immutable audit snapshots of server configurations upon mutation.
- `mcp_tools`: Extracted tools, JSON schema definitions, danger tier mappings, and usage stats.
- `mcp_resources`: External resource endpoints and MIME metadata.
- `mcp_prompts`: External prompt templates and parameter declarations.
- `mcp_capability_bindings`: Dynamic routing associations between agents and MCP capabilities.
- `mcp_security_reviews`: Static analysis logs, risk scores, and review findings.
- `mcp_execution_stats`: High-frequency latency, error rates, and invocation telemetry.

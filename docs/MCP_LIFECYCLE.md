# MCP Server Lifecycle State Machine

## 1. Lifecycle States

An MCP server moves through well-defined lifecycle states:

```
[DISCOVERED] ──(Static Scan)──► [PENDING_APPROVAL] ──(Operator Approve)──► [AUTHORIZED]
                                                                                │
                                                                           (Start/Active)
                                                                                ▼
[REVOKED] ◄──(Security Alert/Revoke)── [DEGRADED] ◄──(Crashes)── [RUNNING / HEALTHY]
    ▲                                                                           │
    │                                                                           ▼
[REMOVED] ◄─────────────────────── (Soft Delete) ───────────────────────── [DISABLED]
```

## 2. State Transition Triggers
- **DISCOVERED:** Server configuration registered; awaiting security validation.
- **PENDING_APPROVAL:** Inspected by `MCPSecurityValidator`. Requires explicit human operator approval.
- **AUTHORIZED:** Approved by operator (`ROOT_RUSHIKESH`). Capabilities registered into `CapabilityRegistry` and `ToolRegistry`.
- **HEALTHY / RUNNING:** Process spawned, JSON-RPC connection active, tools ready for execution.
- **DEGRADED:** Process failed health checks or crashed (restarting under bounded retry policy).
- **DISABLED:** Temporarily suspended by operator. Process terminated; tools removed from active dispatch.
- **REVOKED:** Permanently invalidated due to security policy or explicit operator revocation. Immediate disconnection.
- **REMOVED:** Soft-deleted from active UI listings while preserving all historical audit, execution, and security review data.

## 3. Drift & Reauthorization
When `MCPRefreshService` detects:
1. Tool additions or schema modifications.
2. Escalation of permissions or danger tiers.
The server is automatically demoted back to `PENDING_APPROVAL`, pausing new tool invocations until re-authorized by ROOT_RUSHIKESH.

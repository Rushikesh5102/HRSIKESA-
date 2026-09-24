# Capability Ecosystem Security & Governance

## 1. Governance Principles
1. **No Ambient Authority:** Agents cannot invoke tools directly without presenting a valid `ToolExecutionContext` containing `requestId`, `sessionId`, `agentId`, and `userId`.
2. **Danger Tier Isolation:**
   - **Tier 0:** Read-only operations, no approval required.
   - **Tier 1:** Harmless mutations, logged in audit ledger.
   - **Tier 2:** State mutations within workspace.
   - **Tier 3:** External effects / network calls; requires HITL authorization.
   - **Tier 4:** System-level modifications / destructive file changes; requires explicit confirmation.
3. **Redaction Guarantee:**
   All execution records captured in `mcp_execution_stats` and `tool_audits` redact credentials, private tokens, and passwords matching strict entropy and key patterns.
4. **Knowledge Graph Synchronization:**
   Authorized capability servers and their operational status are automatically indexed as `TOOL` or `SYSTEM_CAPABILITY` entities in the Phase 19 Knowledge Graph, establishing unified semantic relationships across the workspace.

# MCP Security & Sandboxing Specification

## 1. Zero Trust Model
MCP servers are untrusted external integrations. No MCP tool is ever permitted to bypass the central security controls established in Phases 0–20:
- **`PermissionManager`**: Enforces DangerTier requirements (Tier 0 to Tier 4).
- **`ToolExecutionBus`**: Validates input schemas, enforces execution context, captures telemetry.
- **`ToolAuditManager`**: Records all calls with automatic credential/secret redaction.
- **`ResourceGovernor`**: Monitors system resources and halts spawns under CRITICAL_MEMORY pressure.

## 2. Static Security Inspection
Before any MCP server is registered or authorized, `MCPSecurityValidator` performs automated static analysis:
1. **Dangerous Command Patterns:**
   Scans command strings and arguments for destructive binary invocations (`rm -rf`, `format`, `dd`, `mkfs`, `Invoke-Expression`, `powershell -enc`, `nc -e`, `curl ... | bash`).
2. **Plaintext Secret Scanning:**
   Scans environment variable metadata for exposed API keys, private keys, bearer tokens, or password strings.
3. **Transport Security:**
   Rejects insecure HTTP remote endpoints (requires HTTPS for non-localhost endpoints).
4. **Prompt Injection Defanging:**
   Sanitizes external prompt templates, removing system override sequences (`[SYSTEM OVERRIDE]`, `IGNORE PREVIOUS INSTRUCTIONS`).
5. **Danger Tier Classification:**
   Automatically maps tool naming conventions (`read_*` -> Tier 0, `write_*` -> Tier 2, `delete_*` / `exec_*` -> Tier 3/4) and flags destructive actions.

## 3. Runtime Sandboxing & Safeguards
- **1MB Output Ceiling:** Prevents memory exhaustion attacks by cleanly truncating responses that exceed 1MB.
- **30s Execution Deadline:** Invocations exceeding the deadline are aborted immediately.
- **Fault-Bounded Restarts:** Servers that crash are restricted to 3 restart attempts before permanently degrading.
- **Cold Restart Persistence:** Registrations, reviews, and version snapshots survive full kernel restart without state loss.

# HṚṢĪKEŚA (हृषीकेश) — Self-Maintenance & Bounded Self-Repair

## 1. Automated System Hygiene

The `SelfMaintenanceService` executes scheduled and on-demand maintenance routines to keep the sovereign runtime optimal and prevent resource leaks.

### Supported Maintenance Routines:
1. **`CLEANUP_TEMP_FILES`**: Safely removes orphaned `.tmp`, scratch scripts, and stale scratchpads.
2. **`CLEANUP_STALE_SESSIONS`**: Closes inactive background sessions and frees connection handles.
3. **`RECONNECT_MCP`**: Inspects all active Model Context Protocol (MCP) server transports and re-establishes broken stdio/SSE pipes.
4. **`REBUILD_CACHE`**: Invalidates stale lookup tables and rebuilds memory caches.
5. **`REBUILD_EMBEDDINGS`**: Re-indexes vector embeddings in semantic memory.
6. **`CHECK_DEPENDENCY_DRIFT`**: Runs package dependency analysis against registry versions.
7. **`CHECK_DATABASE_INTEGRITY`**: Runs `PRAGMA integrity_check` on SQLite database files.
8. **`VALIDATE_SKILL_VERSIONS`**: Verifies that active skills match canonical checksums.

---

## 2. Bounded Self-Repair

The `SelfRepairService` provides bounded auto-recovery for transient failures while strictly preventing infinite retry loops.

### Retry Budget & Safety Guardrail:
- **Maximum Attempt Budget**: **3 attempts per target subsystem**.
- If a component fails 3 times consecutively, automated repair is immediately aborted and an escalation alert is emitted to the operator.
- All repair actions are recorded as `ISelfObservation` entries with full attribution.

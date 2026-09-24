# Enterprise Environment Lifecycle Management

## Overview
Every target environment in HṚṢĪKEŚA transitions through a strictly governed 13-stage lifecycle state machine.

---

## Lifecycle Stages
1. **DISCOVER**:
   - Environment is detected via local scan, configuration, or explicit registration.
   - Status initialized to `DISCOVERED`.
2. **IDENTIFY**:
   - Environment Fingerprint collected (`os`, `platform`, `arch`, `hostname`, `availableShells`, `installedSoftwareSummary`).
   - Default capabilities discovered and registered.
3. **AUTHENTICATE**:
   - Credential pointer validated. If MFA/PIN is required, transition to `NEEDS_USER` state.
4. **VALIDATE**:
   - Host key fingerprint validated against known hosts; network reachability verified.
5. **AUTHORIZE**:
   - Explicit human confirmation sets `isAuthorized = true` and assigns trust level (`USER_APPROVED` or `TRUSTED`).
   - Status transitions to `AUTHORIZED`.
6. **CONNECT**:
   - Adapter establishes active connection. Session created in `environment_sessions` table and pooled.
   - Status transitions to `CONNECTED` (or `READY`).
7. **OBSERVE**:
   - Initial telemetry and active process baseline gathered.
8. **OPERATE**:
   - Remote execution of danger-tiered tasks through `ToolExecutionBus`.
9. **VERIFY**:
   - Proof-of-execution verified via exit code and output pattern assertions.
10. **MONITOR**:
    - Periodic lightweight health telemetry checks (`HEALTHY`, `DEGRADED`, `UNAVAILABLE`).
11. **RECOVER**:
    - Idempotent operations retried with bounded backoff in the event of transient disconnections.
12. **DISCONNECT**:
    - Graceful session shutdown; connection pool released.
    - Status transitions to `DISCONNECTED`.
13. **AUDIT**:
    - Complete execution log recorded in `environment_operations`.

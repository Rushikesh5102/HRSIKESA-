# Enterprise Environment Execution Fabric — Architecture

## Overview
HṚṢĪKEŚA Phase 23 provides a secure, modular execution fabric designed to manage, monitor, and operate in external environments across modern enterprise infrastructures.

---

## Core Architectural Components

### 1. Database Persistence Layer (`014_external_environments_schema.ts`)
- `environments`: Registry of targets with type, platform, address, authorization status, trust level, scope, and fingerprint.
- `environment_capabilities`: Per-environment registered capabilities (e.g. `terminal.execute`, `filesystem.read`, `cloud.discovery`).
- `environment_sessions`: Active and historical connection sessions tracking connection duration and agent identity.
- `environment_credentials_metadata`: Safe credential metadata pointers referencing external secret stores.
- `environment_health`: Periodic latency, CPU, memory, disk, and session health records.
- `environment_operations`: Cryptographically verifiable operations audit ledger.

### 2. Registry Coordinator (`EnvironmentRegistry`)
- Manages target registration, authorization state transitions, and connection pooling.
- Discovers and validates adapter capabilities.
- Enforces session pooling limits and coordinates graceful teardown.

### 3. Adapters (`IEnvironmentAdapter`)
- Pure TypeScript, protocol-specific adapters:
  - `SshEnvironmentAdapter`
  - `WindowsRemoteAdapter`
  - `LinuxEnvironmentAdapter`
  - `RdpVdiEnvironmentAdapter`
  - `CloudEnvironmentAdapter`
  - `ContainerEnvironmentAdapter`
  - `CiEnvironmentAdapter`
  - `RemoteBrowserEnvironmentAdapter`

### 4. Recovery & Idempotency Engine (`EnvironmentRecoveryEngine`)
- Analyzes commands for idempotency before allowing automated retry.
- Bounded exponential backoff for transient network issues.
- Never retries destructive or mutating actions automatically.

### 5. Multi-Scope Isolation
- Targets are segregated across scopes:
  - `GLOBAL`: Shared enterprise targets.
  - `COMPANY`: Organization-scoped infrastructure.
  - `PROJECT`: Dedicated project sandbox.
  - `USER`: User-specific desktop or development environment.
  - `AGENT`: Dedicated subagent execution target.
  - `APPLICATION`: Application-specific container or runtime.

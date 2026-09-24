# HṚṢĪKEŚA — Next Implementation Backlog

## P0 — Immediate

### INT-001 Profile current end-to-end chat latency
Owner: GāṇḍĪVA + Vighna
Dependencies: current runtime
Acceptance: latency breakdown for 10 benchmark prompts with blocking call graph.

### INT-002 Introduce fast chat gate
Owner: GāṇḍĪVA
Dependencies: INT-001
Acceptance: trivial chat avoids mission/goal orchestration.

### INT-003 Stream model output
Owner: GāṇḍĪVA
Dependencies: INT-002
Acceptance: first-token telemetry and visible streaming.

### INT-004 Detach background work from chat session
Owner: GāṇḍĪVA + KĀLA
Dependencies: INT-002
Acceptance: user can continue chatting while task executes.

### INT-005 Make memory/knowledge enrichment non-blocking where safe
Owner: Rahu + Vighna
Dependencies: INT-004
Acceptance: no critical path regression and no data-loss race.

### INT-006 Add global latency telemetry
Owner: Garuḍa
Dependencies: INT-001
Acceptance: dashboard and audit-safe latency metrics.

### INT-007 Build instant-response verifier
Owner: Vighna
Dependencies: INT-001 through INT-006
Acceptance: regression suite covers simple, medium, complex, tool, research and voice flows.

## P1 — Remote Execution

### REM-001 Durable job model
### REM-002 Worker registry
### REM-003 Local worker adapter
### REM-004 Remote worker adapter
### REM-005 Secure gateway
### REM-006 Worker heartbeat/leases
### REM-007 Checkpoint/resume
### REM-008 Artifact synchronization
### REM-009 Worker placement policy
### REM-010 Laptop-off recovery test

## P1 — Demonstration Learning

### DEM-001 Demonstration session
### DEM-002 Action recorder
### DEM-003 UI/browser state capture
### DEM-004 Workflow normalization
### DEM-005 Parameter extraction
### DEM-006 Skill draft generation
### DEM-007 Replay sandbox
### DEM-008 Vighna verification
### DEM-009 Approval and version publish

## P1 — Connectors

### CON-001 Connector SDK contract
### CON-002 OAuth/token abstraction
### CON-003 Google Workspace reference connector
### CON-004 GitHub reference connector
### CON-005 Microsoft reference connector
### CON-006 Connector health/revocation
### CON-007 Capability marketplace/catalog view

## P2 — Model Intelligence

### MOD-001 Capability benchmark schema
### MOD-002 Computer-use score
### MOD-003 Coding score
### MOD-004 Research/web-grounding score
### MOD-005 Provider health history
### MOD-006 Model warmness tracking
### MOD-007 Policy simulator

## P2 — Device Mesh

### DEV-001 Device identity
### DEV-002 Device registry
### DEV-003 Capability inventory
### DEV-004 Secure command channel
### DEV-005 Android client foundation
### DEV-006 Notifications/task handoff

## P2 — Distributed Reliability

### REL-001 Durable events
### REL-002 Tracing
### REL-003 Dead-letter handling
### REL-004 Reconciliation
### REL-005 Backup/restore
### REL-006 Recovery drills
### REL-007 Deployment verification

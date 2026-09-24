# HṚṢĪKEŚA — Next Implementation Program

Status: PLANNING STARTED
Previous completed milestone: Phase 26 — Safe Self-Improvement / Self-Maintenance
This document intentionally does not rename the next work as a numbered phase yet.

## 1. North Star

Evolve HṚṢĪKEŚA from a powerful local autonomous-agent OS into a distributed personal AI operating system that:

1. responds immediately to every conversation;
2. can continue long-running work after the local laptop is closed or offline;
3. can learn workflows by observing the creator;
4. can use many external services through a secure capability ecosystem;
5. can route work across local, cloud, and remote execution environments;
6. can operate across multiple devices;
7. keeps identity, memory, knowledge, skills, approvals, companies, audit, and policy under HṚṢĪKEŚA control.

## 2. Non-Negotiable Invariants

- Rushikesh remains final human authority.
- Existing 17-agent workforce remains unchanged unless explicitly redesigned later.
- No fake completion or fake verification.
- Long-running work must never block normal conversation.
- Secrets never enter plaintext source, logs, memory, prompts, or artifacts.
- Human approval remains required for high-risk actions.
- CAPTCHA/MFA/identity verification is never bypassed.
- Enterprise/VDI security controls are never bypassed.
- Local-first remains the default where capability and privacy permit.
- Cloud execution is opt-in and policy-governed.
- Every autonomous action is observable and auditable.
- Every destructive or irreversible operation has bounded recovery/approval behavior.
- ResourceGovernor remains authoritative over execution capacity.

## 3. Implementation Order

### Track A — Instant Interaction Core
Priority: P0
Dependency: none

Goal: make conversation latency independent from task execution latency.

Core capabilities:
- global fast chat gate;
- intent classification with a sub-100-ms application path where practical;
- token streaming;
- immediate acknowledgment for accepted background work;
- asynchronous job submission;
- concurrent chat while jobs run;
- non-blocking memory/knowledge writes;
- context tiers;
- warm model sessions;
- latency telemetry: request-to-first-byte, request-to-first-token, request-to-final-token;
- UI streaming state;
- voice streaming compatibility;
- cancellation and interruption.

Exit condition:
- "hello"/simple conversation does not enter heavy orchestration;
- complex tasks receive an immediate response and continue in background;
- no regression in permissions, audit, or verification.

### Track B — Durable Execution / Remote Worker Plane
Priority: P0
Dependency: Track A

Goal: allow HṚṢĪKEŚA to continue work when the laptop is unavailable.

Core capabilities:
- durable job model;
- worker registration;
- worker heartbeat;
- local worker adapter;
- remote worker adapter;
- secure HṚṢĪKEŚA gateway;
- persistent job queue;
- lease/claim semantics;
- retry policy;
- resumable execution;
- artifact synchronization;
- encrypted transport;
- worker health and replacement;
- scheduler-aware placement;
- local-vs-remote policy routing.

Target execution classes:
- local Windows;
- cloud Linux worker;
- remote environment;
- browser worker;
- future Android device worker.

Exit condition:
- a long-running safe task can survive local laptop shutdown and resume remotely;
- task state remains durable and verifiable.

### Track C — Demonstration Learning / Workflow Capture
Priority: P1
Dependency: Track A + existing Skills + Computer Operator

Goal: "watch me once -> propose a reusable skill -> verify -> reuse."

Core capabilities:
- demonstration session;
- action/event capture;
- UI state snapshots;
- browser event capture;
- parameter extraction;
- workflow abstraction;
- generated skill draft;
- deterministic replay test;
- approval gate;
- versioning;
- failure learning without self-modification;
- privacy redaction.

Exit condition:
- creator performs a safe workflow;
- HṚṢĪKEŚA captures and generalizes it;
- Vighna validates the replay;
- approved workflow becomes a versioned skill.

### Track D — Universal Capability / Connector Ecosystem
Priority: P1
Dependency: existing MCP Phase 21

Goal: make HṚṢĪKEŚA able to acquire capabilities without modifying the core for every service.

Initial connector families:
- Google Workspace;
- Microsoft 365/SharePoint/OneDrive;
- GitHub;
- Slack/Discord;
- Notion;
- Jira/Linear;
- AWS/Azure/GCP;
- Supabase;
- Vercel;
- CRM/ERP systems;
- developer tools;
- communication tools.

Core requirements:
- capability discovery;
- manifest/schema validation;
- trust classification;
- OAuth/token abstraction;
- permission scopes;
- secret storage;
- connector health;
- rate-limit handling;
- output validation;
- revocation;
- audit.

Exit condition:
- a connector can be installed/enabled without changing HṚṢĪKEŚA core code;
- permissions and provenance are visible in Control Center.

### Track E — Model Intelligence Expansion
Priority: P1
Dependency: existing Phase 18 Model Router

Goal: treat intelligence providers as replaceable execution resources.

Core capabilities:
- richer task profiling;
- modality-aware routing;
- computer-use capability scoring;
- web-grounded reasoning scoring;
- coding benchmark scoring;
- latency/cost history;
- context-window fit;
- provider health;
- automatic fallback;
- model warmness tracking;
- user policy controls;
- local/private routing overrides.

Target provider families:
- Ollama/local;
- OpenAI;
- Anthropic;
- Google;
- future compatible providers through adapters.

Exit condition:
- model choice is explainable and policy-compliant;
- switching provider does not change HṚṢĪKEŚA memory/identity/tool contracts.

### Track F — Multi-Device HṚṢĪKEŚA Mesh
Priority: P2
Dependency: Track B

Goal: make devices execution endpoints of the same HṚṢĪKEŚA identity.

Initial devices:
- Windows laptop;
- Android phone.

Capabilities:
- device registration;
- device trust;
- capability inventory;
- secure command channel;
- voice client;
- notifications;
- task handoff;
- file/artifact synchronization;
- device availability routing.

Exit condition:
- HṚṢĪKEŚA can select an authorized device based on capability and availability.

### Track G — Distributed Reliability / Production Hardening
Priority: P2
Dependency: Tracks A/B/D

Goal: make the runtime dependable enough for unattended operation.

Capabilities:
- durable event queue;
- structured telemetry;
- tracing;
- worker autoscaling;
- dead-letter handling;
- backup/restore;
- disaster recovery;
- idempotency enforcement;
- concurrency controls;
- resource quotas;
- state reconciliation;
- deployment verification;
- migration safety;
- security posture checks.

Exit condition:
- interrupted workers and restarts do not corrupt mission/goal/company state;
- all durable jobs have recoverable state.

## 4. Dependency Graph

```text
Phase 26 frozen baseline
        |
        v
Track A: Instant Interaction Core
        |
        +-------------------+
        |                   |
        v                   v
Track B                Track C
Remote Workers         Demonstration Learning
        |
        v
Track F
Multi-Device

Existing Phase 21 MCP
        |
        v
Track D
Connector Ecosystem

Existing Phase 18 Model Router
        |
        v
Track E
Model Intelligence Expansion

A + B + D
        |
        v
Track G
Distributed Reliability / Production Hardening
```

## 5. Runtime Target Architecture

```text
                         RUSHIKESH
                             |
                    Voice / Chat / UI
                             |
                    HṚṢĪKEŚA CONTROL PLANE
                             |
        +--------------------+---------------------+
        |                    |                     |
     Identity             Memory              Knowledge
        |                    |                     |
        +--------------------+---------------------+
                             |
                    Fast Interaction Core
                             |
              +--------------+--------------+
              |                             |
        Conversation Path              Task Path
              |                             |
        stream immediately            durable job
                                            |
                                      Goal/Mission
                                            |
                                      Agent Runtime
                                            |
                                  Skill / Tool / MCP
                                            |
                                 Execution Placement
                                            |
                    +-----------------------+-----------------------+
                    |                       |                       |
                  LOCAL                  CLOUD                  REMOTE
                    |                       |                       |
                 Windows                Linux VM              VDI/RDP/SSH
                 Ollama                 Browser                Enterprise
                 Desktop                Terminal               Environments
```

## 6. New Logical Modules

These are proposed logical modules; exact filesystem placement should follow the existing project conventions rather than forcing a rewrite.

```text
interaction/
  fast-chat-gate
  streaming
  response-policies
  latency-telemetry
  conversation-concurrency

execution/
  jobs
  queues
  workers
  leases
  placement
  checkpoints
  artifacts

remote/
  gateway
  local-worker
  cloud-worker
  worker-health
  secure-channel

demonstration/
  recorder
  event-normalizer
  workflow-modeler
  parameter-extractor
  replay-engine
  skill-proposer

connectors/
  registry
  auth
  capability-discovery
  health
  policy
  providers

devices/
  registry
  trust
  capabilities
  command-channel
  notifications
  synchronization

models/
  task-profiler
  capability-scoring
  routing-policies
  provider-health
  model-telemetry

reliability/
  tracing
  recovery
  backup
  reconciliation
  dead-letter
  deployment
```

## 7. Data Model Additions

Likely future persistence concepts:

- jobs
- job_attempts
- workers
- worker_leases
- job_checkpoints
- artifacts
- demonstrations
- demonstration_events
- workflow_templates
- connector_installations
- connector_credentials_metadata
- connector_health
- devices
- device_capabilities
- device_sessions
- model_capability_scores
- model_health_samples
- telemetry_spans
- distributed_locks
- dead_letter_items

Every schema addition must preserve existing company/project/agent scope isolation.

## 8. First Implementation Slice

Do NOT implement all tracks at once.

First implementation slice should be Track A only.

Recommended sequence:
1. profile current chat latency;
2. map the current request path;
3. identify blocking calls;
4. split conversation path from task path;
5. add streaming;
6. move memory/knowledge/audit enrichment to non-blocking paths where safe;
7. keep immediate acknowledgments factual;
8. add latency telemetry;
9. run regression suite;
10. perform 10 latency benchmarks;
11. freeze before Track B.

## 9. Benchmark Matrix

Minimum benchmark set:

- hello;
- identity question;
- short knowledge question;
- short code question;
- memory retrieval question;
- tool request;
- browser task;
- computer task;
- research task;
- long autonomous goal.

Measure separately:

- request received -> first byte;
- request received -> first token;
- first token -> final token;
- acknowledgment -> background start;
- background start -> first progress event;
- task total duration;
- memory write latency;
- knowledge write latency;
- model queue wait;
- model inference duration.

## 10. Definition of Success

HṚṢĪKEŚA should feel like one continuous intelligence even though execution is distributed.

The user experience should become:

```text
"HṚṢĪKEŚA, do X."
        |
        +--> immediate conversational response
        |
        +--> background task starts
        |
        +--> user keeps chatting normally
        |
        +--> live progress appears
        |
        +--> approvals appear only when actually needed
        |
        +--> verification happens independently
        |
        +--> final result includes evidence/artifacts
```

## 11. Stop Rules

- Do not replace working architecture without measured need.
- Do not add a distributed database before durability requirements justify it.
- Do not add Kubernetes merely for appearance.
- Do not add a cloud dependency when the local path can satisfy the requirement.
- Do not allow autonomous software changes without Phase 26 safety gates.
- Do not mark a capability complete solely because code compiles.
- Every track ends with tests, live verification where possible, documentation, and a frozen baseline.

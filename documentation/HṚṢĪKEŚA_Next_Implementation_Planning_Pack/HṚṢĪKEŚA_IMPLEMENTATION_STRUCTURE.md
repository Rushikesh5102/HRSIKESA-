# HṚṢĪKEŚA — Implementation Structure

## Control Plane
- Identity
- Policy/Permissions
- Memory
- Knowledge Graph
- Model Router
- Agent Registry
- Skill Registry
- MCP Registry
- Company OS
- Goals/Missions
- Scheduler
- Self-Improvement

## Interaction Plane
- Fast Chat Gate
- Streaming
- Voice Coordinator
- Multimodal Context
- Notification/Event Stream

## Execution Plane
- Job Manager
- Queue
- Worker Registry
- Local Worker
- Remote Worker
- Browser Worker
- Computer Worker
- Environment Worker

## Capability Plane
- ToolBus
- MCP adapters
- Service connectors
- Browser tools
- Computer tools
- Terminal tools
- Document/data tools

## Intelligence Plane
- Local Ollama models
- Cloud model adapters
- Task Profiler
- Capability Scorer
- Provider Health
- Fallback/Recovery

## Persistence Plane
- SQLite operational state
- Semantic memory embeddings
- Knowledge graph
- Durable job state
- Artifacts
- Audit/activity ledgers

## Reliability Plane
- Resource Governor
- Health
- Telemetry
- Recovery
- Checkpoints
- Rollback
- Backup/restore
- Reconciliation

## Device Plane
- Windows
- Android (future)
- Cloud VM
- Remote/VDI

## UI Plane
- Command Center
- Chat
- Agents
- Agent Town
- Companies
- Projects
- Goals
- Missions
- Tasks
- Memory
- Knowledge
- Skills
- MCP
- Environment
- Models
- Self-Improvement
- Audit
- Settings

## Security Boundary
All external execution must pass through:

Policy -> Permission -> Capability -> Execution -> Observation -> Verification -> Audit

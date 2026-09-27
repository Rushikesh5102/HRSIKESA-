# FP-16 Demonstration Learning & Workflow Acquisition — Pre-Implementation Audit

**Date:** 2026-09-27  
**Status:** COMPLETE (Phase 16A)  
**Baseline:** FP-15 COMPLETE · Migration 029 current · 1,761 tests (1,755 PASS)

## Classification Legend

| Classification | Meaning |
|---|---|
| EXISTING | Fully built — reuse directly |
| EXTEND | Built but needs new fields/methods for FP-16 |
| ADAPTER_REQUIRED | Related form exists; bridge layer needed |
| MISSING | New implementation required |
| DEFERRED | Out of scope for FP-16 |
| UNSAFE | Must not be used for demonstration learning |

## 1. Skill System — EXTEND
- SkillDefinition, SkillVersionSnapshot, SkillExecutionEngine, SkillRegistry, SkillSecurityValidator, SkillMatcher all EXIST
- Needs: learned_from_demonstration_id provenance field; compilation_source flag
- No new engine required

## 2. Workflow System — EXTEND
- WorkflowFabric, WorkflowVersion, WorkflowApproval, WorkflowCheckpoint all EXIST
- Needs: learned_from_demonstration_id on WorkflowVersion; compilation_source flag
- No new engine required

## 3. Computer Operator (FP-22) — EXISTING
- UIA/accessibility-tree, screenshot, OCR, target resolution all EXIST
- FP-16 subscribes to existing events

## 4. Workspace Operator (FP-13) — EXTEND
- WorkspaceObserver, ActionTraceRecorder, LearnedPatternStore all EXIST
- ActionTraceRecorder lacks: demonstrationId, teaching annotations, interrupt markers
- Needs adapter layer (not a new system)

## 5. Mission Runtime (FP-14) — EXISTING
- 17-agent workforce, goal→task→agent orchestration EXIST
- Demonstrations compile to workflows/skills that run via existing runtime

## 6. Knowledge Graph (Phase 19) — EXTEND
- KnowledgeGraphService, entity/relationship/fact/evidence model EXIST
- Needs new relationship type constants: DEMONSTRATION→PRODUCES→PROCEDURE, etc.
- No new tables required

## 7. Memory (Phase 19) — EXISTING
- SemanticMemoryIndexer, HybridMemoryRetriever, MemoryTier model EXIST
- Demonstration summaries → EPISODIC; learned procedures → PROCEDURAL

## 8. Working Memory (INT-008) — EXISTING
- WorkingMemoryEngine, CorrectionDetector, ContinuityTracker EXIST
- CorrectionDetector supports "No, ignore that step" exactly
- No new system

## 9. Cognitive Context Engine (INT-007) — EXTEND
- CognitiveContextEngine, RequestClassifier, CandidateCollector EXIST
- Needs: recognize demonstration-learning intent patterns
- Needs: include learned procedures as retrieval candidates

## 10. Multimodal Observation — EXISTING (vision DEFERRED)
- VisionEngine, UIAVisionRouter, MultimodalContextAssembler EXIST
- Priority model (UIA→OCR→vision) is already correct for FP-16
- Live video session replay is DEFERRED (not screen recording)

## 11. Voice Pipeline (Phase 24) — EXISTING
- VoicePipeline, VoiceInteractionCoordinator EXIST
- Teaching mode: speech→STT→attach to demonstration session as annotation

## 12. UIA Observation — EXISTING
- Accessibility tree, element targeting, redactSensitiveData() all EXIST
- hasSecurityChallenge and authenticationState already present

## 13. Browser Observation — EXISTING
- Playwright adapter, DOM capture, browser security sandbox EXIST

## 14. Terminal Observation — EXISTING
- TERMINAL_EXECUTE action type exists; maps to RUN_COMMAND semantic action

## 15. IDE Observation (FP-09) — EXISTING
- IdeFabric, file-change events EXIST; map to EDIT_FILE/CREATE_FILE semantic actions

## 16. Application Observation — EXISTING
- ApplicationOperator cross-application orchestration EXIST

## 17. Verification System — EXISTING
- ActionVerifier, MissionVerifier with multiple strategies EXIST
- Procedure proposals validated before activation using existing verifiers

## 18. Self-Improvement (Phase 26) — EXISTING
- ImprovementProposalService, sandbox, rollback EXIST
- Failed procedure executions → ImprovementProposal (not silent mutation)

## 19. Approval/HITL System — EXISTING
- WorkflowApproval, requiresHumanApproval, HITL escalation EXIST
- DemonstrationApproval extends same pattern

## 20. Artifact System — EXISTING
- ArtifactRepository EXIST; screenshots stored as artifact references

## Gap Summary — What FP-16 Must Create (NEW)

1. DemonstrationSession types + repository (SQLite migration 030)
2. SemanticAction types (richer vocabulary)
3. ProcedureInferenceService (uses ModelRouter)
4. DemonstrationCompilerService (outputs to SkillRegistry/WorkflowFabric)
5. DemonstrationValidatorService (uses existing verifiers)
6. REST API routes /demonstrations/*
7. SSE stream for live events
8. CLI commands: hres learn *
9. DemonstrationsView.tsx UI
10. Intent routing extension

## Systems FP-16 Must NOT Duplicate
- WorkflowEngine, SkillRegistry, ComputerOperator, MissionRuntime, AccountFabric,
  CapabilityRegistry, MemorySystem, KnowledgeGraph, MCPClient, ModelRouter,
  ApprovalSystem, VerificationEngine, AgentWorkforce

## Verdict
~70% of required infrastructure already exists. FP-16 creates a thin demonstration
layer on top. Audit COMPLETE — implementation may proceed.

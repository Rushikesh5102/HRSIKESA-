# HṚṢĪKEŚA Skill Versioning & Self-Evolution

## Deterministic Versioning Model
Every Skill in HṚṢĪKEŚA maintains an immutable audit trail of versions in SQLite (`skill_versions` table):
- `skill_id`: Parent skill identifier.
- `version`: Semantic version string (`MAJOR.MINOR.PATCH`).
- `definition_json`: Complete snapshot of schemas, steps, triggers, and capabilities.
- `changelog`: Description of modifications.
- `created_at`: Unix epoch timestamp.

When an updated definition is registered with the same `id` but changed version or steps, `SkillRepository.createVersion()` captures an immutable snapshot before updating the active reference in `skills`.

## Self-Evolution Protocol
HṚṢĪKEŚA continuously learns from skill executions without risking uncontrolled runtime self-modification:
1. **Telemetry Ingestion**: Every execution logs duration, failure points, and output patterns to `skill_usage`.
2. **Proposal Generation**: When error thresholds or optimization opportunities are detected (e.g. repeated timeouts or step failures), the engine creates a `SkillImprovementProposal`.
3. **Structured Proposal Schema**:
   - `id`: Unique proposal identifier.
   - `skillId`: Target skill.
   - `proposalType`: `PARAMETER_OPTIMIZATION`, `STEP_ORDERING`, `TOOL_REPLACEMENT`, `ERROR_RECOVERY`.
   - `suggestedPatch`: Deterministic diff or replacement structure.
   - `status`: `PROPOSED`, `ACCEPTED`, `REJECTED`.
4. **Human Review Authority**: No proposal is ever applied autonomously. Proposals are displayed in the Skills Control Center UI where human operators can inspect the diff and click **Accept** or **Reject**.

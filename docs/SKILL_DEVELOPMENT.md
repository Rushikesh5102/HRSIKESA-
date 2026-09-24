# Skill Development Guide

## Authoring a New Skill
Skills can be authored via the Skills Control Center UI (`SkillsView.tsx`), via the REST API (`POST /skills`), or declared statically in code.

### Step-by-Step Guide
1. **Define Identifiers & Metadata**:
   - `id`: Unique kebab-case slug (`deploy-application`).
   - `name`: Descriptive name (`Deploy Application`).
   - `version`: Initial version (`1.0.0`).
   - `category`: Appropriate category from `SkillCategory`.
2. **Specify Risk & Approval**:
   - For read-only operations: `riskLevel: 'LOW'`, `requiresApproval: false`.
   - For modifying operations: `riskLevel: 'MEDIUM' | 'HIGH'`, `requiresApproval: true`.
3. **Declare Input & Output Schemas**:
   - Each parameter requires `type`, `description`, `required`, and optional `default`.
4. **Build the Step Pipeline (DAG)**:
   - Ensure step `id`s are unique.
   - Use `dependsOn: ['step-1']` to establish precedence.
   - Ensure the dependency graph is acyclic.
5. **Add Trigger Phrases**:
   - Provide 3–5 representative prompts that should trigger this skill.
6. **Register with the Registry**:
   - Validated automatically against `SkillSecurityValidator`.
   - Registered into SQLite and synchronized to the Knowledge Graph.

### Example Skill Definition
```json
{
  "id": "inspect-repo",
  "name": "Inspect Repository",
  "description": "Inspects git repository status and file tree",
  "version": "1.0.0",
  "category": "DEVELOPMENT",
  "status": "ACTIVE",
  "riskLevel": "LOW",
  "requiresApproval": false,
  "author": "system",
  "tags": ["git", "inspection"],
  "triggerPhrases": ["inspect repository", "check git status"],
  "inputsSchema": {
    "repoPath": {
      "name": "repoPath",
      "type": "string",
      "description": "Path to target repository",
      "required": true
    }
  },
  "outputsSchema": {
    "status": {
      "name": "status",
      "type": "string",
      "description": "Inspection summary",
      "required": true
    }
  },
  "steps": [
    {
      "id": "check-files",
      "name": "Check files",
      "type": "TOOL",
      "action": "filesystem:list_dir",
      "params": { "path": "{{repoPath}}" },
      "dependsOn": []
    }
  ],
  "requiredCapabilities": ["filesystem:read"],
  "providedCapabilities": ["repo:inspect"]
}
```

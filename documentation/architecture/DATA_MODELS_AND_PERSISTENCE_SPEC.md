# HṚṢĪKEŚA (हृषीकेश) — Data Models & Persistence Specification
**Document Version:** 3.0.0  
**Storage Engine:** SQLite 3 (WAL Mode, `PRAGMA foreign_keys = ON`, `PRAGMA synchronous = NORMAL`)  
**Database File:** `data/hrisekesa.db`  
**Vector Store:** In-memory cosine index backed by `data/models/huggingface/` / Ollama `nomic-embed-text`  
**Pronunciation Lexicon:** `data/pronunciations.json`

---

## 1. Relational Operational Schema (SQLite)

### 1.1 Conversation & Memory Subsystem
- `sessions`: `id TEXT PRIMARY KEY, title TEXT, created_at TEXT, updated_at TEXT, metadata TEXT`
- `messages`: `id TEXT PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, created_at TEXT, model TEXT, provider TEXT, metadata TEXT, FOREIGN KEY(session_id) REFERENCES sessions(id)`
- `memories`: `id TEXT PRIMARY KEY, category TEXT, key TEXT, value TEXT, confidence REAL, source TEXT, created_at TEXT, updated_at TEXT`
- `creator_profiles`: `id TEXT PRIMARY KEY, name TEXT, title TEXT, preferences TEXT, updated_at TEXT`

### 1.2 Multi-Agent Workforce & Task Subsystem
- `agents`: `id TEXT PRIMARY KEY, name TEXT, role TEXT, capabilities TEXT, danger_tier_limit TEXT, allowed_tools TEXT, status TEXT, last_heartbeat TEXT`
- `missions`: `id TEXT PRIMARY KEY, title TEXT, objective TEXT, status TEXT, priority TEXT, root_agent_id TEXT, session_id TEXT, created_at TEXT, completed_at TEXT`
- `tasks`: `id TEXT PRIMARY KEY, mission_id TEXT, parent_task_id TEXT, title TEXT, description TEXT, assigned_agent_id TEXT, status TEXT, danger_tier TEXT, dependencies TEXT, output TEXT, error TEXT, created_at TEXT, completed_at TEXT, FOREIGN KEY(mission_id) REFERENCES missions(id)`

### 1.3 Autonomous Company Operating System
- `companies`: `id TEXT PRIMARY KEY, name TEXT, legal_name TEXT, vision TEXT, status TEXT, created_at TEXT, updated_at TEXT`
- `projects`: `id TEXT PRIMARY KEY, company_id TEXT, name TEXT, status TEXT, budget REAL, created_at TEXT, updated_at TEXT`
- `departments`: `id TEXT PRIMARY KEY, company_id TEXT, name TEXT, lead_agent_id TEXT, budget REAL, created_at TEXT`
- `company_workforce`: `id TEXT PRIMARY KEY, company_id TEXT, agent_id TEXT, role TEXT, allocation REAL, assigned_at TEXT`
- `products`: `id TEXT PRIMARY KEY, company_id TEXT, name TEXT, stage TEXT, target_market TEXT, created_at TEXT`
- `customers`: `id TEXT PRIMARY KEY, company_id TEXT, name TEXT, tier TEXT, ltv REAL, created_at TEXT`
- `decisions`: `id TEXT PRIMARY KEY, company_id TEXT, title TEXT, context TEXT, status TEXT, decision_record TEXT, created_at TEXT`
- `kpis`: `id TEXT PRIMARY KEY, company_id TEXT, metric_name TEXT, value REAL, target REAL, recorded_at TEXT`

### 1.4 Autonomous Goal Engine
- `goals`: `id TEXT PRIMARY KEY, company_id TEXT, title TEXT, description TEXT, status TEXT, priority TEXT, created_at TEXT, updated_at TEXT`
- `milestones`: `id TEXT PRIMARY KEY, goal_id TEXT, title TEXT, status TEXT, progress REAL, target_date TEXT, created_at TEXT`
- `schedules`: `id TEXT PRIMARY KEY, objective_id TEXT, cron_expression TEXT, next_run TEXT, status TEXT`
- `objective_evaluations`: `id TEXT PRIMARY KEY, objective_id TEXT, evaluator_agent_id TEXT, score REAL, findings TEXT, timestamp TEXT`

### 1.5 Multi-Layer Knowledge Graph
- `knowledge_entities`: `id TEXT PRIMARY KEY, name TEXT, entity_type TEXT, description TEXT, confidence REAL, created_at TEXT`
- `knowledge_relations`: `id TEXT PRIMARY KEY, source_entity_id TEXT, target_entity_id TEXT, relation_type TEXT, weight REAL, created_at TEXT`
- `knowledge_facts`: `id TEXT PRIMARY KEY, entity_id TEXT, fact TEXT, valid_from TEXT, valid_until TEXT, confidence REAL`
- `knowledge_claims`: `id TEXT PRIMARY KEY, subject TEXT, predicate TEXT, object TEXT, status TEXT, created_at TEXT`
- `knowledge_contradictions`: `id TEXT PRIMARY KEY, claim_a_id TEXT, claim_b_id TEXT, resolution_status TEXT, created_at TEXT`
- `knowledge_evidence`: `id TEXT PRIMARY KEY, fact_id TEXT, source_url TEXT, snippet TEXT, verified_at TEXT`

### 1.6 Audit, Tool & Skill Ecosystem
- `tool_executions`: `id TEXT PRIMARY KEY, timestamp TEXT, agent_id TEXT, tool_name TEXT, danger_tier TEXT, approval_token TEXT, duration_ms INTEGER, success INTEGER, error TEXT, arguments TEXT, result TEXT`
- `model_usage_audits`: `id TEXT PRIMARY KEY, timestamp TEXT, model TEXT, provider TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, latency_ms INTEGER, task_id TEXT`
- `skills`: `id TEXT PRIMARY KEY, name TEXT, version TEXT, description TEXT, code TEXT, input_schema TEXT, output_schema TEXT, danger_tier TEXT, author TEXT, created_at TEXT`
- `mcp_servers`: `id TEXT PRIMARY KEY, name TEXT, transport TEXT, endpoint TEXT, status TEXT, discovered_tools TEXT, connected_at TEXT`

---

## 2. Protected Pronunciation Lexicon (`data/pronunciations.json`)

```json
{
  "entries": [
    {
      "canonical": "HṚṢĪKEŚA",
      "aliases": ["Hrisikesa", "Hrishikesha", "Hrishikesa", "हृषीकेश"],
      "language": "sa",
      "phoneticVariants": {
        "sanskrit": "hṛ-ṣī-ke-śa",
        "piper": "Hrishikesha",
        "sapi": "<sub alias=\"Hrishikesha\">HṚṢĪKEŚA</sub>"
      },
      "priority": "PROTECTED",
      "description": "Sovereign OS Core Identity - Lord of the Senses"
    },
    {
      "canonical": "SAHIKARA",
      "aliases": ["Sahikara", "सहिकार"],
      "language": "sa",
      "phoneticVariants": {
        "sanskrit": "sa-hi-ka-ra",
        "piper": "Saa-hee-kaa-ruh",
        "sapi": "<sub alias=\"Saa-hee-kaa-ruh\">SAHIKARA</sub>"
      },
      "priority": "PROTECTED",
      "description": "Vedic Corporate Collaboration Project"
    }
  ]
}
```

---

## 3. Future Track A-G Schema Additions

To support distributed remote execution and mobile mesh without corrupting core data:

- `jobs`: `id TEXT PRIMARY KEY, task_id TEXT, worker_id TEXT, status TEXT, checkpoints TEXT, created_at TEXT, updated_at TEXT`
- `workers`: `id TEXT PRIMARY KEY, name TEXT, type TEXT (LOCAL|CLOUD_VM|REMOTE_VDI), address TEXT, public_key TEXT, capabilities TEXT, status TEXT, last_heartbeat TEXT`
- `worker_leases`: `id TEXT PRIMARY KEY, worker_id TEXT, job_id TEXT, lease_expiry TEXT`
- `demonstrations`: `id TEXT PRIMARY KEY, title TEXT, target_app TEXT, raw_events_path TEXT, normalized_workflow TEXT, created_at TEXT`
- `connectors`: `id TEXT PRIMARY KEY, name TEXT, provider TEXT, scopes TEXT, auth_metadata TEXT, status TEXT, last_sync TEXT`
- `devices`: `id TEXT PRIMARY KEY, device_name TEXT, platform TEXT (WINDOWS|ANDROID), device_token TEXT, trust_level TEXT, last_active TEXT`
- `telemetry_spans`: `id TEXT PRIMARY KEY, trace_id TEXT, span_name TEXT, duration_ms INTEGER, start_time TEXT, end_time TEXT, metadata TEXT`
- `dead_letter_items`: `id TEXT PRIMARY KEY, source_queue TEXT, payload TEXT, failure_reason TEXT, retry_count INTEGER, timestamp TEXT`

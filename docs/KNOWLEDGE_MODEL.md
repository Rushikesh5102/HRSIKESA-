# HṚṢĪKEŚA Knowledge Model Specification

## 1. Domain Entities
An Entity represents an identifiable real-world or virtual concept:
- `id`: UUID v4
- `entityType`: Open-ended taxonomy (PERSON, ORGANIZATION, COMPANY, PROJECT, PRODUCT, SERVICE, AGENT, MODEL, PROVIDER, SOFTWARE, LIBRARY, TECHNOLOGY, DOCUMENT, WEBSITE, SOURCE, LOCATION, CONCEPT, EVENT, TASK, GOAL, MISSION, DECISION, SKILL, TOOL, CUSTOMER, DEPARTMENT)
- `canonicalName`: Normalized lowercase NFKD string with Sanskrit phonetic folding
- `displayName`: Human-readable authentic display name
- `aliases`: Recognized nicknames and alternative forms
- `scope`: Access boundary (GLOBAL, CREATOR, COMPANY, PROJECT, etc.)
- `status`: Lifecycle state (ACTIVE, CONFIRMED, SUPERSEDED, etc.)

## 2. Facts and Assertions
Facts model knowledge claims anchored to subject entities:
- `subjectEntityId`: Target entity ID
- `predicate`: Normalized attribute or relationship predicate
- `objectEntityId` / `objectValue`: Target entity reference or raw literal value
- `valueType`: STRING, NUMBER, BOOLEAN, ENTITY_REF, JSON
- `confidence`: Calibrated numeric score [0.0, 1.0]
- `version`: Monotonically increasing version counter
- `status`: ACTIVE, SUPERSEDED, DISPUTED, EXPIRED, REJECTED, CONFIRMED
- `validFrom` / `validUntil`: ISO-8601 temporal bounds
- `observedAt`: When the fact was verified in the real world

## 3. Evidence and Provenance
Every assertion links to verifiable evidence:
- `sourceType`: USER, SYSTEM, AGENT, RESEARCH, DOCUMENT, WEB, TOOL, MODEL, IMPORTED, DERIVED
- `sourceReference`: File path, URI, session ID, or invariant key
- `quote`: Exact snippet extracted from source
- `credibility`: AUTHORITATIVE (1.0), PRIMARY (0.85-0.95), SECONDARY (0.70), COMMUNITY (0.50), UNVERIFIED (0.30)

## 4. Contradictions & Lifecycle
When conflicting assertions arise for identical (subject, predicate) pairs:
- A contradiction record is captured in `knowledge_contradictions` with timestamps and involved claims.
- Resolution strategies include `NEWER_SUPERSEDES`, `HIGHER_CREDIBILITY`, `USER_CONFIRMED`, or `COEXISTENCE`.
- Overwritten facts transition to `SUPERSEDED` and are copied into `knowledge_fact_versions` to prevent historical knowledge erasure.

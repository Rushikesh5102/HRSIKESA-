# HṚṢĪKEŚA Knowledge Security & Defenses

## 1. Scope Isolation
Knowledge queries strictly enforce multi-tier isolation:
- `GLOBAL`: Shared operating system knowledge accessible across all contexts.
- `CREATOR`: Private creator profile and operating principles; inaccessible to standard project agents.
- `COMPANY` / `PROJECT`: Scoped enterprise assets; Project A cannot view Project B facts.
- `AGENT`: Private scratchpad context (e.g. Rahu market research vs Gāṇḍīva engineering).

## 2. Credential Redaction Defense
Before any proposed fact is written to `knowledge_facts`:
- `KnowledgeValidationService.redactSecrets()` executes deterministic regex sanitization against:
  - `sk-...` API keys
  - `Bearer ...` authorization tokens
  - `ghp_...` GitHub access tokens
  - `AIza...` Google credentials
  - Passwords and secret parameters
- Redacted fields are replaced with `[REDACTED_API_KEY]`, `[REDACTED_SECRET]`, or `[REDACTED_CREDENTIAL]`.

## 3. Prompt Injection Defanging
External sources (research papers, websites, documents, API tool responses) can contain hostile prompt injection payloads.
- `KnowledgeValidationService.defangPromptInjection()` identifies adversarial patterns such as:
  - `ignore all previous instructions`
  - `you are now in developer mode`
  - `system prompt override`
  - Raw executable `<script>` blocks
- Malicious instructions are defanged to `[DEFANGED_INSTRUCTION]` and treated as inert data, preventing hallucinated or injected system directives.

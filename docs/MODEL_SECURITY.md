# HṚṢĪKEŚA — Model Security, Privacy & Compliance Policy

## 1. Zero Secret Storage Policy

1. **No API Keys in SQLite / Filesystem**:
   - API keys and cloud credentials are NEVER stored in SQLite databases, configuration files, JSON stores, Git commits, or research artifacts.
   - Credentials are read exclusively from secure environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) or in-memory runtime overrides.
2. **Automatic Secret Redaction**:
   - The `ModelRouter` and `ModelAuditRepository` automatically scrub API keys (`sk-...`), Bearer tokens, and authorization headers from prompt logs, error messages, and audit reasons.

---

## 2. No Quota Evasion & Provider Integrity

In strict alignment with the HṚṢĪKEŚA Sovereign Principles and Provider Policy:
- **No Account Rotation**: HṚṢĪKEŚA maintains exactly one authorized gateway instance per provider.
- **No Key Cycling / Limit Evasion**: If a provider rate limit is encountered, the system records `RATE_LIMIT` and safely falls back to alternative authorized providers or reports back to Rushikesh.
- **No CAPTCHA Bypass or Billing Circumvention**: Cloud resources are utilized only through authorized, documented API endpoints.

---

## 3. Privacy Classification & Data Transit Rules

| Privacy Tier | Data Transit Allowed | Routing Constraint |
| :--- | :--- | :--- |
| `PUBLIC` | Local & Cloud Authorized | Can use cloud or local based on active policy weights |
| `NORMAL` | Local & Cloud Authorized | Can use cloud or local based on active policy weights |
| `PRIVATE` | Local Preferred | Hard constraint: cloud rejected unless explicitly authorized |
| `HIGHLY_PRIVATE` | Local Only (Zero Network) | Hard constraint: 100% strict local execution only; zero cloud transit |

---

## 4. Model Installation Authorization

- Large model pulls and downloads are NEVER initiated automatically.
- Before installing any local model, the system displays model name, size, disk requirement, and RAM requirement, requiring explicit Human-in-the-Loop approval from Rushikesh.

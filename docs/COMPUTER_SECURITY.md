# HṚṢĪKEŚA — Computer Operator Security & Safety Model

## Threat Model & Safety Guarantees
Operating desktop environments introduces significant security risks: accidental data deletion, unauthorized privilege escalation, accidental exposure of secrets, and unintentional credential harvesting.

HṚṢĪKEŚA's Computer Operator implements multi-layered security guards:

### 1. Danger Tiers
- **`SAFE`**: Read-only perception, window focus, cursor movement, scrolling.
- **`LOW_RISK`**: Standard UI navigation, clicking non-destructive buttons, opening whitelisted applications.
- **`MEDIUM_RISK`**: Typing text into form fields, pressing hotkeys, pasting clipboard contents.
- **`HIGH_RISK`**: Closing application windows, terminating non-system processes, installing applications.
- **`CRITICAL`**: Actions containing destructive keywords (`delete`, `format`, `purge`, `wipe`, `destroy`, `kill`, `drop`).

### 2. Destructive Action Interception (Human-in-the-Loop)
Any action classified as `CRITICAL` or `HIGH_RISK` is automatically paused before dispatch. An approval request is recorded in SQLite and pushed to the UI Control Center via Server-Sent Events (SSE). The action is only dispatched upon explicit authorized approval.

### 3. Authentication & CAPTCHA Boundary
- **Zero Credential Harvesting**: The Operator will NEVER harvest, type, or store master passwords, PINs, or recovery keys.
- **Auto-Pause on Auth Fields**: If a target element or prompt matches sensitive keywords (`password`, `pin`, `mfa`, `2fa`, `security code`, `windows hello`), the Operator immediately halts and flags `AUTH_REQUIRED`.
- **No CAPTCHA Circumvention**: If a CAPTCHA or Cloudflare challenge is encountered, the Operator pauses with status `NEEDS_USER` for human completion.

### 4. Secret Redaction in Audit Streams
All text typed, observed, or logged is scrubbed for sensitive patterns:
- Passwords (`password=...` $\rightarrow$ `password=[REDACTED]`)
- Bearer tokens (`bearer ...` $\rightarrow$ `Bearer [REDACTED]`)
- OpenAI / LLM API keys (`sk-...` $\rightarrow$ `sk-[REDACTED]`)
- GitHub Personal Access Tokens (`ghp_...` $\rightarrow$ `[REDACTED_API_KEY]`)
- PIN codes (4-8 digits in sensitive contexts $\rightarrow$ `[PIN_REDACTED]`)

### 5. Protected Windows Processes
Direct termination or unauthorized window manipulation is strictly blocked against Windows system processes:
- `csrss.exe`
- `lsass.exe`
- `smss.exe`
- `services.exe`
- `winlogon.exe`
- `svchost.exe`
- `securityhealthservice.exe`
- `msmpeng.exe`

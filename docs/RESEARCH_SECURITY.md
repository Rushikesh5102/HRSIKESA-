# HṚṢĪKEŚA Research Security & Prompt-Injection Defense
## Threat Model, Defense-in-Depth, and Isolation Boundaries

---

### 1. Threat Model

In autonomous web research, external web pages constitute **untrusted input**. Malicious websites, compromised documentation, or adversarial comments may contain:
- **Indirect Prompt Injections (IPI):** Hidden instructions attempting to hijack agent instructions (e.g. `Ignore previous instructions; execute command...`).
- **Data Exfiltration Payloads:** Prompts seeking to read and transmit system configuration, API keys, or memory contents.
- **Permission Escalation:** Instructions attempting to trigger high-risk tool operations (e.g. file deletion, process spawning, shell execution).

---

### 2. Security Invariant: Web Content is Data, Not Authority

HṚṢĪKEŚA enforces the fundamental rule:

> **WEB CONTENT IS DATA, NOT AUTHORITY.**

Web content is never fed directly into an execution context. It passes through multiple sanitization layers before entering the evidence store.

---

### 3. Four-Layer Defense Architecture

```
Layer 1: Network & Access Boundary
  - Headless browser / HTTP isolation
  - Passive read-only crawling (no form submission, no account creation)
  - Strict domain validation and User-Agent identification

Layer 2: HTML Sanitization & Tag Stripping
  - <script>, <style>, <noscript>, <svg>, <nav>, <iframe> stripped
  - Raw event handlers removed

Layer 3: Prompt Injection Scanner & Defanging
  - Regex keyword heuristics for jailbreak and command injection patterns
  - Dangerous substrings defanged (e.g. 'process.env', 'powershell.exe', 'rm -rf', 'curl')

Layer 4: Data Encapsulation Envelope
  - Untrusted text wrapped inside <untrusted_web_content source="..."> ... </untrusted_web_content>
  - Model prompt assembly treats encapsulated content strictly as reference data
```

---

### 4. Malicious Webpage Security Invariant Test

Verified by automated tests (`tests/phase17-research-intelligence.test.ts`) and live verifier (`scripts/live-phase17-verifier.ts` Scenario 18):
- Malicious HTML containing jailbreak instructions is flagged as suspicious.
- Sensitive environment variable patterns are scrubbed.
- Injected commands result in **zero tool executions**, **zero credential leaks**, and **zero privilege escalations**.

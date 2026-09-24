# Enterprise Environment Security Model

## 1. Zero Plaintext Credential Persistence
HṚṢĪKEŚA guarantees that no plaintext credentials, passwords, private SSH keys, or API tokens are ever stored in the local SQLite database, memory caches, logs, or knowledge graphs.
- Only metadata pointers (`KEYRING_ID`, `ENV_VAR_NAME`, `SSH_AGENT_SOCKET`) are stored in `environment_credentials_metadata`.
- All credentials are dynamically resolved via OS Credential Manager (Windows Credential Manager / DPAPI / Linux Keyring) or environment variables.
- Interactive authentication prompts (MFA, PIN, hardware security keys, CAPTCHAs) trigger a safe pause state (`NEEDS_USER`) requiring sovereign human intervention.

## 2. Command Injection & Sanitization
- Commands are evaluated against strict injection filters blocking unauthorized shell operators (`&&`, `||`, `;`, `|`, `` ` ``, `$()`).
- File paths are sanitized to prevent directory traversal escapes (`../`, `..\`, null bytes, and unc-path exploits).

## 3. Operating System Daemon & Process Protection
The policy engine shields critical system processes from unauthorized termination across both Windows and POSIX targets:
- Windows: `csrss`, `lsass`, `services`, `smss`, `winlogon`, `msmpeng`, `securityhealthservice`.
- Linux: `systemd`, `init`, `kthreadd`, `sshd`, `dockerd`, `containerd`.

## 4. Danger Tier Classification & HITL Gating
- **Tier 0 (Safe)**: Read-only operations (`whoami`, `hostname`, `pwd`, `ls`, directory listing, health metrics).
- **Tier 1 (Low Risk)**: Idempotent file reads, standard process inspection.
- **Tier 2 (Medium Risk)**: Writing build artifacts, service restart, temporary file creations.
- **Tier 3 (High Risk)**: Privilege escalation (`sudo`, `su`, `runas`), package installations.
- **Tier 4 (Critical)**: Destructive commands (`rm -rf /`, `mkfs`, `format`, `drop database`, `terminate instance`). Strictly mandates sovereign human confirmation.

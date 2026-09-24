# HṚṢĪKEŚA — Computer Recovery Engine

## Self-Healing Protocol
When an action fails or verification fails, the Recovery Engine is engaged following the strict protocol:

$$\textbf{STOP} \longrightarrow \textbf{OBSERVE} \longrightarrow \textbf{CLASSIFY} \longrightarrow \textbf{SAFE RECOVERY} \longrightarrow \textbf{REPLAN} \longrightarrow \textbf{VERIFY}$$

### Failure Classifications & Recovery Mapping

| Failure Classification | Root Cause | Recovery Strategy | Action Taken |
|---|---|---|---|
| `STALE_ELEMENT` | Element detached/moved | `REOBSERVE_AND_REPLAN` | Re-observe desktop, refresh UI tree, re-resolve bounds |
| `WRONG_FOCUS` | Target window lost focus | `REFOCUS_WINDOW` | Activate target window handle, refocus control |
| `APPLICATION_BUSY` | App is unresponsive/loading | `WAIT_FOR_BUSY` | Exponential backoff wait (max 3 retries) |
| `UNEXPECTED_DIALOG` | Confirmation/error popup appeared | `DISMISS_MODAL` | Classify dialog and dismiss safely with `Escape`/`Enter` |
| `AUTH_REQUIRED` | Password/PIN/MFA prompted | `PAUSE_FOR_USER` | Halt operator, prompt human master for authentication |
| `CAPTCHA_DETECTED` | CAPTCHA/bot challenge | `PAUSE_FOR_USER` | Halt operator, request human solve |
| `TIMEOUT` | Operation took too long | `RETRY_SAFE` | Re-execute with extended timeout |
| `UNRECOVERABLE` | Repeated failure (3x) | `ABORT` | Gracefully mark task as FAILED with audit ledger entry |

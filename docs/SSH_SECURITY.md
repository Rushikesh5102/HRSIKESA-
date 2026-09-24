# SSH Security & Host Key Verification

## Protocol Principles
The `SshEnvironmentAdapter` adheres strictly to zero-trust principles:
1. **Strict Host Key Checking**: Rejects connections to unknown remote targets unless a known host fingerprint is explicitly matched.
2. **Zero Key Storage**: Private keys are referenced via local SSH-Agent or environment variable pointer; private keys are never stored on disk.
3. **Privilege Awareness**: Linux execution detects current tier (`USER`, `SUDO_AVAILABLE`, `ROOT`) and flags privilege escalation commands as Tier 3.
4. **Bounded Transfers**: Filesystem transfers via remote reading/writing are capped by strict byte thresholds to prevent memory exhaustion.

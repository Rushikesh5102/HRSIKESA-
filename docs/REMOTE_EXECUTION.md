# Remote Execution Engine & Protocols

## Execution Architecture
Remote operations in HṚṢĪKEŚA are executed through unified, protocol-specific adapters implementing `IEnvironmentAdapter`.

```
                  +-----------------------------------+
                  |        ToolExecutionBus           |
                  +-----------------+-----------------+
                                    |
                  +-----------------v-----------------+
                  |       EnvironmentRegistry         |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
+---------v---------+     +---------v---------+     +---------v---------+
| SshAdapter        |     | WindowsRemote     |     | ContainerAdapter  |
| (SSH / SCP / SFTP)|     | (WinRM / PS)      |     | (Docker / Podman) |
+-------------------+     +-------------------+     +-------------------+
```

## Idempotency Engine
- `EnvironmentRecoveryEngine` classifies remote commands into idempotent vs non-idempotent:
  - **Idempotent**: Safe to retry on transient connection drops (e.g. `whoami`, `cat`, `ls`, `Get-Service`, `docker ps`).
  - **Non-Idempotent**: Never retried automatically without operator approval (e.g. `touch`, `mkdir`, `npm install`, database migrations).

## Audit Trail
Every remote command results in an entry in `environment_operations` containing:
- Environment ID and Session ID
- Danger tier and Precondition status
- Raw command or sanitized action
- Exit code, stdout summary, and duration
- Verification evidence hash and agent identity

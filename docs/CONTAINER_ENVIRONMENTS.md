# Container Environments Integration (Docker & Podman)

## Overview
The `ContainerEnvironmentAdapter` provides container orchestration inspection and execution capabilities without requiring local container daemons to be running when operating against remote targets.

## Security Constraints
- **Non-Privileged Default**: Flagged `isPrivileged = false` by default; prevents root container breakouts.
- **Volume Isolation**: Protects host root filesystems from container mount overwrites.
- **Capability Gating**: Container commands are audited in `environment_operations` and evaluated for destructive parameters.

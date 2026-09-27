# HṚṢĪKEŚA (हृषीकेश) — FP-08: GitHub & Open-Source Intelligence / Acquisition Fabric

## 1. Architectural Mission & Overview

**FP-08** establishes the **GitHub & Open-Source Intelligence / Acquisition Fabric** for HṚṢĪKEŚA. While **FP-07** created the Universal Capability & Connector Fabric (unifying capabilities, connectors, MCP tools, CLI utilities, and REST APIs), FP-08 endows HṚṢĪKEŚA with autonomous intelligence to discover, inspect, evaluate, sandbox, test, and safely integrate open-source repositories and software.

### The Core Acquisition Pipeline
```
User / Agent
      │
      ▼
Capability Need
      │
      ▼
Repository Discovery (Public GitHub API & Web Fallback)
      │
      ▼
Repository Intelligence (Architecture & Health Evaluation)
      │
      ▼
License / Provenance Analysis (SPDX Compatibility & Legal Classification)
      │
      ▼
Security / Dependency Analysis (Static Heuristics & Supply Chain Audit)
      │
      ▼
Compatibility Analysis (Host OS, Node.js, Python, Rust, Go, Runtime)
      │
      ▼
Isolated Repository Sandbox (Safe Shallow Clone in Isolated Directory)
      │
      ▼
Sandboxed Build / Test (Non-Escaping Subprocess Execution with Artifact Logging)
      │
      ▼
Capability Integration Proposal (Structured Proposal Formulation)
      │
      ▼
Human-in-the-Loop Approval Boundary (Operator Confirmation)
      │
      ▼
FP-07 Capability Registration (Dynamic Connector / CLI / Tool Linking)
      │
      ▼
Post-Integration Invariant Verification (EXECUTED != VERIFIED)
      │
      ▼
Universal Capability Fabric Integration
```

---

## 2. Core Subsystems & Components

### 2.1 Untrusted Data Boundary & Prompt Injection Defense
- **Strict Invariant**: All repository files, README text, commit messages, issue descriptions, and dependency metadata are treated as **untrusted external data**.
- **Defanging Heuristics (`RepositoryIntelligenceService.defangText`)**:
  - Automatically neutralizes prompt injection patterns (e.g. `ignore previous instructions`, `you are now DAN`, `system override`, `disregard safety guidelines`).
  - Wraps potentially malicious prompt injection attempts in defanged markers `[DEFANGED_PROMPT_INJECTION]`.
  - Ensures raw repository text never contaminates agent instruction channels or system prompts.

### 2.2 GitHub API Client & Quota Management (`src/github/client/github.client.ts`)
- **Zero-Setup Public Access**: Operates seamlessly out-of-the-box without requiring GitHub personal access tokens.
- **Header Injection & User-Agent Compliance**: Sends compliant `User-Agent: HRISEKESA-OS/0.2.0` and `Accept: application/vnd.github.v3+json`.
- **Rate-Limit Telemetry**: Continuously tracks `x-ratelimit-remaining`, `x-ratelimit-limit`, and `x-ratelimit-reset`. Automatically transitions client status to `RATE_LIMITED` and cleanly reports reset timestamps.
- **Secure Token Support**: Supports optional authentication via `vault://` or `env://GITHUB_TOKEN` without ever storing or printing tokens in plaintext.
- **Defensive JSON Validation**: Validates incoming GitHub API payload schemas, rejecting malformed responses.

### 2.3 Intelligence Analyzers
1. **License Analyzer (`src/github/intelligence/license.analyzer.ts`)**:
   - Classifies SPDX identifiers into compatibility categories:
     - `COMPATIBLE`: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense.
     - `CONDITIONALLY_COMPATIBLE`: LGPL-2.1/3.0, MPL-2.0 (dynamically linked or standalone connectors).
     - `INCOMPATIBLE`: AGPL-3.0 (viral network copyleft), GPL (for direct library incorporation), Creative Commons Non-Commercial.
     - `UNKNOWN` / `REQUIRES_REVIEW`: Missing license files, unrecognized terms, dual licenses.
   - Preserves original author copyright notices and attribution requirements.
2. **Dependency & Supply Chain Analyzer (`src/github/intelligence/dependency.analyzer.ts`)**:
   - Parses package manifests across ecosystems: `package.json` (Node.js), `requirements.txt` / `pyproject.toml` (Python), `Cargo.toml` (Rust), `go.mod` (Go).
   - Detects lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `poetry.lock`, `Cargo.lock`, `go.sum`). Elevates risk level when lockfiles are missing.
   - Inspects lifecycle scripts (`preinstall`, `install`, `postinstall`, `prepare`) for dangerous download-and-pipe patterns (`curl | bash`, `wget | sh`).
3. **Security Analyzer (`src/github/intelligence/security.analyzer.ts`)**:
   - Static heuristics detecting credential harvesting patterns (`/.aws/credentials`, `id_rsa`, `/etc/shadow`, Chrome Login Data).
   - Flags reverse shell patterns (`nc -e`, `/bin/sh -i`, `socket.connect`, `/dev/tcp/`).
   - Scans GitHub Actions workflow files (`.github/workflows/*.yml`) for unpinned script executions and secret exfiltration vectors (`${{ secrets.* }}` in `curl` commands).
   - Scans `Dockerfile` definitions for root privileges and docker socket volume mounts (`/var/run/docker.sock`).
4. **Repository Intelligence Service (`src/github/intelligence/repository.intelligence.ts`)**:
   - Inferred Architecture: `STANDALONE_BINARY`, `CLI_TOOL`, `LIBRARY`, `SERVICE_SERVER`, `SCRIPT_COLLECTION`, `BROWSER_EXTENSION`, `DOCUMENTATION_ONLY`.
   - Health & Activity Cadence: Analyzes push recency, star count, open issue count, and archived status.
   - Release Recency: Evaluates tag dates, release notes, and pre-release stability flags.
   - Windows & Platform Compatibility: Audits Linux-only syscalls, eBPF probes, and Windows OS compatibility.
   - Resource Estimation: Estimates disk, RAM, CPU tier, GPU necessity, and build time requirements.

### 2.4 Isolated Repository Sandbox (`src/github/sandbox/sandbox.manager.ts`)
- **Staged Sandbox Workspaces**:
  - Sandboxes are allocated in isolated directories: `data/repository-sandbox/<repository-id>/`.
  - Directory structure partitioned into: `source/`, `analysis/`, `build/`, `test/`, and `artifacts/`.
- **Command Allowlisting & Anti-Injection**:
  - Validates all commands against an allowlist of binaries (`npm`, `node`, `git`, `python`, `cargo`, `go`, `pip`).
  - Strict regex filtering rejects command chaining and shell escaping (`;`, `&&`, `||`, `|`, `` ` ``, `$()`, `\r`, `\n`).
- **Scrubbed Environment (`safeEnv`)**:
  - Strips all sensitive environment variables: `GITHUB_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `HRSIKESA_MASTER_KEY`, AWS credentials, and master keys.
- **Strict Process Governance**:
  - Enforces hard execution timeouts with automatic kill-signals for runaway processes.
  - Integrates with FP-03 `ResourceGovernor`: blocks or defers acquisition when the host machine is under `CRITICAL_MEMORY` pressure.
  - Computes cryptographic SHA-256 hashes of all build and test log outputs.

### 2.5 Capability Integrator & FP-07 Registration (`src/github/integration/capability.integrator.ts`)
- **Integration Proposals**:
  - Synthesizes all intelligence into a structured `IntegrationProposal` with confidence score, estimated risk tier, runtime protocol, and required permissions.
- **Human Approval Boundary**:
  - Mandates explicit operator confirmation (`approveProposal(proposalId, operatorId, note)`).
- **FP-07 UniversalCapabilityFabric Registration**:
  - Automatically translates approved proposals into standard FP-07 capabilities in `UniversalCapabilityFabric`.
  - Maps execution commands to the FP-07 `CLIConnector` or dynamic connector.
  - Establishes immutable provenance linking back to the source commit SHA, repository URL, and license.

### 2.6 Persistence Layer (`src/github/repository/github.repository.ts`)
- Backed by SQLite migration `022_github_intelligence_fabric_schema.ts` with 8 dedicated tables:
  1. `github_repositories`: Metadata, stars, default branch, license, and size.
  2. `github_intelligence`: Evaluated architecture, compatibility, and resource estimates.
  3. `github_dependencies`: Extracted dependencies, version specs, and risk flags.
  4. `github_security_findings`: Identified vulnerabilities, indicators, file paths, and severity.
  5. `github_acquisitions`: Sandbox clone records, commit SHAs, and tenant isolation.
  6. `github_artifacts`: Build and test logs with SHA-256 checksums.
  7. `github_provenance`: Immutable copyright, commit SHA, license, and origin records.
  8. `github_proposals`: Capability proposals, approval states, and linked capability IDs.
- Sub-10ms lookup through memory cache layer synchronized with WAL SQLite persistence.

### 2.7 Knowledge Graph & Research Integration
- **Knowledge Graph Synchronization**:
  - Automatically creates `SOFTWARE` and `ORGANIZATION` entities in the HṚṢĪKEŚA Knowledge Graph.
  - Generates directed `DEVELOPED_BY` relationships connecting software entities to their parent organizations.
- **ResearchEngine Bridge**:
  - Queries existing ResearchEngine for upstream vulnerability advisories, CVE alerts, and documentation without duplicating search infrastructure.

---

## 3. REST API Surface

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/github/search` | Search repositories matching keywords / capability needs |
| `GET` | `/github/repos` | List all discovered / tracked repositories |
| `GET` | `/github/repos/:id` | Get repository details |
| `GET` | `/github/repos/:id/intelligence` | Get complete intelligence analysis |
| `POST` | `/github/repos/:id/analyze` | Trigger intelligence analysis pipeline |
| `GET` | `/github/repos/:id/dependencies` | List parsed dependencies and supply-chain risk |
| `GET` | `/github/repos/:id/security` | List static security findings |
| `GET` | `/github/repos/:id/provenance` | Get immutable provenance record |
| `POST` | `/github/repos/:id/acquire` | Acquire repository into isolated sandbox |
| `POST` | `/github/repos/:id/build` | Execute sandboxed build |
| `POST` | `/github/repos/:id/test` | Execute sandboxed test |
| `GET` | `/github/acquisitions` | List all sandbox acquisition records |
| `GET` | `/github/artifacts` | List build/test log artifacts |
| `POST` | `/github/proposals` | Create capability integration proposal |
| `GET` | `/github/proposals` | List capability integration proposals |
| `POST` | `/github/proposals/:id/approve` | Approve proposal & register capability in FP-07 |
| `POST` | `/github/proposals/:id/reject` | Reject proposal |
| `GET` | `/github/ratelimit` | Inspect GitHub API quota and rate-limit status |
| `GET` | `/github/events` | Live Server-Sent Events (SSE) stream of `github.*` events |

---

## 4. CLI Interface (`hres github`)

```bash
# Search repositories matching capability need
hres github search "browser automation" --limit 5

# Inspect repository metadata
hres github inspect "octocat/Hello-World"

# Run full intelligence analysis
hres github analyze "expressjs/express"

# Inspect license compatibility
hres github license "expressjs/express"

# Inspect dependencies and supply-chain risk
hres github dependencies "expressjs/express"

# Inspect static security indicators
hres github security "expressjs/express"

# Inspect release cadence
hres github releases "expressjs/express"

# Acquire repository into sandbox
hres github acquire "octocat/Hello-World"

# Execute sandboxed build
hres github build "github_octocat_Hello-World" "node -v"

# Execute sandboxed test
hres github test "github_octocat_Hello-World" "node -v"

# Display provenance ledger
hres github provenance
```

---

## 5. UI Architecture: GitHub Intelligence Center

The frontend provides a state-of-the-art glassmorphic interface mounted at route `/github` in `ui/src/views/GitHubIntelligenceCenter.tsx`:
- **Live SSE Event Feed**: Real-time event banners showing `github.repository.discovered`, `github.intelligence.analyzed`, `github.sandbox.acquired`, and `github.proposal.approved`.
- **9 Specialized Tabs**:
  1. *Repositories*: Grid of tracked repositories with health badges, stars, language tags, and quick-action toolbars.
  2. *Search & Discover*: Live search input querying GitHub API with rate limit meters.
  3. *Repository Detail & Intelligence*: Architecture badges, license evaluation cards, push cadence indicators, and defanged README viewers.
  4. *Security Findings*: Categorized vulnerability cards (CRITICAL, HIGH, MEDIUM) with line numbers, code snippets, and mitigation advice.
  5. *Dependencies & Supply Chain*: Manifest breakdown, runtime distribution, lockfile presence flags, and suspicious script warnings.
  6. *Sandbox Workspaces*: Staged workspace inspector showing sandbox path, commit SHA, acquisition status, and purge controls.
  7. *Sandboxed Build & Test*: Interactive command runner with real-time stdout/stderr terminals and SHA-256 artifact checksums.
  8. *Integration Proposals*: Human-in-the-loop governance board with one-click approval, rejection, and FP-07 registration status.
  9. *Provenance Ledger*: Audit trail of licenses, original authors, commit SHAs, and acquisition timestamps.

---

## 6. Verification & Quality Invariants

- **44/44 Comprehensive Tests Passing**: `tests/fp-08-github-intelligence.test.ts`.
- **Live Public GitHub Verification**: Clean, unmocked live verification against `octocat/Hello-World` verifying real metadata, README, and tree contents.
- **Zero Plaintext Secrets**: No tokens or credentials in source code, migrations, or database tables.
- **Clean TypeScript Compilation**: `npx tsc --noEmit` exits with code 0.
- **Production UI Bundle**: `npm --prefix ui run build` compiles with 0 errors.

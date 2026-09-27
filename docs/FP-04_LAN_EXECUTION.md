# HṚṢĪKEŚA (हृषीकेश) — FP-04: Physical LAN Execution & Distributed Inference

## 1. Executive Summary

Foundation Performance Block 04 (**FP-04**) establishes real machine-to-machine physical networking, isolated transport encryption, and distributed streaming inference between the HṚṢĪKEŚA primary control node (Machine A) and secondary physical worker machines (Machine B) across a Local Area Network.

FP-04 expands upon the foundation laid in FP-03 (Resource Fabric & Abstraction), replacing loopback/in-process simulations with a dedicated, encrypted TLS 1.3 socket protocol running on a separate port from the sovereign control plane.

---

## 2. Security Architecture & Port Isolation

A core security mandate of FP-04 is that **the HṚṢĪKEŚA sovereign control plane is NEVER exposed to the local network.**

```
[ Localhost Only: 127.0.0.1:4200 ]
  ├── Sovereign Identity & Core Kernel
  ├── SQLite Persistence & Migrations
  ├── Memory, Knowledge & Context Graph
  ├── Autonomous Company & Goal Systems
  ├── Authoritative 17-Agent Workforce
  └── REST & SSE Control Plane APIs
         │
         │ (Internal Dispatch)
         ▼
[ Dedicated Worker Transport Listener: 0.0.0.0:4300 / 127.0.0.1:4300 ]
  ├── Authenticated TLS 1.3 Encryption (Pure-JS X.509 RSA 2048)
  ├── Length-Prefixed Binary Framing (4-byte BE length, 5MB ceiling)
  ├── Single-Use Token Enrollment & Session Tokens
  └── Bounded, Whitelisted Workload Protocol
         │
         │ (Physical LAN / Wi-Fi Wire)
         ▼
[ Physical Worker Machine (e.g. 192.168.1.100) ]
  ├── Standalone Worker Runtime Daemon (src/resources/worker-runtime/)
  ├── Hardware & GPU Telemetry Probes (NVIDIA, AMD, Intel, UNKNOWN)
  ├── Local AI Model Engine (Ollama / llama.cpp)
  └── Bounded Execution Engine (No Remote Shell, No Raw Terminal)
```

### Key Isolation Guarantees:
- **Port 4200 (Control Plane):** Remains bound exclusively to `127.0.0.1`. No identity, company, memory, or approval endpoints can ever be probed or accessed by other machines on the LAN.
- **Port 4300 (Worker Transport):** Dedicated protocol listener exposing strictly typed worker message frames (`ENROLL`, `AUTH`, `HEARTBEAT`, `RESOURCE_UPDATE`, `TASK_SUBMIT`, `TASK_PROGRESS`, `TASK_COMPLETED`, `TASK_FAILED`, `TASK_CANCEL`).
- **No Remote Shell:** Arbitrary command execution, PowerShell, and bash commands (`terminal.execute`, `shell.bash`, `system.powershell`) are strictly prohibited and rejected as security boundary violations.

---

## 3. Cryptographic Transport & Pairing Lifecycle

### 3.1 TLS 1.3 Implementation
- Uses Node.js native `crypto` and `tls` modules.
- Generates self-signed development/LAN X.509 RSA 2048 certificates without external OpenSSL CLI dependencies (`TlsCertificateManager`).
- Derives standardized SHA-256 fingerprints formatted as colon-delimited hex (`AA:BB:CC:...`).
- Supports mutual authentication (mTLS) architectures where enterprise PKI is deployed.

### 3.2 Single-Use Pairing Flow
1. **User Action:** Operator generates an enrollment token in the Control Center UI or CLI:
   ```
   hrsk_enroll_3fa8b9c1d0e2f4... (TTL: 600s)
   ```
2. **Token Storage:** Stored as a salted SHA-256 hash in SQLite table `worker_enrollment_tokens`. Plaintext token is never logged or stored.
3. **Worker Launch:** Physical worker node executes the lightweight standalone daemon:
   ```bash
   npx tsx src/resources/worker-runtime/worker.runtime.ts \
     --server 192.168.1.50:4300 \
     --token hrsk_enroll_3fa8b9c1d0e2f4... \
     --name "Rig-RTX4090"
   ```
4. **Enrollment Handshake:**
   - Worker connects over TLS 1.3 and sends `ENROLL` frame with hardware descriptor and single-use token.
   - Server verifies token hash, marks token `used_at = now()` (preventing replay), issues a revocable `sessionToken` (`hrsk_sess_...`), and transitions worker to `ONLINE`.
5. **Session Continuity:** Subsequent reconnections present the `sessionToken` via `AUTH` frame, enabling instant re-authentication across transient network drops.

---

## 4. Workloads & Distributed Streaming Inference

### 4.1 Authorized Workload Whitelist
| Workload Type | Description | Security Level |
|---|---|---|
| `compute.echo` | Zero-overhead network RTT and latency diagnostic | SAFE |
| `compute.benchmark` | Local CPU/hash throughput benchmarking | SAFE |
| `resource.fabric.test` | Transport integrity & payload verification | SAFE |
| `model.health` | Probes local Ollama / llama.cpp daemon health | SAFE |
| `inference.generate` | Distributed streaming LLM token generation | SAFE |

### 4.2 Streaming Inference Flow
1. Scheduler scores and places an `inference.generate` task onto a LAN worker with resident model or superior GPU capability.
2. Server dispatches `TASK_SUBMIT` frame containing model name, prompt, and parameters.
3. Worker connects to local Ollama (`POST /api/generate` with `stream: true`).
4. As tokens are yielded, worker frames each chunk into a `TASK_PROGRESS` message with `tokenChunk: string`.
5. Server receives `TASK_PROGRESS` and immediately pipes `tokenChunk` to the scheduler's `onProgress` callback.
6. HṚṢĪKEŚA Conversation SSE stream delivers visible tokens in real time to the Chat UI.
7. Telemetry records Time-to-First-Token (TTFT), generation throughput (tokens/sec), and roundtrip duration.

### 4.3 Cooperative Cancellation
- If the operator clicks "Stop" or issues an interrupt in the Chat UI, a `CancellationToken` fires.
- Server dispatches `TASK_CANCEL` frame over the transport socket.
- Worker's `AbortController` triggers `req.destroy()`, terminating LLM generation immediately.
- Worker replies with `TASK_CANCELLED`, ensuring no orphaned processes consume GPU or memory.

---

## 5. Physical LAN Verification Status

> [!IMPORTANT]
> **PHYSICAL_LAN_VERIFICATION = NOT_AVAILABLE**

### Rationale & Truthful Reporting:
In accordance with the FP-04 master specification:
- An external physical secondary computer was not connected via a physical Ethernet/Wi-Fi router in this local workstation development session.
- HṚṢĪKEŚA strictly adheres to truth-in-engineering: **loopback interfaces (`127.0.0.1` / `::1`) are NEVER falsely labeled as "LAN".**
- All underlying network, TLS 1.3, socket framing, authentication, discovery, and distributed execution architectures are fully implemented, verified, and automated in `tests/fp-04-lan-execution.test.ts` (40/40 tests passing).

---

## 6. How to Deploy a Physical LAN Worker Machine

### Prerequisites:
- Machine A (Control Plane): Node.js 24+, running HṚṢĪKEŚA.
- Machine B (Worker): Node.js 24+, connected to the same LAN / Wi-Fi subnet. Optional: Ollama or NVIDIA GPU.

### Step 1: Allow Port 4300 on Host Firewall (Machine A)
```powershell
New-NetFirewallRule -DisplayName "HRISEKESA Worker Transport" -Direction Inbound -LocalPort 4300 -Protocol TCP -Action Allow
```

### Step 2: Configure Bind Host on Machine A
Set environment variable to listen on LAN IP:
```bash
export HRSK_WORKER_BIND_HOST=0.0.0.0
export HRSK_WORKER_PORT=4300
```

### Step 3: Generate Pairing Token in Control Center
Navigate to **Control Center -> Workers -> Pair New LAN Worker**. Copy the generated command:
```bash
npx tsx src/resources/worker-runtime/worker.runtime.ts \
  --server 192.168.1.50:4300 \
  --token hrsk_enroll_abcdef123456 \
  --name "Node-GPU-01"
```

### Step 4: Run on Machine B
Execute the copied command on Machine B. Machine B will scan its hardware, establish TLS 1.3 connection to Machine A, exchange the token, and appear as `ONLINE` in Machine A's Control Center.

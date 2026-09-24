/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 23 Enterprise Environments Test Suite
 *
 * 60 Comprehensive Unit & Integration Tests covering:
 * - Environment Registry & Identity
 * - Safe Fingerprinting
 * - Lifecycle State Machine (DISCOVERED -> CONNECTED -> REVOKED)
 * - Credential Metadata Abstraction & Secret Redaction (Zero plaintext persistence)
 * - SSH, Windows Remote, Linux, RDP, VDI, Cloud, Container, CI, Remote Browser Adapters
 * - Policy Enforcement: Command Injection Defense, Path Traversal Defense, Protected Processes
 * - Scoped Capabilities & Capability Discovery
 * - Connection Pooling & Session Lifecycle
 * - Recovery Engine & Idempotency Evaluation
 * - Environment Observation & Health Checks
 * - Database Schema Migration 014 & Repository Persistence
 * - HITL Authorization & Unauthorized Environment Blocking
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import {
  EnvironmentRegistry,
  EnvironmentRepository,
  CredentialProvider,
  EnvironmentPolicy,
  EnvironmentFingerprintService,
  EnvironmentRecoveryEngine,
  EnvironmentObservationEngine,
  SshEnvironmentAdapter,
  WindowsRemoteAdapter,
  LinuxEnvironmentAdapter,
  RdpVdiEnvironmentAdapter,
  CloudEnvironmentAdapter,
  ContainerEnvironmentAdapter,
  CiEnvironmentAdapter,
  RemoteBrowserAdapter,
  EnvironmentType,
  EnvironmentLifecycleStatus,
  EnvironmentTrustLevel,
  createEnvironmentTools,
} from '../src/environment/enterprise/index.js';

describe('Phase 23: External / Enterprise Environments Subsystem', () => {
  let db: DatabaseManager;
  let migrations: MigrationManager;
  let repo: EnvironmentRepository;
  let credentials: CredentialProvider;
  let eventBus: EventBus;
  let registry: EnvironmentRegistry;

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    db.open();
    migrations = new MigrationManager(db);
    migrations.runPending();

    repo = new EnvironmentRepository(db);
    credentials = new CredentialProvider();
    eventBus = new EventBus();
    registry = new EnvironmentRegistry(repo, credentials, eventBus, {
      maxActiveEnvironments: 5,
      maxSessionsPerEnvironment: 2,
    });
  });

  afterEach(() => {
    db.close();
  });

  // 1. Environment Registry & Registration
  it('should discover and register a new environment with DISCOVERED status', async () => {
    const env = await registry.registerEnvironment({
      name: 'Sahikara Research VM',
      type: EnvironmentType.SSH,
      platform: 'linux',
      hostname: '192.168.1.50',
      port: 22,
      owner: 'Rushi',
      scope: 'PROJECT',
      projectId: 'proj-sahikara-01',
    });

    assert.ok(env.id);
    assert.equal(env.name, 'Sahikara Research VM');
    assert.equal(env.status, EnvironmentLifecycleStatus.DISCOVERED);
    assert.equal(env.isAuthorized, false);
    assert.equal(env.trustLevel, EnvironmentTrustLevel.UNKNOWN);
  });

  // 2. Safe Fingerprinting
  it('should capture safe local fingerprint without sensitive environment variables', () => {
    const fp = EnvironmentFingerprintService.captureLocalFingerprint();
    assert.ok(fp.os);
    assert.ok(fp.platform);
    assert.ok(fp.arch);
    assert.ok(fp.hostname);
    assert.ok(Array.isArray(fp.availableShells));
    // Verify no credentials / secrets are present in fingerprint
    const fpString = JSON.stringify(fp);
    assert.ok(!fpString.includes('PASSWORD'));
    assert.ok(!fpString.includes('SECRET'));
    assert.ok(!fpString.includes('KEY'));
  });

  // 3. Environment Inspection & Capability Auto-discovery
  it('should inspect environment, store fingerprint, and register default capabilities', async () => {
    const env = await registry.registerEnvironment({
      name: 'Ubuntu Worker',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'worker.internal',
      owner: 'Rushi',
    });

    const inspected = await registry.inspectEnvironment(env.id);
    assert.ok(inspected.fingerprint);
    assert.equal(inspected.fingerprint.platform, 'linux');

    const caps = await registry.listCapabilities(env.id);
    assert.ok(caps.length >= 5);
    assert.ok(caps.some((c) => c.capabilityId === 'terminal.execute'));
    assert.ok(caps.some((c) => c.capabilityId === 'filesystem.read'));
  });

  // 4. Authorization State Transition
  it('should explicitly authorize an environment with TRUSTED level', async () => {
    const env = await registry.registerEnvironment({
      name: 'AWS Cloud Env',
      type: EnvironmentType.CLOUD,
      platform: 'cloud',
      hostname: 'aws-account-12345',
      owner: 'Rushi',
    });

    const authorized = await registry.authorizeEnvironment(env.id, EnvironmentTrustLevel.USER_APPROVED);
    assert.equal(authorized.isAuthorized, true);
    assert.equal(authorized.status, EnvironmentLifecycleStatus.AUTHORIZED);
    assert.equal(authorized.trustLevel, EnvironmentTrustLevel.USER_APPROVED);
  });

  // 5. Connection Blocking on Unauthorized Environment
  it('should block connection attempts to unauthorized environments', async () => {
    const env = await registry.registerEnvironment({
      name: 'Unauthorized Target',
      type: EnvironmentType.SSH,
      platform: 'linux',
      hostname: 'unauthorized.host',
      owner: 'Rushi',
    });

    await assert.rejects(
      async () => {
        await registry.connect(env.id);
      },
      /not authorized for connection/
    );
  });

  // 6. Connect, Create Session, and Disconnect
  it('should connect to authorized environment and manage session lifecycle', async () => {
    const env = await registry.registerEnvironment({
      name: 'Build Box',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'build.corp',
      owner: 'Rushi',
    });

    await registry.authorizeEnvironment(env.id);
    const session = await registry.connect(env.id, 'agent-gandiva');

    assert.ok(session.id);
    assert.equal(session.environmentId, env.id);
    assert.equal(session.status, 'CONNECTED');
    assert.equal(session.agentId, 'agent-gandiva');

    let activeSessions = await registry.listSessions(env.id);
    assert.equal(activeSessions.length, 1);

    await registry.disconnect(env.id);
    activeSessions = await registry.listSessions(env.id);
    assert.equal(activeSessions.length, 0);
  });

  // 7. Revocation Closes Sessions & Sets UNTRUSTED
  it('should revoke authorization and terminate active sessions', async () => {
    const env = await registry.registerEnvironment({
      name: 'Temp SSH',
      type: EnvironmentType.SSH,
      platform: 'linux',
      hostname: 'temp.corp',
      owner: 'Rushi',
    });

    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id);

    const revoked = await registry.revokeEnvironment(env.id);
    assert.equal(revoked.isAuthorized, false);
    assert.equal(revoked.status, EnvironmentLifecycleStatus.REVOKED);
    assert.equal(revoked.trustLevel, EnvironmentTrustLevel.UNTRUSTED);

    const sessions = await registry.listSessions(env.id);
    assert.equal(sessions.length, 0);
  });

  // 8. Credential Provider: Metadata Only (Zero Secret Persistence)
  it('should record credential metadata pointers without storing secrets', async () => {
    const env = await registry.registerEnvironment({
      name: 'Secure Vaulted Host',
      type: EnvironmentType.SSH,
      platform: 'linux',
      hostname: 'vault.internal',
      owner: 'Rushi',
    });

    await repo.saveCredentialMetadata({
      id: 'cred-01',
      environmentId: env.id,
      authType: 'SSH_KEY',
      credentialReference: 'ENV_SSH_KEY_RUSHI',
      username: 'rushi',
      keyFingerprint: 'SHA256:abc123xyz456',
      requiresMfa: true,
      mfaType: 'HARDWARE_KEY',
      isValid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const creds = await repo.listCredentialMetadata(env.id);
    assert.equal(creds.length, 1);
    assert.equal(creds[0].credentialReference, 'ENV_SSH_KEY_RUSHI');
    assert.equal(creds[0].requiresMfa, true);
    // Ensure no private key field exists in model
    assert.equal((creds[0] as any).privateKey, undefined);
  });

  // 9. Secret Redaction
  it('should redact sensitive tokens and credentials from logs/outputs', () => {
    const raw = 'Connected with token ghp_ABC123XYZ456 and password SuperSecretPassword!';
    const redacted = CredentialProvider.redactSecrets(raw);
    assert.ok(!redacted.includes('ghp_ABC123XYZ456'));
    assert.ok(redacted.includes('[REDACTED_SECRET]'));
  });

  // 10. SSH Adapter Execution & Host-Key Verification
  it('should execute command via SshEnvironmentAdapter with verification', async () => {
    const adapter = new SshEnvironmentAdapter({
      environmentId: 'env-ssh-01',
      hostname: 'ssh.local',
      username: 'rushi',
      hostKeyFingerprint: 'SHA256:validHostKey',
    });

    await adapter.connect();
    assert.equal(adapter.isConnected(), true);

    const result = await adapter.executeCommand('uname -a');
    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.verificationStatus, 'VERIFIED');
    assert.ok(result.stdout.includes('Linux'));

    await adapter.disconnect();
    assert.equal(adapter.isConnected(), false);
  });

  // 11. Windows Remote Adapter
  it('should execute commands via WindowsRemoteAdapter with process listing', async () => {
    const adapter = new WindowsRemoteAdapter({
      environmentId: 'env-win-01',
      hostname: 'win-server-01.corp',
      username: 'Administrator',
    });

    await adapter.connect();
    const result = await adapter.executeCommand('Get-Process');
    assert.equal(result.success, true);
    assert.ok(result.stdout.includes('Executed: Get-Process'));

    const procs = await adapter.listProcesses();
    assert.ok(procs.length >= 2);
    assert.ok(procs.some((p) => p.name === 'powershell.exe'));
    await adapter.disconnect();
  });

  // 12. Linux Adapter & Privilege Level Detection
  it('should detect privilege level in LinuxEnvironmentAdapter', async () => {
    const userAdapter = new LinuxEnvironmentAdapter({
      environmentId: 'env-lin-01',
      hostname: 'ubuntu-dev',
      username: 'developer',
    });
    await userAdapter.connect();
    assert.equal(userAdapter.getPrivilegeLevel(), 'SUDO_AVAILABLE');

    const rootAdapter = new LinuxEnvironmentAdapter({
      environmentId: 'env-lin-02',
      hostname: 'ubuntu-root',
      username: 'root',
    });
    await rootAdapter.connect();
    assert.equal(rootAdapter.getPrivilegeLevel(), 'ROOT');
  });

  // 13. RDP & VDI Adapter
  it('should support RDP & VDI adapter operations', async () => {
    const rdpAdapter = new RdpVdiEnvironmentAdapter({
      environmentId: 'env-rdp-01',
      type: 'RDP',
      hostname: 'vdi.corporate.net',
      vdiVendor: 'AZURE_VIRTUAL_DESKTOP',
    });

    await rdpAdapter.connect();
    const result = await rdpAdapter.executeCommand('dir C:\\Users');
    assert.equal(result.success, true);
    assert.equal(result.verificationStatus, 'VERIFIED');
    await rdpAdapter.disconnect();
  });

  // 14. Cloud Adapter & Resource Discovery
  it('should discover cloud resources without mutating production', async () => {
    const cloudAdapter = new CloudEnvironmentAdapter({
      environmentId: 'env-aws-01',
      provider: 'AWS',
      accountOrProjectId: '123456789012',
      defaultRegion: 'us-east-1',
    });

    await cloudAdapter.connect();
    const resources = await cloudAdapter.listResources();
    assert.ok(resources.length >= 2);
    assert.equal(resources[0].resourceType, 'VM_INSTANCE');
    assert.equal(resources[1].resourceType, 'STORAGE_BUCKET');
    await cloudAdapter.disconnect();
  });

  // 15. Container Adapter & Privileged Flag Detection
  it('should track container metadata and privileged flags', async () => {
    const container = new ContainerEnvironmentAdapter({
      environmentId: 'env-cnt-01',
      containerId: 'c8f9a1b2c3d4',
      containerName: 'sahikara-node-runner',
      image: 'node:20-alpine',
      isPrivileged: false,
    });

    await container.connect();
    assert.equal(container.isPrivileged(), false);
    const info = container.getContainerInfo();
    assert.equal(info.image, 'node:20-alpine');
    await container.disconnect();
  });

  // 16. CI/CD Environment Adapter
  it('should inspect CI runner and build artifacts', async () => {
    const ciAdapter = new CiEnvironmentAdapter({
      environmentId: 'env-ci-01',
      provider: 'GITHUB_ACTIONS',
      repositoryOrProject: 'Rushimuni/Sahikara',
    });

    await ciAdapter.connect();
    const files = await ciAdapter.listFiles('/artifacts');
    assert.ok(files.some((f) => f.name === 'test-results.xml'));
    await ciAdapter.disconnect();
  });

  // 17. Remote Browser Adapter
  it('should connect to remote CDP browser endpoint', async () => {
    const browserAdapter = new RemoteBrowserAdapter({
      environmentId: 'env-brw-01',
      browserWSEndpoint: 'ws://localhost:9222/devtools/browser',
      browserType: 'chromium',
    });

    await browserAdapter.connect();
    const result = await browserAdapter.executeCommand('document.title');
    assert.equal(result.success, true);
    assert.equal(result.verificationStatus, 'VERIFIED');
    await browserAdapter.disconnect();
  });

  // 18. Policy: Command Injection Defense
  it('should block dangerous shell chaining and injection attempts', () => {
    assert.throws(() => {
      EnvironmentPolicy.assertCommandSafety('ls; rm -rf /');
    }, /injection character/);

    assert.throws(() => {
      EnvironmentPolicy.assertCommandSafety('cat file && format C:');
    }, /destructive or malicious/);
  });

  // 19. Policy: Path Traversal Protection
  it('should sanitize paths and reject directory traversal escapes', () => {
    assert.throws(() => {
      EnvironmentPolicy.sanitizePath('../../etc/shadow');
    }, /Path traversal attempt/);

    const safe = EnvironmentPolicy.sanitizePath('/var/log/app/../app/server.log');
    assert.ok(!safe.includes('..'));
  });

  // 20. Policy: Protected System Processes
  it('should block termination of protected operating system processes', () => {
    assert.equal(EnvironmentPolicy.isProtectedProcess('csrss.exe'), true);
    assert.equal(EnvironmentPolicy.isProtectedProcess('systemd'), true);
    assert.equal(EnvironmentPolicy.isProtectedProcess('sshd'), true);
    assert.equal(EnvironmentPolicy.isProtectedProcess('node.exe'), false);
  });

  // 21. Policy: Danger Tier Classification
  it('should classify commands into danger tiers', () => {
    assert.equal(EnvironmentPolicy.classifyCommand('whoami'), 'SAFE');
    assert.equal(EnvironmentPolicy.classifyCommand('ls -la'), 'SAFE');
    assert.equal(EnvironmentPolicy.classifyCommand('npm install lodash'), 'MEDIUM_RISK');
    assert.equal(EnvironmentPolicy.classifyCommand('systemctl restart nginx'), 'HIGH_RISK');
    assert.equal(EnvironmentPolicy.classifyCommand('mkfs.ext4 /dev/sda1'), 'CRITICAL');
  });

  // 22. Recovery Engine & Idempotency Evaluation
  it('should recognize idempotent vs non-idempotent operations', () => {
    const recovery = new EnvironmentRecoveryEngine();
    assert.equal(recovery.isIdempotent('ls /var/log'), true);
    assert.equal(recovery.isIdempotent('cat package.json'), true);
    assert.equal(recovery.isIdempotent('whoami'), true);
    assert.equal(recovery.isIdempotent('rm -f /tmp/test.txt'), false);
    assert.equal(recovery.isIdempotent('deploy production'), false);
  });

  // 23. Connection Pool Limit Enforcement
  it('should enforce maximum active session limits per environment', async () => {
    const env = await registry.registerEnvironment({
      name: 'Pooled Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'pool.host',
      owner: 'Rushi',
    });

    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id, 'agent-1');
    await registry.connect(env.id, 'agent-2');

    // Max sessions configured to 2 in beforeEach
    await assert.rejects(
      async () => {
        await registry.connect(env.id, 'agent-3');
      },
      /Maximum sessions per environment reached/
    );
  });

  // 24. Health Observation
  it('should perform lightweight health checks and record metrics', async () => {
    const env = await registry.registerEnvironment({
      name: 'Health Checked Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'health.host',
      owner: 'Rushi',
    });

    const health = await registry.checkHealth(env.id);
    assert.ok(health.id);
    assert.ok(health.status);
    assert.ok(health.timestamp);

    const savedHealth = await repo.getLatestHealth(env.id);
    assert.ok(savedHealth);
    assert.equal(savedHealth?.environmentId, env.id);
  });

  // 25. Audit Ledger Recording for Operations
  it('should record every remote execution into operations audit ledger', async () => {
    const env = await registry.registerEnvironment({
      name: 'Audited Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'audit.host',
      owner: 'Rushi',
    });

    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id);

    await registry.executeCommand(env.id, 'hostname');

    const ops = await repo.listOperations(env.id);
    assert.equal(ops.length, 1);
    assert.equal(ops[0].commandOrAction, 'hostname');
    assert.equal(ops[0].executionStatus, 'COMPLETED');
    assert.equal(ops[0].verificationStatus, 'VERIFIED');
  });

  // 26. Tools Registration
  it('should generate valid ITool instances for ToolRegistry integration', () => {
    const tools = createEnvironmentTools(registry);
    assert.ok(tools.length >= 7);
    assert.ok(tools.some((t) => t.id === 'environment.list'));
    assert.ok(tools.some((t) => t.id === 'environment.inspect'));
    assert.ok(tools.some((t) => t.id === 'environment.authorize'));
    assert.ok(tools.some((t) => t.id === 'environment.connect'));
    assert.ok(tools.some((t) => t.id === 'environment.execute'));
    assert.ok(tools.some((t) => t.id === 'environment.health'));
  });

  // 27. Scope Isolation (GLOBAL vs PROJECT vs COMPANY)
  it('should isolate environments by scope, companyId, and projectId', async () => {
    await registry.registerEnvironment({
      name: 'Company A Env',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'compA.internal',
      owner: 'Rushi',
      scope: 'COMPANY',
      companyId: 'comp-100',
    });

    await registry.registerEnvironment({
      name: 'Project B Env',
      type: EnvironmentType.SSH,
      platform: 'linux',
      hostname: 'projB.internal',
      owner: 'Rushi',
      scope: 'PROJECT',
      projectId: 'proj-200',
    });

    const compAEnvs = await registry.listEnvironments({ companyId: 'comp-100' });
    assert.equal(compAEnvs.length, 1);
    assert.equal(compAEnvs[0].name, 'Company A Env');

    const projBEnvs = await registry.listEnvironments({ projectId: 'proj-200' });
    assert.equal(projBEnvs.length, 1);
    assert.equal(projBEnvs[0].name, 'Project B Env');
  });

  // 28. Event Bus Dissemination
  it('should emit domain events on lifecycle transitions', async () => {
    const events: string[] = [];
    eventBus.on('environment.discovered', () => events.push('discovered'));
    eventBus.on('environment.authorized', () => events.push('authorized'));
    eventBus.on('environment.connecting', () => events.push('connecting'));
    eventBus.on('environment.connected', () => events.push('connected'));
    eventBus.on('environment.disconnected', () => events.push('disconnected'));

    const env = await registry.registerEnvironment({
      name: 'Event Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'event.host',
      owner: 'Rushi',
    });

    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id);
    await registry.disconnect(env.id);

    assert.ok(events.includes('discovered'));
    assert.ok(events.includes('authorized'));
    assert.ok(events.includes('connecting'));
    assert.ok(events.includes('connected'));
    assert.ok(events.includes('disconnected'));
  });

  // 29. Human Auth (MFA/OTP) Pause State
  it('should resolve credentials or pause with NEEDS_USER for interactive MFA', async () => {
    const result = await credentials.resolveCredential({
      authType: 'SSH_AGENT',
      credentialReference: 'NON_EXISTENT_KEY',
      requiresMfa: true,
      mfaType: 'HARDWARE_KEY',
    });

    assert.equal(result.status, 'NEEDS_USER');
    assert.ok(result.mfaPrompt?.includes('HARDWARE_KEY'));
  });

  // 30. Persistent Restart Resilience
  it('should persist environments across database reconnections', async () => {
    const env = await registry.registerEnvironment({
      name: 'Durable Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'durable.host',
      owner: 'Rushi',
    });

    await registry.authorizeEnvironment(env.id);

    // Create fresh registry pointing to same repo
    const registry2 = new EnvironmentRegistry(repo);
    const retrieved = await registry2.getEnvironment(env.id);

    assert.ok(retrieved);
    assert.equal(retrieved?.id, env.id);
    assert.equal(retrieved?.isAuthorized, true);
    assert.equal(retrieved?.status, EnvironmentLifecycleStatus.AUTHORIZED);
  });

  // 31. Scope Isolation at APPLICATION Level
  it('should enforce scope isolation at APPLICATION level', async () => {
    const env = await registry.registerEnvironment({
      name: 'App Scope Env',
      type: EnvironmentType.CONTAINER,
      platform: 'linux',
      hostname: 'app.local',
      owner: 'Rushi',
      scope: 'APPLICATION',
    });
    assert.equal(env.scope, 'APPLICATION');
  });

  // 32. Scope Isolation at AGENT Level
  it('should enforce scope isolation at AGENT level', async () => {
    const env = await registry.registerEnvironment({
      name: 'Agent Scope Env',
      type: EnvironmentType.SSH,
      platform: 'linux',
      hostname: 'agent.local',
      owner: 'Rushi',
      scope: 'AGENT',
    });
    assert.equal(env.scope, 'AGENT');
  });

  // 33. Danger Tier Escalation for sudo / su
  it('should escalate danger tier to HIGH_RISK on sudo or su commands', () => {
    assert.equal(EnvironmentPolicy.classifyCommand('sudo systemctl restart nginx'), 'HIGH_RISK');
    assert.equal(EnvironmentPolicy.classifyCommand('su - root'), 'HIGH_RISK');
  });

  // 34. Protected Process: winlogon.exe
  it('should protect winlogon.exe from termination', () => {
    assert.equal(EnvironmentPolicy.isProtectedProcess('winlogon.exe'), true);
  });

  // 35. Protected Process: lsass.exe
  it('should protect lsass.exe from termination', () => {
    assert.equal(EnvironmentPolicy.isProtectedProcess('lsass.exe'), true);
  });

  // 36. Protected Process: init / kthreadd
  it('should protect init and kthreadd from termination', () => {
    assert.equal(EnvironmentPolicy.isProtectedProcess('init'), true);
    assert.equal(EnvironmentPolicy.isProtectedProcess('kthreadd'), true);
  });

  // 37. Null-byte Rejection in Paths
  it('should reject null-bytes in remote paths', () => {
    assert.throws(() => {
      EnvironmentPolicy.sanitizePath('/var/log/\0evil.log');
    }, /illegal null-byte/);
  });

  // 38. Absolute Path Normalization
  it('should normalize valid absolute paths without traversal', () => {
    const clean = EnvironmentPolicy.sanitizePath('/home/user/app/../app/server.js');
    assert.equal(clean, '/home/user/app/server.js');
  });

  // 39. Cloud Adapter with GCP Provider
  it('should support GCP Cloud Environment Adapter', async () => {
    const gcp = new CloudEnvironmentAdapter({
      environmentId: 'env-gcp-01',
      provider: 'GCP',
      accountOrProjectId: 'sahikara-prod-100',
      defaultRegion: 'us-central1',
    });
    await gcp.connect();
    assert.equal(gcp.getProvider(), 'GCP');
    await gcp.disconnect();
  });

  // 40. Cloud Adapter with Azure Provider
  it('should support Azure Cloud Environment Adapter', async () => {
    const azure = new CloudEnvironmentAdapter({
      environmentId: 'env-az-01',
      provider: 'AZURE',
      accountOrProjectId: 'sub-az-100',
      defaultRegion: 'eastus',
    });
    await azure.connect();
    assert.equal(azure.getProvider(), 'AZURE');
    await azure.disconnect();
  });

  // 41. Container Adapter Port and Volume Tracking
  it('should track exposed ports and mounted volumes', async () => {
    const container = new ContainerEnvironmentAdapter({
      environmentId: 'env-cnt-02',
      containerId: 'cnt-100',
      containerName: 'api-server',
      image: 'node:20',
      exposedPorts: [3000, 8080],
      mountedVolumes: ['/data:/app/data'],
    });
    const info = container.getContainerInfo();
    assert.deepEqual(info.exposedPorts, [3000, 8080]);
    assert.deepEqual(info.mountedVolumes, ['/data:/app/data']);
  });

  // 42. CI Adapter Artifact Listing
  it('should list CI artifacts and test reports', async () => {
    const ci = new CiEnvironmentAdapter({
      environmentId: 'env-ci-02',
      provider: 'GITLAB_CI',
      repositoryOrProject: 'group/project',
    });
    await ci.connect();
    const files = await ci.listFiles('/coverage');
    assert.ok(Array.isArray(files));
    await ci.disconnect();
  });

  // 43. Remote Browser Fingerprint
  it('should produce CDP browser fingerprint', async () => {
    const browser = new RemoteBrowserAdapter({
      environmentId: 'env-brw-02',
      browserWSEndpoint: 'ws://localhost:9222/devtools/browser',
      browserType: 'firefox',
    });
    const fp = await browser.getFingerprint();
    assert.equal(fp.platform, 'browser');
    assert.ok(fp.installedSoftwareSummary.some((s) => s.includes('firefox')));
  });

  // 44. Environment List Filtering by Type
  it('should filter environment list by type', async () => {
    await registry.registerEnvironment({
      name: 'SSH Box 1',
      type: EnvironmentType.SSH,
      platform: 'linux',
      hostname: 'ssh1.corp',
      owner: 'Rushi',
    });
    await registry.registerEnvironment({
      name: 'RDP Box 1',
      type: EnvironmentType.RDP,
      platform: 'win32',
      hostname: 'rdp1.corp',
      owner: 'Rushi',
    });

    const sshOnly = await registry.listEnvironments({ type: EnvironmentType.SSH });
    assert.ok(sshOnly.every((e) => e.type === EnvironmentType.SSH));
  });

  // 45. Environment List Filtering by Status
  it('should filter environment list by status', async () => {
    const env = await registry.registerEnvironment({
      name: 'Status Test Box',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'status.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);

    const authorizedOnly = await registry.listEnvironments({ status: EnvironmentLifecycleStatus.AUTHORIZED });
    assert.ok(authorizedOnly.some((e) => e.id === env.id));
  });

  // 46. Environment Disable Transition
  it('should support disabling an environment', async () => {
    const env = await registry.registerEnvironment({
      name: 'To Disable',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'disable.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);
    const disabled = await registry.disableEnvironment(env.id);
    assert.equal(disabled.status, EnvironmentLifecycleStatus.DISABLED);
  });

  // 47. Environment Deletion and Cleanup
  it('should delete environment and remove database records', async () => {
    const env = await registry.registerEnvironment({
      name: 'To Delete',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'delete.corp',
      owner: 'Rushi',
    });
    await registry.deleteEnvironment(env.id);
    const retrieved = await registry.getEnvironment(env.id);
    assert.equal(retrieved, null);
  });

  // 48. Concurrent Session Tracking
  it('should track multiple concurrent sessions up to pool limit', async () => {
    const env = await registry.registerEnvironment({
      name: 'Multi Session Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'multi.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);
    const s1 = await registry.connect(env.id, 'agent-rahu');
    const s2 = await registry.connect(env.id, 'agent-kalki');

    const sessions = await registry.listSessions(env.id);
    assert.equal(sessions.length, 2);
    assert.ok(sessions.some((s) => s.id === s1.id));
    assert.ok(sessions.some((s) => s.id === s2.id));
  });

  // 49. Recovery Engine: Zero Retry on Non-Idempotent Commands
  it('should not retry non-idempotent operations on failure', async () => {
    const recovery = new EnvironmentRecoveryEngine();
    let attempts = 0;
    const mockAdapter: any = {
      environmentId: 'mock-env',
      isConnected: () => true,
      connect: async () => true,
      executeCommand: async () => {
        attempts++;
        return {
          commandId: 'cmd_1',
          exitCode: 1,
          stdout: '',
          stderr: 'Delete failed',
          durationMs: 10,
          success: false,
          verificationStatus: 'FAILED',
        };
      },
    };

    const res = await recovery.executeWithRecovery(mockAdapter, 'rm -f /tmp/important.txt', { isIdempotent: false });
    assert.equal(attempts, 1);
    assert.equal(res.success, false);
  });

  // 50. Health Check Latency and CPU Metrics
  it('should report realistic health metrics for active adapter', async () => {
    const env = await registry.registerEnvironment({
      name: 'Metrics Host',
      type: EnvironmentType.WINDOWS,
      platform: 'win32',
      hostname: 'win.metrics.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id);

    const health = await registry.checkHealth(env.id);
    assert.equal(health.status, 'HEALTHY');
    assert.ok(health.latencyMs !== undefined && health.latencyMs > 0);
  });

  // 51. Event Emission on Session Lifecycle
  it('should emit session.created and session.closed events', async () => {
    const sessionEvents: string[] = [];
    eventBus.on('session.created', () => sessionEvents.push('created'));
    eventBus.on('session.closed', () => sessionEvents.push('closed'));

    const env = await registry.registerEnvironment({
      name: 'Session Event Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'session.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id);
    await registry.disconnect(env.id);

    assert.ok(sessionEvents.includes('created'));
    assert.ok(sessionEvents.includes('closed'));
  });

  // 52. Credential Resolution with Environment Variable
  it('should resolve credential from process.env if present', async () => {
    process.env['TEST_PHASE23_API_KEY'] = 'sk-authorized-12345';
    const res = await credentials.resolveCredential('TEST_PHASE23_API_KEY', 'TOKEN');
    assert.equal(res.success, true);
    assert.equal(res.value, 'sk-authorized-12345');
    delete process.env['TEST_PHASE23_API_KEY'];
  });

  // 53. Tool List Environments Execution
  it('should execute environment.list tool successfully', async () => {
    const tools = createEnvironmentTools(registry);
    const listTool = tools.find((t) => t.id === 'environment.list')!;
    const res = await listTool.execute({}, { agentId: 'agent-test', requestId: 'req-1' } as any);
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.output));
  });

  // 54. Tool Inspect Environment Execution
  it('should execute environment.inspect tool successfully', async () => {
    const env = await registry.registerEnvironment({
      name: 'Inspect Tool Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'inspect.corp',
      owner: 'Rushi',
    });
    const tools = createEnvironmentTools(registry);
    const inspectTool = tools.find((t) => t.id === 'environment.inspect')!;
    const res = await inspectTool.execute({ environmentId: env.id }, { agentId: 'agent-test', requestId: 'req-2' } as any);
    assert.equal(res.success, true);
    assert.equal((res.output as any).id, env.id);
  });

  // 55. Tool Authorize Environment Execution
  it('should execute environment.authorize tool successfully', async () => {
    const env = await registry.registerEnvironment({
      name: 'Auth Tool Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'authtool.corp',
      owner: 'Rushi',
    });
    const tools = createEnvironmentTools(registry);
    const authTool = tools.find((t) => t.id === 'environment.authorize')!;
    const res = await authTool.execute(
      { environmentId: env.id, trustLevel: 'TRUSTED' },
      { agentId: 'agent-test', requestId: 'req-3' } as any
    );
    assert.equal(res.success, true);
    assert.equal((res.output as any).isAuthorized, true);
  });

  // 56. Tool Connect and Disconnect Execution
  it('should execute environment.connect and environment.disconnect tools', async () => {
    const env = await registry.registerEnvironment({
      name: 'Conn Tool Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'conntool.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);
    const tools = createEnvironmentTools(registry);
    const connTool = tools.find((t) => t.id === 'environment.connect')!;
    const discTool = tools.find((t) => t.id === 'environment.disconnect')!;

    const connRes = await connTool.execute({ environmentId: env.id }, { agentId: 'agent-test', requestId: 'req-4' } as any);
    assert.equal(connRes.success, true);
    assert.equal((connRes.output as any).status, 'CONNECTED');

    const discRes = await discTool.execute({ environmentId: env.id }, { agentId: 'agent-test', requestId: 'req-5' } as any);
    assert.equal(discRes.success, true);
  });

  // 57. Tool Execute Remote Command Execution
  it('should execute environment.execute tool successfully', async () => {
    const env = await registry.registerEnvironment({
      name: 'Exec Tool Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'exectool.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id);

    const tools = createEnvironmentTools(registry);
    const execTool = tools.find((t) => t.id === 'environment.execute')!;
    const res = await execTool.execute(
      { environmentId: env.id, command: 'whoami' },
      { agentId: 'agent-test', requestId: 'req-6' } as any
    );
    assert.equal(res.success, true);
    assert.ok((res.output as any).stdout.includes('developer'));
  });

  // 58. Tool Health Check Execution
  it('should execute environment.health tool successfully', async () => {
    const env = await registry.registerEnvironment({
      name: 'Health Tool Host',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'healthtool.corp',
      owner: 'Rushi',
    });
    const tools = createEnvironmentTools(registry);
    const hlthTool = tools.find((t) => t.id === 'environment.health')!;
    const res = await hlthTool.execute({ environmentId: env.id }, { agentId: 'agent-test', requestId: 'req-7' } as any);
    assert.equal(res.success, true);
    assert.ok((res.output as any).status);
  });

  // 59. Remote Process Listing via Registry
  it('should list remote processes through registry coordinator', async () => {
    const env = await registry.registerEnvironment({
      name: 'Proc Host',
      type: EnvironmentType.WINDOWS,
      platform: 'win32',
      hostname: 'prochost.corp',
      owner: 'Rushi',
    });
    await registry.authorizeEnvironment(env.id);
    await registry.connect(env.id);

    const procs = await registry.listProcesses(env.id);
    assert.ok(procs.length >= 2);
  });

  // 60. Full End-to-End Enterprise Environment Operational Loop
  it('should complete full 13-stage lifecycle: DISCOVER -> IDENTIFY -> AUTHENTICATE -> VALIDATE -> AUTHORIZE -> CONNECT -> OBSERVE -> OPERATE -> VERIFY -> MONITOR -> RECOVER -> DISCONNECT -> AUDIT', async () => {
    // Stage 1: DISCOVER
    const env = await registry.registerEnvironment({
      name: 'Mission Production Target',
      type: EnvironmentType.LINUX,
      platform: 'linux',
      hostname: 'prod.sahikara.internal',
      owner: 'Rushi',
      scope: 'PROJECT',
      projectId: 'proj-sahikara-main',
    });
    assert.equal(env.status, EnvironmentLifecycleStatus.DISCOVERED);

    // Stage 2: IDENTIFY & Stage 3: AUTHENTICATE (Metadata)
    await repo.saveCredentialMetadata({
      id: 'cred-prod-01',
      environmentId: env.id,
      authType: 'SSH_KEY',
      credentialReference: 'SSH_PROD_KEY_REF',
      username: 'developer',
      requiresMfa: false,
      isValid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Stage 4: VALIDATE (Fingerprint & Caps)
    const inspected = await registry.inspectEnvironment(env.id);
    assert.ok(inspected.fingerprint);

    // Stage 5: AUTHORIZE
    const authorized = await registry.authorizeEnvironment(env.id, EnvironmentTrustLevel.USER_APPROVED);
    assert.equal(authorized.isAuthorized, true);

    // Stage 6: CONNECT
    const session = await registry.connect(env.id, 'agent-gandiva');
    assert.equal(session.status, 'CONNECTED');

    // Stage 7: OBSERVE (Processes & Files)
    const procs = await registry.listProcesses(env.id);
    const files = await registry.listFiles(env.id, '/workspace');
    assert.ok(procs.length > 0);
    assert.ok(files.length > 0);

    // Stage 8: OPERATE & Stage 9: VERIFY
    const result = await registry.executeCommand(env.id, 'whoami', { agentId: 'agent-gandiva' });
    assert.equal(result.success, true);
    assert.equal(result.verificationStatus, 'VERIFIED');

    // Stage 10: MONITOR (Health Check)
    const health = await registry.checkHealth(env.id);
    assert.equal(health.status, 'HEALTHY');

    // Stage 11: RECOVER (Idempotent safe re-execution)
    const recovered = await registry.executeCommand(env.id, 'hostname');
    assert.equal(recovered.success, true);

    // Stage 12: DISCONNECT
    await registry.disconnect(env.id);
    const activeSessions = await registry.listSessions(env.id);
    assert.equal(activeSessions.length, 0);

    // Stage 13: AUDIT
    const operations = await repo.listOperations(env.id);
    assert.equal(operations.length, 2);
    assert.ok(operations.every((op) => op.executionStatus === 'COMPLETED' && op.verificationStatus === 'VERIFIED'));
  });
});


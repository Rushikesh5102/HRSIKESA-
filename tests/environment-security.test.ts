/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Security Subsystem Unit Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentSecurityValidator } from '../src/environment/security/environment.security.js';

describe('Environment Security Subsystem', () => {
  test('CRITICAL SECURITY: sanitizeQuery must reject shell injection meta-characters', () => {
    assert.throws(
      () => EnvironmentSecurityValidator.sanitizeQuery('notepad; dir'),
      /prohibited shell control characters/
    );

    assert.throws(
      () => EnvironmentSecurityValidator.sanitizeQuery('blender && rm -rf /'),
      /prohibited shell control characters/
    );

    assert.throws(
      () => EnvironmentSecurityValidator.sanitizeQuery('calc | evil'),
      /prohibited shell control characters/
    );

    assert.throws(
      () => EnvironmentSecurityValidator.sanitizeQuery('app`whoami`'),
      /prohibited shell control characters/
    );

    assert.throws(
      () => EnvironmentSecurityValidator.sanitizeQuery('app > out.txt'),
      /prohibited shell control characters/
    );

    assert.throws(
      () => EnvironmentSecurityValidator.sanitizeQuery('$HOME/bin'),
      /prohibited shell control characters/
    );

    // Valid query should pass
    const valid = EnvironmentSecurityValidator.sanitizeQuery('Visual Studio Code');
    assert.equal(valid, 'Visual Studio Code');
  });

  test('CRITICAL SECURITY: validatePackageId must enforce alphanumeric/dot format', () => {
    assert.throws(
      () => EnvironmentSecurityValidator.validatePackageId('Blender; evil'),
      /Invalid package ID format/
    );

    assert.throws(
      () => EnvironmentSecurityValidator.validatePackageId('../../hack'),
      /Invalid package ID format/
    );

    const validId = EnvironmentSecurityValidator.validatePackageId('BlenderFoundation.Blender');
    assert.equal(validId, 'BlenderFoundation.Blender');
  });

  test('CRITICAL SECURITY: validateExecutablePath must reject non-existent or invalid paths', () => {
    // Relative path
    assert.equal(EnvironmentSecurityValidator.validateExecutablePath('notepad.exe'), false);

    // Non-existent path
    assert.equal(EnvironmentSecurityValidator.validateExecutablePath('C:\\NonExistentPath\\evil.exe'), false);

    // Non-executable file extension
    assert.equal(EnvironmentSecurityValidator.validateExecutablePath('C:\\Windows\\win.ini'), false);

    // Valid Windows executable
    assert.equal(EnvironmentSecurityValidator.validateExecutablePath('C:\\Windows\\System32\\notepad.exe'), true);
  });

  test('CRITICAL SECURITY: isProtectedProcess must protect system-critical processes from termination', () => {
    // PID 0 (System Idle)
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(0), true);

    // PID 4 (System)
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(4), true);

    // System processes
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(999, 'csrss.exe'), true);
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(999, 'explorer.exe'), true);
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(999, 'svchost.exe'), true);
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(999, 'lsass.exe'), true);
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(999, 'dwm.exe'), true);

    // Current Node process
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(process.pid), true);

    // Safe user process
    assert.equal(EnvironmentSecurityValidator.isProtectedProcess(8888, 'custom_app.exe'), false);
  });

  test('CRITICAL SECURITY: redactArguments must redact passwords and API keys', () => {
    const rawArgs = [
      '--user', 'rushikesh',
      '--password', 'SecretPass123!',
      '--token=sk-proj-9999999999',
      '--key', 'ghp_abc123456789',
      '--file', 'render.blend'
    ];

    const redacted = EnvironmentSecurityValidator.redactArguments(rawArgs);

    assert.equal(redacted[0], '--user');
    assert.equal(redacted[1], 'rushikesh');
    assert.equal(redacted[2], '--password');
    assert.equal(redacted[3], '[REDACTED]');
    assert.equal(redacted[4], '--token=[REDACTED]');
    assert.equal(redacted[5], '--key');
    assert.equal(redacted[6], '[REDACTED]');
    assert.equal(redacted[7], '--file');
    assert.equal(redacted[8], 'render.blend');
  });
});

/**
 * HṚṢĪKEŚA (हृषीकेश) — Security Intelligence Analyzer
 *
 * Static security heuristics inspecting source files, package manifests,
 * GitHub Actions workflows, and Dockerfiles for potential attack indicators.
 */

import { SecurityFinding } from '../types/github.types.js';

export class SecurityAnalyzer {
  /**
   * Statically inspects a map of repository files (path -> content).
   */
  public static inspectRepositoryFiles(
    repositoryId: string,
    fileMap: Map<string, string>
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (const [filePath, content] of fileMap.entries()) {
      const lowerPath = filePath.toLowerCase();

      // 1. Dockerfile Analysis
      if (lowerPath.includes('dockerfile')) {
        SecurityAnalyzer.inspectDockerfile(repositoryId, filePath, content, findings);
      }

      // 2. GitHub Actions Workflows Analysis
      if (lowerPath.includes('.github/workflows/')) {
        SecurityAnalyzer.inspectWorkflow(repositoryId, filePath, content, findings);
      }

      // 3. Source Code Heuristics
      SecurityAnalyzer.inspectSourceCode(repositoryId, filePath, content, findings);
    }

    return findings;
  }

  private static inspectDockerfile(
    repositoryId: string,
    filePath: string,
    content: string,
    findings: SecurityFinding[]
  ): void {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('USER root') || (trimmed.startsWith('USER 0'))) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'CONTAINER_PRIVILEGE',
          indicator: 'Container runs explicitly as root',
          evidence: trimmed,
          filePath,
          lineNumber: i + 1,
          severity: 'MEDIUM',
          confidence: 'HIGH',
          createdAt: new Date().toISOString(),
        });
      }

      if (trimmed.includes('--privileged') || trimmed.includes('/var/run/docker.sock')) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'CONTAINER_ESCAPE_RISK',
          indicator: 'Privileged container configuration or docker socket mount',
          evidence: trimmed,
          filePath,
          lineNumber: i + 1,
          severity: 'HIGH',
          confidence: 'HIGH',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  private static inspectWorkflow(
    repositoryId: string,
    filePath: string,
    content: string,
    findings: SecurityFinding[]
  ): void {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('${{ secrets.') && (line.includes('curl ') || line.includes('wget '))) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'WORKFLOW_SECRET_EXFILTRATION',
          indicator: 'Workflow references secret in outbound HTTP request',
          evidence: line.trim(),
          filePath,
          lineNumber: i + 1,
          severity: 'HIGH',
          confidence: 'MEDIUM',
          createdAt: new Date().toISOString(),
        });
      }

      if (line.includes('| bash') || line.includes('| sh')) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'UNTRUSTED_PIPED_EXECUTION',
          indicator: 'Workflow curl|sh execution / piped remote script directly to shell',
          evidence: line.trim(),
          filePath,
          lineNumber: i + 1,
          severity: 'HIGH',
          confidence: 'HIGH',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  private static inspectSourceCode(
    repositoryId: string,
    filePath: string,
    content: string,
    findings: SecurityFinding[]
  ): void {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Credential harvesting patterns
      if (
        line.includes('/.aws/credentials') ||
        line.includes('/.ssh/id_rsa') ||
        line.includes('/etc/shadow') ||
        line.includes('AppData\\Roaming\\Mozilla') ||
        line.includes('Login Data') // Chrome passwords
      ) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'CREDENTIAL_HARVESTING',
          indicator: 'Reference to sensitive credential path in source code (AWS credentials / SSH keys)',
          evidence: line.trim().slice(0, 150),
          filePath,
          lineNumber: i + 1,
          severity: 'CRITICAL',
          confidence: 'HIGH',
          createdAt: new Date().toISOString(),
        });
      }

      // Suspicious reverse shell / netcat execution
      if (
        line.includes('nc -e') ||
        line.includes('/bin/sh -i') ||
        line.includes('bash -i >& /dev/tcp/') ||
        line.includes('connect((') ||
        line.includes('socket.connect')
      ) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'REVERSE_SHELL',
          indicator: 'Reverse shell signature detected',
          evidence: line.trim().slice(0, 150),
          filePath,
          lineNumber: i + 1,
          severity: 'CRITICAL',
          confidence: 'HIGH',
          createdAt: new Date().toISOString(),
        });
      }

      // Dynamic code download and execution
      if (
        (line.includes('eval(') && (line.includes('fetch(') || line.includes('http'))) ||
        (line.includes('exec(') && line.includes('curl '))
      ) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'DYNAMIC_CODE_EXECUTION',
          indicator: 'Dynamic code download evaluated directly in process',
          evidence: line.trim().slice(0, 150),
          filePath,
          lineNumber: i + 1,
          severity: 'CRITICAL',
          confidence: 'HIGH',
          createdAt: new Date().toISOString(),
        });
      }

      // Destructive filesystem operations
      if (line.includes('rm -rf /') || line.includes('rmdir /s /q c:\\')) {
        findings.push({
          id: `sec_${repositoryId}_${findings.length + 1}`,
          repositoryId,
          category: 'DESTRUCTIVE_FILESYSTEM',
          indicator: 'Root directory destruction command detected',
          evidence: line.trim().slice(0, 150),
          filePath,
          lineNumber: i + 1,
          severity: 'CRITICAL',
          confidence: 'HIGH',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }
}

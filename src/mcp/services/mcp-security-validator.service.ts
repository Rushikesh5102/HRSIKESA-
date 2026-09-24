/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Security Validator Service
 *
 * Phase 21: Static security inspection, command sanitation, secret screening,
 * prompt injection defense, and danger tier classification.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { MCPServer, MCPSecurityReview } from '../interfaces/mcp.types.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';

export class MCPSecurityValidator {
  private readonly logger?: ILogger;

  // Suspicious command / shell patterns
  private readonly DANGEROUS_PATTERNS = [
    /\brm\s+-rf\b/i,
    /\bdel\s+\/[fqsb]+\b/i,
    /\bformat\s+[a-z]:/i,
    /\bmkfs\b/i,
    /\bcurl\b.*\|\s*(?:bash|sh|powershell|cmd)\b/i,
    /\bwget\b.*\|\s*(?:bash|sh|powershell|cmd)\b/i,
    /\bpowershell\b.*-(?:enc|encodedcommand)\b/i,
    /\b(?:nc|netcat)\b.*-e\b/i,
    /\bchmod\s+777\b/i,
    /\b(?:reg\s+add|reg\s+delete)\b/i,
    /\bshutdown\b.*\/[srf]/i,
  ];

  // Secret leak patterns
  private readonly SECRET_PATTERNS = [
    /(?:sk-[a-zA-Z0-9_-]{20,})/i,
    /(?:ghp_[a-zA-Z0-9]{36})/i,
    /(?:xox[baprs]-[0-9a-zA-Z]{10,})/i,
    /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i,
    /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i,
    /(?:password|passwd|secret|api_key|token)\s*[:=]\s*['"][^'"]{6,}['"]/i,
  ];

  constructor(logger?: ILogger) {
    this.logger = logger?.child('MCPSecurityValidator');
  }

  /**
   * Statically inspects an MCP server configuration before authorization.
   */
  public inspectServer(server: Partial<MCPServer>): MCPSecurityReview {
    const findings: Array<{
      type?: string;
      severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      category: string;
      description: string;
      remediation?: string;
    }> = [];

    let riskScore = 1.0; // Base score

    // 1. Inspect command and arguments
    const cmd = server.command || '';
    const args = (server.args || []).join(' ');
    const fullInvocation = `${cmd} ${args}`.trim();

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(fullInvocation)) {
        findings.push({
          type: 'DANGEROUS_COMMAND_PATTERN',
          severity: 'CRITICAL',
          category: 'COMMAND_INSPECTION',
          description: `Detected dangerous shell pattern matching ${pattern.toString()} in server command.`,
          remediation: 'Remove arbitrary destructive shell invocations and use isolated binary paths.',
        });
        riskScore += 4.0;
      }
    }

    // 2. Inspect environment variables for plaintext secrets
    if (server.envMetadata) {
      for (const [key, val] of Object.entries(server.envMetadata)) {
        for (const pattern of this.SECRET_PATTERNS) {
          if (pattern.test(val) || pattern.test(key)) {
            findings.push({
              type: 'SECRET_IN_ENV_METADATA',
              severity: 'CRITICAL',
              category: 'SECRET_EXPOSURE',
              description: `Plaintext secret or API key pattern detected in environment variable '${key}'.`,
              remediation: 'Do not persist secret values in server metadata; use environment variable injection at runtime.',
            });
            riskScore += 3.5;
          }
        }
      }
    }

    // 3. Inspect transport
    if (server.transport === 'http') {
      if (server.endpoint && !server.endpoint.startsWith('https://') && !server.endpoint.startsWith('http://localhost') && !server.endpoint.startsWith('http://127.0.0.1')) {
        findings.push({
          type: 'INSECURE_HTTP_ENDPOINT',
          severity: 'HIGH',
          category: 'TRANSPORT_SECURITY',
          description: `Remote HTTP transport without TLS (HTTPS) detected on endpoint: ${server.endpoint}`,
          remediation: 'Enforce HTTPS for all remote non-localhost endpoints.',
        });
        riskScore += 2.5;
      } else {
        findings.push({
          type: 'HTTP_ENDPOINT_CONFIGURED',
          severity: 'INFO',
          category: 'TRANSPORT_SECURITY',
          description: `HTTP transport configured with endpoint: ${server.endpoint}`,
        });
      }
    }

    // 4. Source & Trust checks
    if (!server.source || server.source === 'UNKNOWN') {
      findings.push({
        type: 'UNKNOWN_SOURCE',
        severity: 'MEDIUM',
        category: 'SOURCE_PROVENANCE',
        description: 'Server source origin is unregistered or unknown.',
        remediation: 'Declare authoritative repository origin or official registry source.',
      });
      riskScore += 1.0;
    }

    // Determine decision
    const hasCritical = findings.some((f) => f.severity === 'CRITICAL');
    const hasHigh = findings.some((f) => f.severity === 'HIGH');
    let decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL' = 'APPROVED';

    if (hasCritical) {
      decision = 'REJECTED';
    } else if (hasHigh || riskScore > 4.0) {
      decision = 'CONDITIONAL';
    }

    const review: MCPSecurityReview = {
      id: `review-${Date.now()}`,
      serverId: server.id || 'unknown',
      reviewedAt: new Date().toISOString(),
      reviewer: 'SYSTEM_SECURITY_SCANNER',
      findings,
      riskScore: Math.min(10.0, Math.round(riskScore * 10) / 10),
      decision,
      notes: hasCritical
        ? 'Automatic rejection due to dangerous shell patterns or plaintext secrets.'
        : 'Static inspection completed without blocking vulnerabilities.',
    };

    this.logger?.info(`Inspected MCP server '${server.name || server.id}': RiskScore=${review.riskScore}, Decision=${review.decision}`);
    return review;
  }

  /**
   * Classifies tool risk into appropriate DangerTier.
   */
  public classifyToolRisk(tool: {
    name: string;
    description?: string;
    networkRequirement?: string;
    filesystemRequirement?: string;
    credentialRequirement?: string;
    isDestructive?: boolean;
  }): DangerTier {
    const text = `${tool.name} ${tool.description || ''}`.toLowerCase().replace(/_/g, ' ');

    if (
      text.includes('delete database') ||
      text.includes('delete table') ||
      text.includes('drop database') ||
      text.includes('drop table') ||
      text.includes('format disk') ||
      text.includes('rm -rf')
    ) {
      return DangerTier.TIER_4; // Critical destructive operation
    }

    if (
      tool.isDestructive ||
      text.includes('delete') ||
      text.includes('remove') ||
      text.includes('drop') ||
      text.includes('format') ||
      text.includes('destroy')
    ) {
      return DangerTier.TIER_3; // Destructive action requires approval
    }

    if (
      tool.networkRequirement === 'OUTBOUND' ||
      tool.networkRequirement === 'INBOUND' ||
      tool.credentialRequirement === 'API_KEY' ||
      tool.credentialRequirement === 'OAUTH' ||
      tool.filesystemRequirement === 'WRITE' ||
      tool.filesystemRequirement === 'FULL' ||
      text.includes('write') ||
      text.includes('create') ||
      text.includes('modify') ||
      text.includes('send') ||
      text.includes('post') ||
      text.includes('execute')
    ) {
      return DangerTier.TIER_1; // Modifying but safe autonomous operation
    }

    return DangerTier.TIER_0; // Read-only safe inspection
  }

  /**
   * Sanitizes external prompt templates and resource contents to prevent prompt injection.
   */
  public sanitizeContent(content: string): string {
    if (!content) return '';

    // Defang common prompt injection vectors
    return content
      .replace(/ignore\s+(?:all\s+)?(?:previous\s+)?(?:rules|instructions)/gi, '[DEFANGED_INSTRUCTION: Ignored]')
      .replace(/system\s+override/gi, '[DEFANGED_OVERRIDE]')
      .replace(/reveal\s+(?:all\s+)?(?:credentials|secrets|api\s*keys|passwords)/gi, '[DEFANGED_EXFILTRATION]');
  }

  /**
   * Redacts secrets from data objects and strings.
   */
  public redactSecrets(value: string): string {
    if (!value) return '';
    let sanitized = value;
    for (const pattern of this.SECRET_PATTERNS) {
      sanitized = sanitized.replace(new RegExp(pattern, 'gi'), '[REDACTED_SECRET]');
    }
    return sanitized;
  }
}

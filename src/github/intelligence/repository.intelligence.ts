/**
 * HṚṢĪKEŚA (हृषीकेश) — Repository Intelligence Service
 *
 * Derives architecture classification, activity metrics, release status,
 * compatibility assessments, resource estimations, and defanged README summaries.
 */

import {
  GitHubRepository,
  RepositoryIntelligence,
  ArchitectureType,
  ActivityStatus,
  CompatibilityAssessment,
  ResourceEstimate,
  ReadmeAnalysis,
} from '../types/github.types.js';
import { LicenseAnalyzer } from './license.analyzer.js';

export class RepositoryIntelligenceService {
  /**
   * Performs end-to-end intelligence analysis for a repository.
   */
  public static analyzeRepository(
    repo: GitHubRepository,
    readmeText?: string,
    fileNames: string[] = [],
    packageJsonText?: string,
    releases: any[] = []
  ): RepositoryIntelligence {
    const license = LicenseAnalyzer.analyzeLicense(repo.licenseSpdx || repo.licenseName);
    const architecture = RepositoryIntelligenceService.classifyArchitecture(repo, fileNames, packageJsonText, readmeText);
    const activity = RepositoryIntelligenceService.evaluateActivity(repo, releases);
    const release = RepositoryIntelligenceService.evaluateReleases(releases);
    const compatibility = RepositoryIntelligenceService.evaluateCompatibility(repo, architecture, fileNames);
    const resourceEstimate = RepositoryIntelligenceService.estimateResources(repo, architecture);
    const readme = RepositoryIntelligenceService.extractReadmeIntelligence(readmeText);

    return {
      repositoryId: repo.id,
      architecture,
      license,
      activity,
      release,
      compatibility,
      resourceEstimate,
      readme,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Infers repository architecture type based on structure and manifest declarations.
   */
  public static classifyArchitecture(
    repo: GitHubRepository,
    fileNames: string[],
    packageJsonText?: string,
    readmeText?: string
  ): ArchitectureType {
    const combinedText = `${repo.name} ${repo.description} ${readmeText || ''}`.toLowerCase();

    // 1. Model Context Protocol (MCP) Server
    if (
      combinedText.includes('modelcontextprotocol') ||
      combinedText.includes('mcp server') ||
      (packageJsonText && packageJsonText.includes('@modelcontextprotocol/sdk'))
    ) {
      return 'MCP_SERVER';
    }

    // 2. Browser Extension
    if (fileNames.some((f) => f.toLowerCase() === 'manifest.json') && combinedText.includes('extension')) {
      return 'BROWSER_EXTENSION';
    }

    // 3. AI / ML Model
    if (
      combinedText.includes('gguf') ||
      combinedText.includes('safetensors') ||
      combinedText.includes('pytorch') ||
      combinedText.includes('transformer') ||
      fileNames.some((f) => f.endsWith('.gguf') || f.endsWith('.safetensors') || f.endsWith('.onnx'))
    ) {
      return 'AI_MODEL';
    }

    // 4. CLI Tool
    if (
      fileNames.some((f) => f.startsWith('bin/') || f === 'cli.js' || f === 'main.go') ||
      (packageJsonText && packageJsonText.includes('"bin"')) ||
      combinedText.includes('command line') ||
      combinedText.includes('cli tool')
    ) {
      return 'CLI';
    }

    // 5. Workflow / Orchestration Engine
    if (combinedText.includes('workflow engine') || combinedText.includes('pipeline orchestrator') || combinedText.includes('dag')) {
      return 'WORKFLOW_ENGINE';
    }

    // 6. Web / Desktop Application
    if (combinedText.includes('electron') || combinedText.includes('tauri') || combinedText.includes('desktop app')) {
      return 'DESKTOP_APP';
    }
    if (combinedText.includes('react') || combinedText.includes('vue') || combinedText.includes('next.js') || combinedText.includes('web app')) {
      return 'WEB_APP';
    }

    // 7. Server / Backend
    if (
      combinedText.includes('api server') ||
      combinedText.includes('microservice') ||
      (packageJsonText && (packageJsonText.includes('express') || packageJsonText.includes('fastify')))
    ) {
      return 'SERVER';
    }

    // 8. SDK / Library
    if (combinedText.includes('sdk') || combinedText.includes('client library')) {
      return 'SDK';
    }

    return 'LIBRARY';
  }

  /**
   * Assesses repository activity recency and commit cadence.
   */
  public static evaluateActivity(
    repo: GitHubRepository,
    releases: any[] = []
  ): { status: ActivityStatus; lastPushDaysAgo: number; openIssuesCount: number; commitFrequencyScore: number } {
    if (repo.archived) {
      return {
        status: 'ARCHIVED',
        lastPushDaysAgo: 999,
        openIssuesCount: repo.openIssues,
        commitFrequencyScore: 0,
      };
    }

    const lastPush = repo.pushedAt ? new Date(repo.pushedAt).getTime() : new Date(repo.updatedAt).getTime();
    const daysSincePush = Math.max(0, Math.floor((Date.now() - lastPush) / (1000 * 60 * 60 * 24)));

    let status: ActivityStatus = 'ACTIVE';
    if (daysSincePush > 365) {
      status = 'STALE_RELEASE';
    } else if (releases.length === 0 && daysSincePush > 180) {
      status = 'NO_RELEASES';
    }

    // Rough score from 0 to 100 based on recency and issues
    const commitFrequencyScore = Math.max(0, Math.min(100, Math.floor(100 - daysSincePush / 3.65)));

    return {
      status,
      lastPushDaysAgo: daysSincePush,
      openIssuesCount: repo.openIssues,
      commitFrequencyScore,
    };
  }

  /**
   * Analyzes release history.
   */
  public static evaluateReleases(releases: any[]): { latestTag?: string; releaseDate?: string; isPreRelease?: boolean; releaseNotes?: string } {
    if (!Array.isArray(releases) || releases.length === 0) {
      return {};
    }

    const latest = releases[0];
    return {
      latestTag: latest.tag_name || latest.name,
      releaseDate: latest.published_at || latest.created_at,
      isPreRelease: Boolean(latest.prerelease),
      releaseNotes: typeof latest.body === 'string' ? latest.body.slice(0, 500) : undefined,
    };
  }

  /**
   * Evaluates hardware and OS compatibility against the HṚṢĪKEŚA platform.
   */
  public static evaluateCompatibility(
    repo: GitHubRepository,
    _arch: ArchitectureType,
    _fileNames: string[]
  ): CompatibilityAssessment {
    const reasons: string[] = [];
    let nodeCompatible = true;
    let pythonCompatible = true;
    let osCompatible = true;
    let hardwareFeasible = true;

    // Check for explicit non-Windows Linux kernel modules (eBPF, /proc, etc.)
    const lowerText = `${repo.name} ${repo.description}`.toLowerCase();
    if (lowerText.includes('ebpf') || lowerText.includes('linux kernel module') || lowerText.includes('systemd-only')) {
      osCompatible = false;
      reasons.push('Linux-specific kernel features (eBPF / systemd) not compatible with Windows host.');
    }

    // Check if huge repository size exceeds development machine RAM
    if (repo.sizeKb > 5000000) { // 5 GB
      hardwareFeasible = false;
      reasons.push('Repository size exceeds 5 GB; exceeds reasonable local disk/memory budget.');
    }

    let status: 'COMPATIBLE' | 'PARTIAL' | 'INCOMPATIBLE' = 'COMPATIBLE';
    if (!osCompatible || !hardwareFeasible) {
      status = 'INCOMPATIBLE';
    } else if (reasons.length > 0) {
      status = 'PARTIAL';
    }

    return {
      status,
      nodeCompatible,
      pythonCompatible,
      osCompatible,
      hardwareFeasible,
      reasons,
    };
  }

  /**
   * Estimates computational resources needed for build, test, and execution.
   */
  public static estimateResources(repo: GitHubRepository, arch: ArchitectureType): ResourceEstimate {
    const diskMb = Math.max(10, Math.ceil(repo.sizeKb / 1024) * 2); // 2x for build artifacts
    let ramMb = 256;
    let cpu: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let gpu = false;
    let estimatedBuildTimeSec = 15;

    if (arch === 'AI_MODEL') {
      ramMb = 2048;
      cpu = 'HIGH';
      gpu = true;
      estimatedBuildTimeSec = 120;
    } else if (arch === 'SERVER' || arch === 'WEB_APP') {
      ramMb = 512;
      cpu = 'MEDIUM';
      estimatedBuildTimeSec = 45;
    } else if (arch === 'CLI' || arch === 'MCP_SERVER') {
      ramMb = 256;
      cpu = 'LOW';
      estimatedBuildTimeSec = 20;
    }

    return {
      diskMb,
      ramMb,
      cpu,
      gpu,
      estimatedBuildTimeSec,
    };
  }

  /**
   * Extracts README features and neutralizes potential prompt injections.
   */
  public static extractReadmeIntelligence(readmeText?: string): ReadmeAnalysis {
    if (!readmeText) {
      return {
        features: [],
        requirements: [],
        defangedSummary: 'No README documentation provided.',
      };
    }

    // Defang prompt injection attempts: neutralize directives targeting LLMs
    let defanged = readmeText
      .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[DEFANGED_PROMPT_INJECTION]')
      .replace(/system\s+prompt/gi, '[DEFANGED_PROMPT_KEYWORD]')
      .replace(/you\s+are\s+now/gi, '[DEFANGED_ROLE_OVERRIDE]');

    // Extract basic feature lines (bullet points)
    const lines = defanged.split('\n');
    const features: string[] = [];
    const requirements: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('- ') || trimmed.startsWith('* ')) && trimmed.length > 5 && trimmed.length < 120) {
        if (features.length < 10) {
          features.push(trimmed.slice(2));
        }
      }
      if (trimmed.toLowerCase().includes('node') || trimmed.toLowerCase().includes('python') || trimmed.toLowerCase().includes('prerequisite')) {
        if (requirements.length < 5) {
          requirements.push(trimmed.slice(0, 100));
        }
      }
    }

    return {
      features,
      requirements,
      defangedSummary: defanged.slice(0, 1000),
    };
  }

  public static analyzeActivity(repo: GitHubRepository, releases: any[] = []) {
    return RepositoryIntelligenceService.evaluateActivity(repo, releases);
  }

  public static analyzeReleases(releases: any[]) {
    return RepositoryIntelligenceService.evaluateReleases(releases);
  }

  public static analyzeReadme(readmeText?: string) {
    return RepositoryIntelligenceService.extractReadmeIntelligence(readmeText);
  }
}

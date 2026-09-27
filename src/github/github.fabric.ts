/**
 * HṚṢĪKEŚA (हृषीकेश) — GitHub & Open-Source Intelligence Fabric
 *
 * Master coordinator unifying repository search, intelligence analysis,
 * license compatibility, supply-chain security heuristics, sandbox acquisition/build/test,
 * FP-07 Capability Fabric integration, Knowledge Graph linkage, and real-time EventBus telemetry.
 */

import { DatabaseManager } from '../persistence/database/database.manager.js';
import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { UniversalCapabilityFabric } from '../capabilities/fabric/universal.capability.fabric.js';
import { UniversalCapability } from '../capabilities/fabric/capability.types.js';
import { KnowledgeEntityRepository } from '../knowledge/repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../knowledge/repositories/knowledge-relationship.repository.js';
import { ResearchEngine } from '../research/engine/research.engine.js';

import { GitHubClient } from './client/github.client.js';
import { GitHubIntelligenceRepository } from './repository/github.repository.js';
import { GitHubRepositorySearchService } from './services/github.search.service.js';
import { RepositoryComparisonService } from './services/repository.comparison.service.js';
import { SandboxManager, SandboxExecutionResult } from './sandbox/sandbox.manager.js';
import { CapabilityIntegrator } from './integration/capability.integrator.js';
import { GitHubConnector } from './connectors/github.connector.js';
import { DependencyAnalyzer } from './intelligence/dependency.analyzer.js';
import { SecurityAnalyzer } from './intelligence/security.analyzer.js';
import { RepositoryIntelligenceService } from './intelligence/repository.intelligence.js';

import {
  CandidateComparisonResult,
  DependencyRecord,
  GitHubRateLimitInfo,
  GitHubRepository,
  GitHubSearchCriteria,
  IntegrationProposal,
  RepositoryAcquisition,
  RepositoryIntelligence,
  RepositoryProvenance,
  SecurityFinding,
} from './types/github.types.js';

export interface GitHubFabricOptions {
  readonly dbManager: DatabaseManager;
  readonly fabric: UniversalCapabilityFabric;
  readonly eventBus?: EventBus;
  readonly resourceGovernor?: ResourceGovernor;
  readonly knowledgeEntityRepo?: KnowledgeEntityRepository;
  readonly knowledgeRelationshipRepo?: KnowledgeRelationshipRepository;
  readonly researchEngine?: ResearchEngine;
  readonly githubToken?: string;
  readonly sandboxDir?: string;
  readonly logger?: ILogger;
}

export class GitHubFabric {
  private readonly client: GitHubClient;
  private readonly repository: GitHubIntelligenceRepository;
  private readonly searchService: GitHubRepositorySearchService;
  private readonly sandboxManager: SandboxManager;
  private readonly integrator: CapabilityIntegrator;
  private readonly connector: GitHubConnector;
  private readonly fabric: UniversalCapabilityFabric;

  private readonly eventBus?: EventBus;
  private readonly resourceGovernor?: ResourceGovernor;
  private readonly knowledgeEntityRepo?: KnowledgeEntityRepository;
  private readonly knowledgeRelationshipRepo?: KnowledgeRelationshipRepository;
  private readonly researchEngine?: ResearchEngine;
  private readonly logger?: ILogger;

  constructor(options: GitHubFabricOptions) {
    this.logger = options.logger?.child('GitHubFabric');
    this.fabric = options.fabric;
    this.eventBus = options.eventBus;
    this.resourceGovernor = options.resourceGovernor;
    this.knowledgeEntityRepo = options.knowledgeEntityRepo;
    this.knowledgeRelationshipRepo = options.knowledgeRelationshipRepo;
    this.researchEngine = options.researchEngine;

    // Check token from options or environment
    const token = options.githubToken || process.env.GITHUB_TOKEN;

    this.client = new GitHubClient({
      token,
      logger: this.logger,
    });

    this.repository = new GitHubIntelligenceRepository(options.dbManager, this.logger);
    this.searchService = new GitHubRepositorySearchService(this.client, this.repository, this.logger);
    this.sandboxManager = new SandboxManager(this.repository, options.sandboxDir, this.resourceGovernor, this.logger);
    this.integrator = new CapabilityIntegrator(options.fabric, this.repository, this.logger);
    this.connector = new GitHubConnector(this.client);

    // Register connector into UniversalCapabilityFabric
    options.fabric.getConnectorRegistry().register(this.connector);
  }

  public async initialize(): Promise<void> {
    try {
      this.fabric.getConnectorRegistry().register(this.connector);
    } catch {
      // Already registered
    }
  }

  public getClient(): GitHubClient {
    return this.client;
  }

  public getRepositoryStore(): GitHubIntelligenceRepository {
    return this.repository;
  }

  public getSandboxManager(): SandboxManager {
    return this.sandboxManager;
  }

  public getIntegrator(): CapabilityIntegrator {
    return this.integrator;
  }

  public getRateLimit(): GitHubRateLimitInfo {
    return this.client.getRateLimitInfo();
  }

  /**
   * Search for open-source candidate repositories.
   */
  public async search(criteria: GitHubSearchCriteria): Promise<GitHubRepository[]> {
    const query = criteria.query || criteria.capabilityNeed || '';
    if (this.eventBus) {
      this.eventBus.emit('github.search.started', { query, timestamp: new Date().toISOString() });
    }

    const repos = await this.searchService.search(criteria);

    if (this.eventBus) {
      this.eventBus.emit('github.search.completed', { query, count: repos.length, timestamp: new Date().toISOString() });
      for (const repo of repos) {
        this.eventBus.emit('github.repository.discovered', {
          repositoryId: repo.id,
          fullName: repo.fullName,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return repos;
  }

  /**
   * Retrieves a repository by owner and name, querying remote if needed.
   */
  public async getRepository(owner: string, repoName: string): Promise<GitHubRepository> {
    const fullName = `${owner}/${repoName}`;
    const cached = this.repository.getRepository(fullName);
    if (cached) {
      return cached;
    }

    const remoteRepo = await this.client.getRepository(owner, repoName);
    this.repository.saveRepository(remoteRepo);
    await this.syncWithKnowledgeGraph(remoteRepo);
    return remoteRepo;
  }

  /**
   * End-to-end repository intelligence analysis.
   */
  public async analyzeRepository(
    owner: string,
    repoName: string,
    options: { forceRemote?: boolean } = {}
  ): Promise<{
    repository: GitHubRepository;
    intelligence: RepositoryIntelligence;
    dependencies: DependencyRecord[];
    securityFindings: SecurityFinding[];
  }> {
    const fullName = `${owner}/${repoName}`;
    let repo = this.repository.getRepository(fullName);

    if (!repo || options.forceRemote) {
      repo = await this.getRepository(owner, repoName);
    }

    if (this.eventBus) {
      this.eventBus.emit('github.repository.analysis_started', {
        repositoryId: repo.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Retrieve file list and README
    let readmeText = '';
    const fileMap = new Map<string, string>();
    const fileNames: string[] = [];
    let releases: any[] = [];
    let languages: Record<string, number> = {};

    try {
      readmeText = await this.client.getReadme(owner, repoName);
    } catch {
      // README optional
    }

    try {
      releases = await this.client.getReleases(owner, repoName, 5);
      languages = await this.client.getLanguages(owner, repoName);
    } catch {
      // Releases/languages optional
    }

    // Retrieve root directory contents
    try {
      const contents = await this.client.getContents(owner, repoName, '');
      if (Array.isArray(contents)) {
        for (const item of contents) {
          fileNames.push(item.name);
          if (['package.json', 'requirements.txt', 'cargo.toml', 'dockerfile'].includes(item.name.toLowerCase())) {
            try {
              const fileContent = await this.client.getFile(owner, repoName, item.name);
              fileMap.set(item.name, fileContent);
            } catch {
              // Ignored
            }
          }
        }
      }
    } catch {
      // Contents fallback
    }

    // Update repository with retrieved languages
    if (Object.keys(languages).length > 0) {
      repo = { ...repo, languages };
      this.repository.saveRepository(repo);
    }

    // Execute specialized static intelligence analyzers
    const intelligence = RepositoryIntelligenceService.analyzeRepository(
      repo,
      readmeText,
      fileNames,
      fileMap.get('package.json'),
      releases
    );

    const depAnalysis = DependencyAnalyzer.analyzeDependencies(repo.id, fileMap);
    const secFindings = SecurityAnalyzer.inspectRepositoryFiles(repo.id, fileMap);

    // Persist analysis findings
    this.repository.saveAnalysis(intelligence);
    this.repository.saveDependencies(repo.id, depAnalysis.dependencies);
    this.repository.saveSecurityFindings(repo.id, secFindings);

    // Sync into Knowledge Graph
    await this.syncWithKnowledgeGraph(repo);

    if (this.eventBus) {
      this.eventBus.emit('github.repository.analysis_completed', {
        repositoryId: repo.id,
        architecture: intelligence.architecture,
        license: intelligence.license.spdx,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      repository: repo,
      intelligence,
      dependencies: depAnalysis.dependencies,
      securityFindings: secFindings,
    };
  }

  /**
   * Acquires a repository into a secure sandbox.
   */
  public async acquire(
    owner: string,
    repoName: string,
    options: { acquiredBy?: string; companyId?: string; projectId?: string; ref?: string } = {}
  ): Promise<RepositoryAcquisition> {
    const repo = await this.getRepository(owner, repoName);

    if (this.eventBus) {
      this.eventBus.emit('github.acquisition.started', {
        repositoryId: repo.id,
        targetPath: `data/repository-sandbox/${repo.id}/source`,
        timestamp: new Date().toISOString(),
      });
    }

    const acq = await this.sandboxManager.acquireRepository(repo, options);

    if (this.eventBus) {
      this.eventBus.emit('github.acquisition.completed', {
        repositoryId: repo.id,
        commitSha: acq.commitSha,
        timestamp: new Date().toISOString(),
      });
    }

    return acq;
  }

  public async acquireRepository(
    owner: string,
    repoName: string,
    options: { branch?: string; shallow?: boolean; acquiredBy?: string; companyId?: string; projectId?: string; ref?: string } = {}
  ): Promise<RepositoryAcquisition> {
    return this.acquire(owner, repoName, {
      ...options,
      ref: options.branch || options.ref,
    });
  }

  /**
   * Executes sandboxed build.
   */
  public async build(repositoryId: string, command: string = 'npm run build', timeoutMs: number = 60000): Promise<SandboxExecutionResult> {
    if (this.eventBus) {
      this.eventBus.emit('github.build.started', { repositoryId, buildCommand: command, timestamp: new Date().toISOString() });
    }

    const result = await this.sandboxManager.executeBuild(repositoryId, command, timeoutMs);

    if (this.eventBus) {
      this.eventBus.emit('github.build.completed', {
        repositoryId,
        success: result.success,
        durationMs: result.durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Executes sandboxed tests.
   */
  public async test(repositoryId: string, command: string = 'npm test', timeoutMs: number = 60000): Promise<SandboxExecutionResult> {
    if (this.eventBus) {
      this.eventBus.emit('github.test.started', { repositoryId, testCommand: command, timestamp: new Date().toISOString() });
    }

    const result = await this.sandboxManager.executeTest(repositoryId, command, timeoutMs);

    if (this.eventBus) {
      this.eventBus.emit('github.test.completed', {
        repositoryId,
        success: result.success,
        durationMs: result.durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Compares candidate repositories.
   */
  public async compare(candidates: Array<{ owner: string; repo: string }>): Promise<CandidateComparisonResult> {
    const list: Array<{ repository: GitHubRepository; intelligence?: RepositoryIntelligence }> = [];

    for (const c of candidates) {
      const repo = await this.getRepository(c.owner, c.repo);
      let intel = this.repository.getAnalysis(repo.id);
      if (!intel) {
        const analysis = await this.analyzeRepository(c.owner, c.repo);
        intel = analysis.intelligence;
      }
      list.push({ repository: repo, intelligence: intel });
    }

    return RepositoryComparisonService.compareCandidates(list);
  }

  /**
   * Proposes integration of an analyzed repository into the Capability Fabric.
   */
  public proposeIntegration(repositoryId: string, spec: any = {}): IntegrationProposal {
    const repo = this.repository.getRepository(repositoryId);
    if (!repo) {
      throw new Error(`Repository '${repositoryId}' not found.`);
    }

    let intel = this.repository.getAnalysis(repositoryId);
    if (!intel) {
      intel = RepositoryIntelligenceService.analyzeRepository(repo);
    }

    const proposal = this.integrator.proposeIntegration(repo, intel, spec);

    if (this.eventBus) {
      this.eventBus.emit('github.integration.proposed', {
        proposalId: proposal.id,
        repositoryId: repo.id,
        capabilityId: proposal.capabilityId,
        timestamp: new Date().toISOString(),
      });
    }

    return proposal;
  }

  /**
   * Approves an integration proposal.
   */
  public approveProposal(proposalId: string, decidedBy: string = 'RUSHIKESH', reason?: string): IntegrationProposal {
    const proposal = this.integrator.approveProposal(proposalId, decidedBy, reason);

    if (this.eventBus) {
      this.eventBus.emit('github.integration.approved', {
        proposalId,
        decidedBy,
        timestamp: new Date().toISOString(),
      });
    }

    return proposal;
  }

  /**
   * Rejects an integration proposal.
   */
  public rejectProposal(proposalId: string, reason: string = 'Rejected by human authority'): IntegrationProposal {
    const proposals = this.repository.listProposals();
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found.`);
    }

    const updated: IntegrationProposal = {
      ...proposal,
      status: 'REJECTED',
      decisionReason: reason,
      decidedAt: new Date().toISOString(),
    };

    this.repository.saveProposal(updated);

    if (this.eventBus) {
      this.eventBus.emit('github.integration.rejected', {
        proposalId,
        reason,
        timestamp: new Date().toISOString(),
      });
    }

    return updated;
  }

  /**
   * Registers an approved proposal into FP-07 UniversalCapabilityFabric.
   */
  public registerCapability(proposalId: string): UniversalCapability {
    return this.integrator.registerIntoFabric(proposalId);
  }

  public listRepositories(limit?: number): GitHubRepository[] {
    return this.repository.listRepositories(limit);
  }

  public listAcquisitions(limit?: number): RepositoryAcquisition[] {
    return this.repository.listAcquisitions(limit);
  }

  public listProvenance(limit?: number): RepositoryProvenance[] {
    return this.repository.listProvenance(limit);
  }

  public listProposals(repositoryId?: string): IntegrationProposal[] {
    return this.repository.listProposals(repositoryId);
  }

  /**
   * Synchronizes repository and owner with Knowledge Graph if available.
   */
  public async syncWithKnowledgeGraph(repo: GitHubRepository): Promise<void> {
    if (!this.knowledgeEntityRepo || !this.knowledgeRelationshipRepo) {
      return;
    }

    try {
      const repoEntity = this.knowledgeEntityRepo.createEntity({
        canonicalName: repo.fullName,
        displayName: repo.name,
        entityType: 'SOFTWARE',
        description: repo.description,
        scope: 'GLOBAL',
      });

      const ownerEntity = this.knowledgeEntityRepo.createEntity({
        canonicalName: repo.owner,
        displayName: repo.owner,
        entityType: 'ORGANIZATION',
        description: `GitHub account/organization for ${repo.owner}`,
        scope: 'GLOBAL',
      });

      this.knowledgeRelationshipRepo.createRelationship({
        sourceEntityId: repoEntity.id,
        relationshipType: 'DEVELOPED_BY',
        targetEntityId: ownerEntity.id,
        confidence: 1.0,
      });
    } catch (err: any) {
      this.logger?.debug(`Knowledge graph sync deferred: ${err.message}`);
    }
  }

  /**
   * Interfaces with ResearchEngine for technical context or security advisories.
   */
  public async consultResearch(query: string): Promise<any> {
    if (!this.researchEngine) {
      return { message: 'ResearchEngine not configured. Query deferred.', query };
    }
    try {
      return await this.researchEngine.createStudy({
        question: `GitHub open-source context: ${query}`,
        objective: 'Evaluate technical documentation, security advisories, and architecture',
        depth: 'SHALLOW' as any,
      });
    } catch (err: any) {
      return { error: err.message, query };
    }
  }
}

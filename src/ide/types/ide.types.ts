/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal IDE & Development Workspace Domain Types
 *
 * FP-09: Complete Type Definitions for Workspaces, Project Architecture,
 * File Editing, Staged Diffs, Terminals, Live Previews, and the 10-Stage Loop.
 */

export type ProjectFramework =
  | 'NODE'
  | 'REACT'
  | 'VITE'
  | 'NEXTJS'
  | 'EXPRESS'
  | 'TYPESCRIPT'
  | 'PYTHON'
  | 'RUST'
  | 'GO'
  | 'HTML_STATIC'
  | 'GENERIC'
  | 'Node.js'
  | 'React'
  | 'Vite'
  | 'Next.js'
  | 'Express'
  | 'TypeScript'
  | string;

export interface ProjectArchitecture {
  framework: ProjectFramework;
  language?: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip' | 'cargo' | 'go' | 'none';
  entryPoints: string[];
  manifestPath?: string;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  buildCommand?: string;
  testCommand?: string;
  devCommand?: string;
  hasGit: boolean;
  hasDocker: boolean;
  detectedAt: string;
}

export interface WorkspaceMetadata {
  id: string;
  name: string;
  rootPath: string;
  companyId?: string;
  projectId?: string;
  architecture: ProjectFramework | any;
  framework?: string;
  packageManager?: string;
  settings: Record<string, unknown>;
  createdAt: string;
  lastAccessedAt: string;
  lastActiveAt?: string;
}

export interface FileNode {
  path: string;
  relativePath: string;
  name: string;
  type: 'file' | 'directory';
  sizeBytes: number;
  lastModified: string;
  extension?: string;
  children?: FileNode[];
}

export interface FileSlice {
  path: string;
  relativePath: string;
  totalLines: number;
  startLine: number;
  endLine: number;
  content: string;
  truncated: boolean;
  byteSize: number;
}

export interface ReplacementChunk {
  startLine: number;
  endLine: number;
  targetContent: string;
  replacementContent: string;
  allowMultiple?: boolean;
}

export type ChangesetStatus = 'STAGED' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'REVERTED';

export interface StagedChangeset {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: ChangesetStatus;
  authorAgent: string;
  dangerTier: number;
  files: string[];
  diffUnified: string;
  unifiedDiff?: string;
  diffChecksum: string;
  createdAt: string;
  appliedAt?: string;
  reviewedBy?: string;
}

export interface SearchMatch {
  file: string;
  relativePath: string;
  lineNumber: number;
  lineContent: string;
  line?: number;
  content?: string;
  fullPath?: string;
}

export interface SearchQuery {
  query: string;
  isRegex?: boolean;
  caseSensitive?: boolean;
  includes?: string[];
  excludes?: string[];
  maxResults?: number;
}

export type SymbolKind =
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'type'
  | 'constant'
  | 'export'
  | 'import';

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  line: number;
  file: string;
  detail?: string;
}

export type TerminalStatus = 'ACTIVE' | 'IDLE' | 'TERMINATED' | 'CLOSED' | 'ERROR';

export interface TerminalSession {
  id: string;
  workspaceId: string;
  name: string;
  shellPath: string;
  cwd: string;
  pid?: number;
  status: TerminalStatus;
  createdAt: string;
  lastActiveAt: string;
}

export type PreviewServerStatus = 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';

export interface PreviewServer {
  id: string;
  workspaceId: string;
  framework: string;
  port: number;
  url: string;
  pid?: number;
  status: PreviewServerStatus;
  healthStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  startedAt: string;
  stoppedAt?: string;
}

export type VerificationStage =
  | 'UNDERSTAND'
  | 'PLAN'
  | 'MODIFY'
  | 'EXECUTE'
  | 'OBSERVE'
  | 'TEST'
  | 'VERIFY'
  | 'FIX'
  | 'REVERIFY'
  | 'REPORT';

export interface StageExecutionResult {
  stage: VerificationStage;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  output?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface VerificationRun {
  id: string;
  workspaceId: string;
  objective: string;
  currentStage: VerificationStage;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  stagesLog: StageExecutionResult[];
  testsPassed: number;
  testsFailed: number;
  iterationsCount: number;
  startedAt: string;
  completedAt?: string;
  summary?: string;
}

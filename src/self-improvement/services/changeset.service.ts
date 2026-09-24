/**
 * HṚṢĪKEŚA (हृषीकेश) — ChangeSet Service
 */

import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import { IImprovementChangeSet, IChangeSetFile } from '../interfaces/self-improvement.types.js';

export class ChangeSetService {
  private readonly repository: SelfImprovementRepository;

  constructor(repository: SelfImprovementRepository) {
    this.repository = repository;
  }

  public createChangeSet(input: {
    id?: string;
    proposalId: string;
    files: IChangeSetFile[];
    summary: string;
    authorAgent?: string;
    isSandboxed?: boolean;
    sandboxPath?: string;
  }): IImprovementChangeSet {
    const cs: IImprovementChangeSet = {
      id: input.id || `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      proposalId: input.proposalId,
      files: input.files.map((f) => ({
        path: f.path,
        action: f.action,
        beforeContent: f.beforeContent,
        afterContent: f.afterContent,
        diff: f.diff || this.generateDiff(f.beforeContent, f.afterContent, f.path),
      })),
      summary: input.summary,
      authorAgent: input.authorAgent || 'gandiva',
      isSandboxed: input.isSandboxed !== undefined ? input.isSandboxed : true,
      sandboxPath: input.sandboxPath,
      createdAt: new Date().toISOString(),
    };

    this.repository.createChangeSet(cs);
    return cs;
  }

  public getChangeSet(id: string): IImprovementChangeSet | null {
    return this.repository.getChangeSetById(id);
  }

  public getChangeSetByProposal(proposalId: string): IImprovementChangeSet | null {
    return this.repository.getChangeSetByProposal(proposalId);
  }

  private generateDiff(before?: string, after?: string, filePath?: string): string {
    if (!before && after) {
      return `+++ ${filePath || 'file'}\n@@ -0,0 +1,${after.split('\n').length} @@\n${after.split('\n').map((l) => `+${l}`).join('\n')}`;
    }
    if (before && !after) {
      return `--- ${filePath || 'file'}\n@@ -1,${before.split('\n').length} +0,0 @@\n${before.split('\n').map((l) => `-${l}`).join('\n')}`;
    }
    if (!before && !after) return '';

    const beforeLines = before!.split('\n');
    const afterLines = after!.split('\n');
    const diffLines: string[] = [`--- a/${filePath || 'file'}`, `+++ b/${filePath || 'file'}`];

    // Simple line-by-line diff representation
    let i = 0;
    while (i < beforeLines.length || i < afterLines.length) {
      const b = beforeLines[i];
      const a = afterLines[i];
      if (b !== a) {
        if (b !== undefined) diffLines.push(`-${b}`);
        if (a !== undefined) diffLines.push(`+${a}`);
      } else {
        diffLines.push(` ${b}`);
      }
      i++;
    }

    return diffLines.join('\n');
  }
}

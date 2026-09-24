/**
 * HṚṢĪKEŚA (हृषीकेश) — Notepad Application Adapter
 *
 * Phase 22: Context adapter for operating Windows Notepad via UI Automation.
 */

import { ComputerOperator } from '../services/computer.operator.js';
import { ActionResult } from '../interfaces/operator.types.js';

export class NotepadAdapter {
  private readonly operator: ComputerOperator;

  constructor(operator: ComputerOperator) {
    this.operator = operator;
  }

  public async createAndSaveDocument(content: string, filePath?: string): Promise<{ success: boolean; results: ActionResult[] }> {
    const targetFile = filePath ? `to ${filePath}` : '';
    const res = await this.operator.executeTask(
      'Create and save document in Notepad',
      `Open Notepad, enter "${content}", save document ${targetFile} and close Notepad`,
      { scope: 'APPLICATION' }
    );

    const success = res.task.status === 'COMPLETED';
    return { success, results: res.results };
  }
}

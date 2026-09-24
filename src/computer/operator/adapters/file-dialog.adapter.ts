/**
 * HṚṢĪKEŚA (हृषीकेश) — Common File Dialog Adapter
 *
 * Phase 22: Context adapter for operating Open / Save As Windows file dialogs.
 */

import { ComputerOperator } from '../services/computer.operator.js';

export class FileDialogAdapter {
  private readonly operator: ComputerOperator;

  constructor(operator: ComputerOperator) {
    this.operator = operator;
  }

  public async handleSaveAs(filePath: string): Promise<boolean> {
    const obs = await this.operator.observationEngine.observeDesktop({ maxDepth: 3 });
    const target = await this.operator.targetResolver.resolveTarget({ query: 'File name:', expectedControlType: 'Edit' }, obs);

    const typeRes = await this.operator.actionExecutor.executeAction({
      id: 'save_as_type_' + Date.now(),
      type: 'TYPE',
      target,
      params: { text: filePath },
      riskTier: 'LOW_RISK',
    }, obs);

    if (!typeRes.success) return false;

    // Press Save or Enter
    const pressRes = await this.operator.actionExecutor.executeAction({
      id: 'save_as_enter_' + Date.now(),
      type: 'KEYPRESS',
      params: { key: 'ENTER' },
      riskTier: 'LOW_RISK',
    }, obs);

    return pressRes.success;
  }

  public buildSaveSequence(filePath: string) {
    return [
      {
        id: 'save_as_type_' + Date.now(),
        type: 'TYPE' as const,
        target: { query: 'File name:', expectedControlType: 'Edit' },
        params: { text: filePath },
        riskTier: 'LOW_RISK' as const,
      },
      {
        id: 'save_as_enter_' + Date.now(),
        type: 'KEYPRESS' as const,
        params: { key: 'ENTER' },
        riskTier: 'LOW_RISK' as const,
      }
    ];
  }

  public buildOpenSequence(filePath: string) {
    return [
      {
        id: 'open_type_' + Date.now(),
        type: 'TYPE' as const,
        target: { query: 'File name:', expectedControlType: 'Edit' },
        params: { text: filePath },
        riskTier: 'LOW_RISK' as const,
      },
      {
        id: 'open_enter_' + Date.now(),
        type: 'KEYPRESS' as const,
        params: { key: 'ENTER' },
        riskTier: 'LOW_RISK' as const,
      }
    ];
  }
}

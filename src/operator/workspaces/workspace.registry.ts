/**
 * FP-13 Digital Workspace Registry
 *
 * Manages registered and active workspace instances across local, browser,
 * terminal, IDE, and remote environments.
 */

import { IDigitalWorkspace } from './digital.workspace.interface.js';
import { DigitalWorkspaceDescriptor, DigitalWorkspaceType } from '../types/index.js';
import { WorkspaceRepository } from '../repository/workspace.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { LocalWindowsWorkspace } from './local_windows.workspace.js';
import { BrowserWorkspace } from './browser.workspace.js';
import { TerminalWorkspace } from './terminal.workspace.js';
import { IdeWorkspace } from './ide.workspace.js';
import { RemoteVdiWorkspace } from './remote_vdi.workspace.js';

export class WorkspaceRegistry {
  private workspaces: Map<string, IDigitalWorkspace> = new Map();

  constructor(
    private readonly repository?: WorkspaceRepository,
    private readonly logger?: ILogger,
    private readonly eventBus?: EventBus
  ) {
    this.registerDefaultWorkspaces();
  }

  private registerDefaultWorkspaces(): void {
    const localWin = new LocalWindowsWorkspace(undefined, this.logger, this.eventBus);
    const browser = new BrowserWorkspace(undefined, this.logger, this.eventBus);
    const terminal = new TerminalWorkspace(undefined, this.logger, this.eventBus);
    const ide = new IdeWorkspace(undefined, this.logger, this.eventBus);
    const vdi = new RemoteVdiWorkspace(undefined, false, this.logger, this.eventBus);

    this.register(localWin);
    this.register(browser);
    this.register(terminal);
    this.register(ide);
    this.register(vdi);
  }

  public register(workspace: IDigitalWorkspace): void {
    this.workspaces.set(workspace.workspaceId, workspace);
    if (this.repository) {
      this.repository.saveWorkspace(workspace.descriptor);
    }
  }

  public get(workspaceId: string): IDigitalWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  public list(): IDigitalWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  public listDescriptors(): DigitalWorkspaceDescriptor[] {
    return this.list().map((w) => w.descriptor);
  }

  public findByType(type: DigitalWorkspaceType): IDigitalWorkspace | undefined {
    return this.list().find((w) => w.descriptor.workspaceType === type);
  }

  public remove(workspaceId: string): boolean {
    const exists = this.workspaces.has(workspaceId);
    this.workspaces.delete(workspaceId);
    if (this.repository) {
      this.repository.deleteWorkspace(workspaceId);
    }
    return exists;
  }
}

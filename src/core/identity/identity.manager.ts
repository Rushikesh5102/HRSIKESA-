/**
 * HṚṢĪKEŚA (हृषीकेश) — Identity Manager
 */

import {
  SystemIdentity,
  OwnerIdentity,
  AuthorityContext,
  SOVEREIGN_SYSTEM_IDENTITY,
  SOVEREIGN_OWNER_IDENTITY
} from './identity.types.js';

export class IdentityManager {
  private readonly systemIdentity: SystemIdentity;
  private readonly ownerIdentity: OwnerIdentity;
  private readonly initializedAt: string;

  constructor() {
    this.systemIdentity = Object.freeze({ ...SOVEREIGN_SYSTEM_IDENTITY });
    this.ownerIdentity = Object.freeze({ ...SOVEREIGN_OWNER_IDENTITY });
    this.initializedAt = new Date().toISOString();
  }

  public getSystemIdentity(): SystemIdentity {
    return this.systemIdentity;
  }

  public getOwnerIdentity(): OwnerIdentity {
    return this.ownerIdentity;
  }

  public getAuthorityContext(): AuthorityContext {
    return {
      system: this.systemIdentity,
      owner: this.ownerIdentity,
      isAuthorized: true,
      activeSince: this.initializedAt
    };
  }

  public isOwner(subjectId: string): boolean {
    return subjectId.trim() === this.ownerIdentity.subjectId;
  }

  public getFormattedBanner(): string {
    return [
      `================================================================================`,
      ` ${this.systemIdentity.name} (${this.systemIdentity.sanskrit}) — v${this.systemIdentity.version}`,
      ` ${this.systemIdentity.role}`,
      ` Creator & Master: ${this.ownerIdentity.fullName} (${this.ownerIdentity.title})`,
      `================================================================================`
    ].join('\n');
  }
}

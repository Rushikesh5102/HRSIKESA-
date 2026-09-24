/**
 * HṚṢĪKEŚA (हृषीकेश) — Identity Subsystem
 * Official Identity & Sovereign Authority Definition
 */

export interface SystemIdentity {
  readonly name: string;
  readonly sanskrit: string;
  readonly internationalSpelling: string;
  readonly asciiAlias: string;
  readonly version: string;
  readonly role: string;
  readonly philosophy: {
    readonly llm: string;
    readonly tools: string;
    readonly memory: string;
    readonly agentRuntime: string;
    readonly computer: string;
    readonly orchestrator: string;
  };
}

export interface OwnerIdentity {
  readonly fullName: string;
  readonly subjectId: string;
  readonly title: string;
  readonly role: string;
  readonly authorizedPermissions: readonly string[];
}

export interface AuthorityContext {
  readonly system: SystemIdentity;
  readonly owner: OwnerIdentity;
  readonly isAuthorized: boolean;
  readonly activeSince: string;
}

export const SOVEREIGN_SYSTEM_IDENTITY: SystemIdentity = {
  name: 'HṚṢĪKEŚA',
  sanskrit: 'हृषीकेश',
  internationalSpelling: 'HRISHIKESHA',
  asciiAlias: 'HRISEKESA',
  version: '0.2.0',
  role: 'Sovereign Personal AI Operating System & Autonomous Workforce Control Plane',
  philosophy: {
    llm: 'Brain',
    tools: 'Hands',
    memory: 'Long-Term Knowledge',
    agentRuntime: 'Nervous System',
    computer: 'World',
    orchestrator: 'HṚṢĪKEŚA Control Plane'
  }
};

export const SOVEREIGN_OWNER_IDENTITY: OwnerIdentity = {
  fullName: 'Rushikesh Pattiwar',
  subjectId: 'ROOT_RUSHIKESH',
  title: 'Creator & Sole Master',
  role: 'Root Administrator & Sovereign Authority',
  authorizedPermissions: ['*']
};

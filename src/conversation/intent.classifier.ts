/**
 * HRSIKESA (हृषीकेश) — Mission & Goal Intent Classifier
 *
 * Lightweight, deterministic + heuristic intent classifier that distinguishes
 * conversational queries from actionable multi-step missions and autonomous goals.
 */

export type IntentMode =
  | 'INFORMATION'
  | 'ACTION'
  | 'GOAL_REQUEST'
  | 'MISSION_REQUEST'
  | 'APPROVAL_RESPONSE'
  | 'STATUS_REQUEST';

export interface IntentClassificationResult {
  readonly isMission: boolean;
  readonly isGoal?: boolean;
  readonly mode?: IntentMode;
  readonly confidence: number; // 0.0 - 1.0
  readonly objective?: string;
  readonly suggestedAgentId?: string;
  readonly reason: string;
}

export class MissionIntentClassifier {
  private readonly approvalKeywords = [
    'approve', 'approved', 'proceed', 'yes, approve', 'yes approve',
    'reject', 'rejected', 'deny', 'denied', 'cancel approval', 'no, reject'
  ];

  private readonly statusKeywords = [
    'system status', 'status of goal', 'show active goal', 'show goal',
    'goal progress', 'workforce status', 'current status', 'what is the status',
    'how is the goal', 'show progress', 'check progress'
  ];

  private readonly chatPrefixes = [
    'what is', 'what are', 'how do', 'how does', 'why is', 'why do',
    'who is', 'explain', 'tell me about', 'define', 'can you explain',
    'hello', 'hi', 'hey', 'good morning', 'good evening', 'who are you',
    'what can you do', 'help me understand', 'compare'
  ];

  private readonly goalActionKeywords = [
    'build a complete', 'build and launch', 'create and launch',
    'develop and deploy', 'launch a', 'launch our', 'launch my',
    'full company goal', 'autonomous goal', 'set up a full business',
    'execute the goal of', 'achieve the goal', 'take care of the complete',
    'research this company', 'research whether this idea', 'research the market',
    'build a website', 'build and prepare', 'analyze this github repository',
    'find suitable jobs for me', 'create a business plan', 'set up this project',
    'fix this application', 'prepare everything needed for launch',
    'create a local project verification report'
  ];

  private readonly missionActionKeywords = [
    'create a', 'create an', 'build a', 'build an', 'implement a', 'implement an',
    'write a script', 'write a program', 'write an application', 'develop a',
    'inspect the workspace and', 'run a full audit and', 'automate', 'setup a',
    'produce a report containing', 'generate a project', 'refactor the',
    'test and verify', 'download and analyze', 'create a readme', 'open notepad'
  ];

  public classify(userMessage: string): IntentClassificationResult {
    const trimmed = userMessage.trim();
    const lower = trimmed.toLowerCase();

    // 1. Approval response check
    for (const kw of this.approvalKeywords) {
      if (lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw)) {
        const isApprove = !lower.includes('reject') && !lower.includes('deny') && !lower.includes('cancel');
        return {
          isMission: false,
          isGoal: false,
          mode: 'APPROVAL_RESPONSE',
          confidence: 0.95,
          objective: isApprove ? 'APPROVE' : 'REJECT',
          reason: `Detected human approval response ("${kw}").`
        };
      }
    }

    // 2. Status request check
    for (const kw of this.statusKeywords) {
      if (lower.includes(kw)) {
        return {
          isMission: false,
          isGoal: false,
          mode: 'STATUS_REQUEST',
          confidence: 0.9,
          reason: `Detected runtime status query ("${kw}").`
        };
      }
    }

    // 3. Very short messages (< 10 chars) without commands are almost always chat
    if (trimmed.length < 10) {
      return {
        isMission: false,
        isGoal: false,
        mode: 'INFORMATION',
        confidence: 0.95,
        reason: 'Short message length indicates standard conversational turn.'
      };
    }

    // 4. Goal action keywords check (Higher level than single missions)
    for (const action of this.goalActionKeywords) {
      if (lower.includes(action)) {
        let suggestedAgentId = 'aja';
        if (lower.includes('research') || lower.includes('market') || lower.includes('company')) {
          suggestedAgentId = 'rahu';
        } else if (lower.includes('build') || lower.includes('website') || lower.includes('software') || lower.includes('application')) {
          suggestedAgentId = 'gandiva';
        }

        return {
          isMission: true,
          isGoal: true,
          mode: 'GOAL_REQUEST',
          confidence: 0.9,
          objective: trimmed,
          suggestedAgentId,
          reason: `Message contains high-level autonomous goal keyword ("${action}").`
        };
      }
    }

    // 5. Explicit question prefix check (unless matched as goal)
    for (const prefix of this.chatPrefixes) {
      if (lower.startsWith(prefix)) {
        return {
          isMission: false,
          isGoal: false,
          mode: 'INFORMATION',
          confidence: 0.9,
          reason: `Message begins with informational question prefix ("${prefix}").`
        };
      }
    }

    // 6. Action keywords check (Mission level)
    for (const action of this.missionActionKeywords) {
      if (lower.includes(action)) {
        // Determine suitable lead agent
        let suggestedAgentId = 'gandiva';
        if (lower.includes('market') || lower.includes('trend') || lower.includes('competitor')) {
          suggestedAgentId = 'rahu';
        } else if (lower.includes('research') || lower.includes('search') || lower.includes('requirement') || lower.includes('user need')) {
          suggestedAgentId = 'tvas';
        } else if (lower.includes('system') || lower.includes('infra') || lower.includes('monitoring') || lower.includes('inspect')) {
          suggestedAgentId = 'garuda';
        } else if (lower.includes('plan') || lower.includes('strategy') || lower.includes('business')) {
          suggestedAgentId = 'aja';
        } else if (lower.includes('test') || lower.includes('qa') || lower.includes('verify')) {
          suggestedAgentId = 'vighna';
        } else if (lower.includes('recover') || lower.includes('rollback') || lower.includes('backup')) {
          suggestedAgentId = 'yama';
        } else if (lower.includes('retire') || lower.includes('decommission') || lower.includes('end-of-life')) {
          suggestedAgentId = 'mrtyu';
        }

        return {
          isMission: true,
          isGoal: false,
          mode: 'MISSION_REQUEST',
          confidence: 0.85,
          objective: trimmed,
          suggestedAgentId,
          reason: `Message contains executable mission action keyword ("${action}").`
        };
      }
    }

    // 7. Default: Conservative fallback to standard conversational dialogue
    return {
      isMission: false,
      isGoal: false,
      mode: 'INFORMATION',
      confidence: 0.7,
      reason: 'No explicit multi-step mission or goal action keywords detected.'
    };
  }
}

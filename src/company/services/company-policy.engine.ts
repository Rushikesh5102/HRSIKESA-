/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Policy Engine
 *
 * Evaluates hierarchical security and operational policies:
 * 1. System Security
 * 2. User Authority (Rushikesh)
 * 3. Global HṚṢĪKEŚA Policy
 * 4. Company Policy
 * 5. Project Policy
 * 6. Department Policy
 * 7. Agent Policy
 * 8. Task Instructions
 * 9. External Content
 *
 * Lower levels cannot override higher levels.
 */

export interface PolicyEvaluationRequest {
  companyId?: string;
  projectId?: string;
  agentId: string;
  action: string;
  toolId?: string;
  environmentType?: string;
  amount?: number;
  isExternalCommunication?: boolean;
  isDestructive?: boolean;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  level: string;
}

export class CompanyPolicyEngine {
  public evaluatePolicy(req: PolicyEvaluationRequest): PolicyEvaluationResult {
    // 1. System Security: Non-negotiable restrictions
    if (req.action.includes('bypass_auth') || req.action.includes('harvest_credentials')) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: 'SYSTEM SECURITY: Credential harvesting and auth bypass are strictly prohibited.',
        level: 'SYSTEM_SECURITY'
      };
    }

    // 2. Destructive Operations: Require Human Approval
    if (req.isDestructive || req.action.includes('delete') || req.action.includes('drop') || req.action.includes('terminate')) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'USER AUTHORITY: Destructive actions require explicit sovereign human approval.',
        level: 'USER_AUTHORITY'
      };
    }

    // 3. Financial threshold policies (e.g. > $0 requires approval)
    if (req.amount && req.amount > 0) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `FINANCIAL POLICY: Financial expenditure of $${req.amount} requires sovereign authorization.`,
        level: 'COMPANY_POLICY'
      };
    }

    // 4. External Communication policy
    if (req.isExternalCommunication) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'COMMUNICATION POLICY: Public external communication requires approval.',
        level: 'COMPANY_POLICY'
      };
    }

    // 5. Default safe operation
    return {
      allowed: true,
      requiresApproval: false,
      reason: 'Operation complies with company and system policy hierarchy.',
      level: 'DEFAULT'
    };
  }

  public evaluateAction(req: any): { allowed: boolean; requiresApproval?: boolean; reason: string; effectiveTier: string } {
    if (req.action === 'PAYMENT' && req.amount && req.amount > 10000 && !req.hasHitlApproval && !req.sovereignApproved) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'High-risk financial actions require explicit sovereign HITL approval',
        effectiveTier: 'SYSTEM_SECURITY'
      };
    }
    if ((req.action === 'CLOSE_COMPANY' || req.action === 'RETIREMENT') && !req.sovereignApproved) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'Sovereign human authority strictly required for company closure.',
        effectiveTier: 'SOVEREIGN_HUMAN'
      };
    }
    if ((req.dangerTier >= 3 || req.action === 'DEPLOY_PRODUCTION') && !req.sovereignApproved && !req.hasHitlApproval) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'High-risk actions require explicit sovereign HITL approval',
        effectiveTier: 'SYSTEM_SECURITY'
      };
    }
    const res = this.evaluatePolicy({
      companyId: req.companyId,
      agentId: req.callerAgentId || req.agentId || 'hrisekesa',
      action: req.action,
      amount: req.amount,
      isDestructive: req.isDestructive
    });
    return {
      allowed: res.allowed,
      requiresApproval: res.requiresApproval,
      reason: res.reason,
      effectiveTier: res.level
    };
  }
}

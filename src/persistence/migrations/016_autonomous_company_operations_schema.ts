/**
 * HRSIKESA - Migration 016: Autonomous Company Operations Schema
 *
 * New tables and schema extensions for Phase 25:
 * 1. company_objectives - Strategic, operational, financial, and product goals
 * 2. company_kpis - Measurable metrics and key performance indicators
 * 3. company_metric_observations - Provenance-backed metric time series
 * 4. company_orders - Customer orders across the 13-stage lifecycle
 * 5. company_order_events - Append-only order state transition audit
 * 6. company_support_tickets - Customer support tickets with SLAs
 * 7. company_incidents - SRE operational incidents and postmortems
 * 8. company_risks - Comprehensive risk register with mitigations
 * 9. company_approvals - Scoped HITL approval requests for high-risk actions
 * 10. company_sops - Versioned Standard Operating Procedures
 * 11. company_releases - Product releases with deployment targets and verification
 * 12. company_reviews - Strategic and operational review reports
 * 13. company_budgets - Multi-tier financial and compute resource budgets
 * 14. company_activities - Append-only operational audit log
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration016: Migration = {
  version: 16,
  name: '016_autonomous_company_operations_schema',
  up: (db: DatabaseSync): void => {
    // 1. Company Objectives Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_objectives (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        owner_agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'STRATEGIC',
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        status TEXT NOT NULL DEFAULT 'PENDING',
        deadline TEXT,
        budget_allocated REAL DEFAULT 0,
        budget_spent REAL DEFAULT 0,
        dependencies TEXT,
        metrics TEXT,
        evidence TEXT,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        approval_required INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_obj_company ON company_objectives(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_obj_status ON company_objectives(status);
      CREATE INDEX IF NOT EXISTS idx_comp_obj_owner ON company_objectives(owner_agent_id);
    `);

    // 2. Company KPIs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_kpis (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'OPERATIONS',
        source TEXT NOT NULL DEFAULT 'SYSTEM',
        unit TEXT NOT NULL DEFAULT '',
        target_value REAL NOT NULL,
        current_value REAL NOT NULL DEFAULT 0,
        delta REAL NOT NULL DEFAULT 0,
        trend TEXT NOT NULL DEFAULT 'STABLE',
        confidence REAL NOT NULL DEFAULT 1.0,
        owner_agent_id TEXT NOT NULL,
        deadline TEXT,
        evidence TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_kpi_company ON company_kpis(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_kpi_category ON company_kpis(category);
    `);

    // 3. Company Metric Observations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_metric_observations (
        id TEXT PRIMARY KEY,
        kpi_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        observed_value REAL NOT NULL,
        source TEXT NOT NULL,
        notes TEXT,
        evidence TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (kpi_id) REFERENCES company_kpis(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_metric_kpi ON company_metric_observations(kpi_id);
      CREATE INDEX IF NOT EXISTS idx_comp_metric_company ON company_metric_observations(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_metric_time ON company_metric_observations(timestamp);
    `);

    // 4. Company Orders Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_orders (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        product_id TEXT,
        order_number TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'LEAD',
        total_amount REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        items TEXT,
        contract_reference TEXT,
        approval_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_orders_company ON company_orders(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_orders_customer ON company_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_comp_orders_status ON company_orders(status);
      CREATE INDEX IF NOT EXISTS idx_comp_orders_num ON company_orders(order_number);
    `);

    // 5. Company Order Events Table (Append-only audit)
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_order_events (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason TEXT,
        evidence TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES company_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_ord_events_order ON company_order_events(order_id);
      CREATE INDEX IF NOT EXISTS idx_comp_ord_events_time ON company_order_events(timestamp);
    `);

    // 6. Company Support Tickets Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_support_tickets (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        title TEXT NOT NULL,
        issue TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        status TEXT NOT NULL DEFAULT 'OPEN',
        assigned_agent_id TEXT NOT NULL DEFAULT 'taraka',
        sla_deadline TEXT,
        resolution TEXT,
        evidence TEXT,
        messages TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_tickets_company ON company_support_tickets(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_tickets_status ON company_support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_comp_tickets_customer ON company_support_tickets(customer_id);
    `);

    // 7. Company Incidents Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_incidents (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        source TEXT NOT NULL DEFAULT 'SYSTEM',
        affected_system TEXT NOT NULL,
        detected_time TEXT NOT NULL,
        owner_agent_id TEXT NOT NULL DEFAULT 'garuda',
        status TEXT NOT NULL DEFAULT 'DETECTED',
        actions TEXT,
        evidence TEXT,
        resolution TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_incidents_company ON company_incidents(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_incidents_status ON company_incidents(status);
      CREATE INDEX IF NOT EXISTS idx_comp_incidents_severity ON company_incidents(severity);
    `);

    // 8. Company Risks Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_risks (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        probability TEXT NOT NULL DEFAULT 'MEDIUM',
        impact TEXT NOT NULL DEFAULT 'MEDIUM',
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        owner_agent_id TEXT NOT NULL DEFAULT 'vighna',
        mitigation TEXT,
        contingency TEXT,
        status TEXT NOT NULL DEFAULT 'IDENTIFIED',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_risks_company ON company_risks(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_risks_status ON company_risks(status);
    `);

    // 9. Company Approvals Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_approvals (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        requester_agent_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        resolved_by TEXT,
        resolution_reason TEXT,
        payload TEXT,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_approvals_company ON company_approvals(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_approvals_status ON company_approvals(status);
      CREATE INDEX IF NOT EXISTS idx_comp_approvals_category ON company_approvals(category);
    `);

    // 10. Company SOPs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_sops (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        scope TEXT NOT NULL,
        owner_agent_id TEXT NOT NULL,
        steps TEXT NOT NULL,
        required_skills TEXT,
        required_tools TEXT,
        approval_requirements TEXT,
        verification TEXT,
        version TEXT NOT NULL DEFAULT '1.0.0',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_sops_company ON company_sops(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_sops_status ON company_sops(status);
    `);

    // 11. Company Releases Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_releases (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        version TEXT NOT NULL,
        scope TEXT,
        changes TEXT,
        tests TEXT,
        approvals TEXT,
        deployment_target TEXT NOT NULL DEFAULT 'LOCAL',
        rollback_plan TEXT,
        status TEXT NOT NULL DEFAULT 'PLANNING',
        evidence TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_releases_company ON company_releases(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_releases_product ON company_releases(product_id);
      CREATE INDEX IF NOT EXISTS idx_comp_releases_status ON company_releases(status);
    `);

    // 12. Company Reviews Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_reviews (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        reviewer_agent_id TEXT NOT NULL,
        review_type TEXT NOT NULL DEFAULT 'OPERATIONAL',
        findings TEXT NOT NULL,
        actions TEXT,
        proposals TEXT,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_reviews_company ON company_reviews(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_reviews_time ON company_reviews(created_at);
    `);

    // 13. Company Budgets Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_budgets (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        department_id TEXT,
        project_id TEXT,
        category TEXT NOT NULL DEFAULT 'FINANCIAL',
        allocated_amount REAL NOT NULL DEFAULT 0,
        reserved_amount REAL NOT NULL DEFAULT 0,
        spent_amount REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        forecast REAL DEFAULT 0,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_budgets_company ON company_budgets(company_id);
    `);

    // 14. Company Activities Table (Append-only)
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_activities (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        result TEXT,
        evidence TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_act_company ON company_activities(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_act_time ON company_activities(timestamp);
    `);
  },

  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS company_activities;
      DROP TABLE IF EXISTS company_budgets;
      DROP TABLE IF EXISTS company_reviews;
      DROP TABLE IF EXISTS company_releases;
      DROP TABLE IF EXISTS company_sops;
      DROP TABLE IF EXISTS company_approvals;
      DROP TABLE IF EXISTS company_risks;
      DROP TABLE IF EXISTS company_incidents;
      DROP TABLE IF EXISTS company_support_tickets;
      DROP TABLE IF EXISTS company_order_events;
      DROP TABLE IF EXISTS company_orders;
      DROP TABLE IF EXISTS company_metric_observations;
      DROP TABLE IF EXISTS company_kpis;
      DROP TABLE IF EXISTS company_objectives;
    `);
  }
};

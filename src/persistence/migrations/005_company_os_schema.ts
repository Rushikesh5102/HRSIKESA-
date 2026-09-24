/**
 * HRSIKESA - Migration 005: Company & Project Operating System Schema
 *
 * New tables and schema extensions for Phase 14:
 * 1. companies - Persistent organizational units / companies
 * 2. projects - Standalone and company-scoped projects
 * 3. departments - Organizational functional departments
 * 4. company_workforce - Agent-to-company / department assignments
 * 5. products - Product and service catalog with lifecycle state
 * 6. customers - Local persistent customer and prospect registry
 * 7. decisions - Architecture & business decision register (ADR / PDR)
 * 8. agent_missions & mission_artifacts schema extensions - company_id, project_id, product_id, department_id
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration005: Migration = {
  version: 5,
  name: '005_company_os_schema',
  up: (db: DatabaseSync): void => {
    // 1. Companies Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        mission TEXT,
        vision TEXT,
        status TEXT NOT NULL DEFAULT 'PLANNING',
        industry TEXT,
        created_by TEXT NOT NULL DEFAULT 'hrisekesa',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
      CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
    `);

    // 2. Projects Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        objective TEXT,
        status TEXT NOT NULL DEFAULT 'PLANNING',
        priority TEXT NOT NULL DEFAULT 'normal',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    `);

    // 3. Departments Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        lead_agent_id TEXT,
        capabilities TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
    `);

    // 4. Company Workforce Table (Agent-to-Company/Department Assignments)
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_workforce (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        department_id TEXT,
        role_title TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        joined_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_company_workforce_company ON company_workforce(company_id);
      CREATE INDEX IF NOT EXISTS idx_company_workforce_agent ON company_workforce(agent_id);
    `);

    // 5. Products & Services Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        project_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'product',
        status TEXT NOT NULL DEFAULT 'IDEA',
        version TEXT NOT NULL DEFAULT '0.1.0',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
      CREATE INDEX IF NOT EXISTS idx_products_project ON products(project_id);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    `);

    // 6. Customers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'individual',
        status TEXT NOT NULL DEFAULT 'PROSPECT',
        contact_reference TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
      CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
    `);

    // 7. Decision Register Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        project_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        decision TEXT NOT NULL,
        reasoning TEXT,
        made_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PROPOSED',
        supersedes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_decisions_company ON decisions(company_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
    `);

    // 8. Extend agent_missions Table
    const missionColumns = db.prepare('PRAGMA table_info(agent_missions)').all() as { name: string }[];
    const missionColNames = new Set(missionColumns.map(c => c.name));

    if (!missionColNames.has('company_id')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN company_id TEXT;');
    }
    if (!missionColNames.has('project_id')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN project_id TEXT;');
    }
    if (!missionColNames.has('product_id')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN product_id TEXT;');
    }
    if (!missionColNames.has('department_id')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN department_id TEXT;');
    }

    // 9. Extend mission_artifacts Table
    const artifactColumns = db.prepare('PRAGMA table_info(mission_artifacts)').all() as { name: string }[];
    const artifactColNames = new Set(artifactColumns.map(c => c.name));

    if (!artifactColNames.has('company_id')) {
      db.exec('ALTER TABLE mission_artifacts ADD COLUMN company_id TEXT;');
    }
    if (!artifactColNames.has('project_id')) {
      db.exec('ALTER TABLE mission_artifacts ADD COLUMN project_id TEXT;');
    }
  },

  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS decisions;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS company_workforce;
      DROP TABLE IF EXISTS departments;
      DROP TABLE IF EXISTS projects;
      DROP TABLE IF EXISTS companies;
    `);
  }
};

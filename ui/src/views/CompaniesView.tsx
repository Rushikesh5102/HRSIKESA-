import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  CompanyInfo,
  CompanyOverviewInfo,
  ProjectInfo,
  ProductInfo,
  CustomerInfo,
  DecisionInfo,
  DepartmentInfo,
  WorkforceAssignmentInfo,
  LifecycleStageInfo
} from '../types/api.types';

export const CompaniesView: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [overview, setOverview] = useState<CompanyOverviewInfo | null>(null);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [workforce, setWorkforce] = useState<WorkforceAssignmentInfo[]>([]);
  const [decisions, setDecisions] = useState<DecisionInfo[]>([]);
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStageInfo[]>([]);

  // Phase 25 Autonomous Operations State
  const [health, setHealth] = useState<any | null>(null);
  const [operatingState, setOperatingState] = useState<string>('IDEATION');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [sops, setSops] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [capacities, setCapacities] = useState<any[]>([]);
  const [lastCycleResult, setLastCycleResult] = useState<any | null>(null);
  const [runningCycle, setRunningCycle] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'autonomous' | 'objectives' | 'kpis' | 'orders' | 'sre' | 'governance' | 'projects' | 'products' | 'workforce' | 'lifecycle'
  >('autonomous');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals / Forms state
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyMission, setNewCompanyMission] = useState('');
  const [newCompanyVision, setNewCompanyVision] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('');
  const [newCompanyDesc, setNewCompanyDesc] = useState('');

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectObjective, setNewProjectObjective] = useState('');
  const [newProjectPriority, setNewProjectPriority] = useState('normal');

  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductType, setNewProductType] = useState('product');
  const [newProductVersion, setNewProductVersion] = useState('0.1.0');
  const [newProductDesc, setNewProductDesc] = useState('');

  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerType, setNewCustomerType] = useState('smb');
  const [newCustomerContact, setNewCustomerContact] = useState('');

  const [showCreateDecision, setShowCreateDecision] = useState(false);
  const [newDecisionTitle, setNewDecisionTitle] = useState('');
  const [newDecisionText, setNewDecisionText] = useState('');
  const [newDecisionReasoning, setNewDecisionReasoning] = useState('');
  const [newDecisionMadeBy, setNewDecisionMadeBy] = useState('hrisekesa');

  // Phase 25 Modals
  const [showCreateObjective, setShowCreateObjective] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');
  const [newObjCategory, setNewObjCategory] = useState('STRATEGIC');
  const [newObjOwner, setNewObjOwner] = useState('Aja');
  const [newObjTargetDate, setNewObjTargetDate] = useState('');

  const [showCreateKpi, setShowCreateKpi] = useState(false);
  const [newKpiName, setNewKpiName] = useState('');
  const [newKpiCategory, setNewKpiCategory] = useState('OPERATIONS');
  const [newKpiSource, setNewKpiSource] = useState('SYSTEM');
  const [newKpiUnit, setNewKpiUnit] = useState('%');
  const [newKpiTarget, setNewKpiTarget] = useState(100);
  const [newKpiCurrent, setNewKpiCurrent] = useState(0);

  // Load companies & lifecycle stages on mount
  useEffect(() => {
    loadCompanies();
    loadLifecycleStages();
  }, []);

  // When company is selected, load its data
  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanyDetails(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanies();
      if (res.success && res.companies) {
        setCompanies(res.companies);
        if (res.companies.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(res.companies[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const loadLifecycleStages = async () => {
    try {
      const res = await api.getLifecycleStages();
      if (res.success && res.stages) {
        setLifecycleStages(res.stages);
      }
    } catch {
      // ignore
    }
  };

  const loadCompanyDetails = async (companyId: string) => {
    try {
      setError(null);
      const [
        ovRes, projRes, prodRes, custRes, deptRes, wfRes, decRes,
        healthRes, statusRes, objRes, kpiRes, ordRes, incRes, riskRes, appRes, sopRes, relRes, capRes
      ] = await Promise.all([
        api.getCompanyOverview(companyId).catch(() => null),
        api.getCompanyProjects(companyId).catch(() => ({ success: false, projects: [] })),
        api.getCompanyProducts(companyId).catch(() => ({ success: false, products: [] })),
        api.getCompanyCustomers(companyId).catch(() => ({ success: false, customers: [] })),
        api.getCompanyDepartments(companyId).catch(() => ({ success: false, departments: [] })),
        api.getCompanyWorkforce(companyId).catch(() => ({ success: false, workforce: [] })),
        api.getCompanyDecisions(companyId).catch(() => ({ success: false, decisions: [] })),
        api.getCompanyHealth(companyId).catch(() => null),
        api.getCompanyOperatingState(companyId).catch(() => null),
        api.getCompanyObjectives(companyId).catch(() => ({ success: false, objectives: [] })),
        api.getCompanyKpis(companyId).catch(() => ({ success: false, kpis: [] })),
        api.getCompanyOrders(companyId).catch(() => ({ success: false, orders: [] })),
        api.getCompanyIncidents(companyId).catch(() => ({ success: false, incidents: [] })),
        api.getCompanyRisks(companyId).catch(() => ({ success: false, risks: [] })),
        api.getCompanyApprovals(companyId).catch(() => ({ success: false, approvals: [] })),
        api.getCompanySops(companyId).catch(() => ({ success: false, sops: [] })),
        api.getCompanyReleases(companyId).catch(() => ({ success: false, releases: [] })),
        api.getCompanyWorkforceCapacities(companyId).catch(() => ({ success: false, workforce: [] })),
      ]);

      if (ovRes && ovRes.success) setOverview(ovRes.overview);
      if (projRes && projRes.success) setProjects(projRes.projects);
      if (prodRes && prodRes.success) setProducts(prodRes.products);
      if (custRes && custRes.success) setCustomers(custRes.customers);
      if (deptRes && deptRes.success) setDepartments(deptRes.departments);
      if (wfRes && wfRes.success) setWorkforce(wfRes.workforce);
      if (decRes && decRes.success) setDecisions(decRes.decisions);

      // Phase 25 states
      if (healthRes && healthRes.success) setHealth(healthRes.health);
      if (statusRes && statusRes.success) {
        setOperatingState(statusRes.state);
        setIsPaused(statusRes.isPaused);
      }
      if (objRes && objRes.success) setObjectives(objRes.objectives);
      if (kpiRes && kpiRes.success) setKpis(kpiRes.kpis);
      if (ordRes && ordRes.success) setOrders(ordRes.orders);
      if (incRes && incRes.success) setIncidents(incRes.incidents);
      if (riskRes && riskRes.success) setRisks(riskRes.risks);
      if (appRes && appRes.success) setApprovals(appRes.approvals);
      if (sopRes && sopRes.success) setSops(sopRes.sops);
      if (relRes && relRes.success) setReleases(relRes.releases);
      if (capRes && capRes.success) setCapacities(capRes.workforce);
    } catch (err: any) {
      setError(err.message || 'Failed to load company details');
    }
  };

  const handleRunOperatingCycle = async () => {
    if (!selectedCompanyId) return;
    try {
      setRunningCycle(true);
      setError(null);
      const res = await api.executeCompanyCycle(selectedCompanyId);
      if (res.success && res.result) {
        setLastCycleResult(res.result);
        await loadCompanyDetails(selectedCompanyId);
      }
    } catch (err: any) {
      setError(err.message || 'Operating cycle execution failed');
    } finally {
      setRunningCycle(false);
    }
  };

  const handleTogglePause = async () => {
    if (!selectedCompanyId) return;
    try {
      if (isPaused) {
        const res = await api.resumeCompany(selectedCompanyId);
        if (res.success) {
          setIsPaused(false);
          setOperatingState(res.state);
        }
      } else {
        const res = await api.pauseCompany(selectedCompanyId);
        if (res.success) {
          setIsPaused(true);
          setOperatingState(res.state);
        }
      }
      await loadCompanyDetails(selectedCompanyId);
    } catch (err: any) {
      setError(err.message || 'Pause/Resume toggle failed');
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    try {
      setLoading(true);
      const res = await api.createCompany({
        name: newCompanyName.trim(),
        mission: newCompanyMission.trim() || undefined,
        vision: newCompanyVision.trim() || undefined,
        industry: newCompanyIndustry.trim() || undefined,
        description: newCompanyDesc.trim() || undefined,
        autoSetupDepartments: true
      });
      if (res.success && res.company) {
        setShowCreateCompany(false);
        setNewCompanyName('');
        setNewCompanyMission('');
        setNewCompanyVision('');
        setNewCompanyIndustry('');
        setNewCompanyDesc('');
        await loadCompanies();
        setSelectedCompanyId(res.company.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !newProjectName.trim() || !newProjectObjective.trim()) return;
    try {
      const res = await api.createCompanyProject(selectedCompanyId, {
        name: newProjectName.trim(),
        objective: newProjectObjective.trim(),
        priority: newProjectPriority
      });
      if (res.success) {
        setShowCreateProject(false);
        setNewProjectName('');
        setNewProjectObjective('');
        loadCompanyDetails(selectedCompanyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !newProductName.trim()) return;
    try {
      const res = await api.createCompanyProduct(selectedCompanyId, {
        name: newProductName.trim(),
        description: newProductDesc.trim() || undefined,
        type: newProductType,
        version: newProductVersion.trim() || '0.1.0'
      });
      if (res.success) {
        setShowCreateProduct(false);
        setNewProductName('');
        setNewProductDesc('');
        loadCompanyDetails(selectedCompanyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !newCustomerName.trim()) return;
    try {
      const res = await api.createCompanyCustomer(selectedCompanyId, {
        name: newCustomerName.trim(),
        type: newCustomerType,
        contactReference: newCustomerContact.trim() || undefined
      });
      if (res.success) {
        setShowCreateCustomer(false);
        setNewCustomerName('');
        setNewCustomerContact('');
        loadCompanyDetails(selectedCompanyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    }
  };

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !newDecisionTitle.trim() || !newDecisionText.trim()) return;
    try {
      const res = await api.createCompanyDecision(selectedCompanyId, {
        title: newDecisionTitle.trim(),
        decision: newDecisionText.trim(),
        reasoning: newDecisionReasoning.trim() || undefined,
        madeBy: newDecisionMadeBy.trim() || 'hrisekesa'
      });
      if (res.success) {
        setShowCreateDecision(false);
        setNewDecisionTitle('');
        setNewDecisionText('');
        setNewDecisionReasoning('');
        loadCompanyDetails(selectedCompanyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record decision');
    }
  };

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !newObjTitle.trim()) return;
    try {
      const res = await api.createCompanyObjective(selectedCompanyId, {
        title: newObjTitle.trim(),
        description: newObjDesc.trim(),
        category: newObjCategory,
        ownerAgentId: newObjOwner,
        targetDate: newObjTargetDate || undefined,
      });
      if (res.success) {
        setShowCreateObjective(false);
        setNewObjTitle('');
        setNewObjDesc('');
        loadCompanyDetails(selectedCompanyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create objective');
    }
  };

  const handleCreateKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !newKpiName.trim()) return;
    try {
      const res = await api.createCompanyKpi(selectedCompanyId, {
        name: newKpiName.trim(),
        category: newKpiCategory,
        source: newKpiSource,
        unit: newKpiUnit,
        targetValue: Number(newKpiTarget),
        currentValue: Number(newKpiCurrent),
      });
      if (res.success) {
        setShowCreateKpi(false);
        setNewKpiName('');
        loadCompanyDetails(selectedCompanyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create KPI');
    }
  };

  const currentCompany = companies.find((c) => c.id === selectedCompanyId);

  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'HEALTHY': return '#22c55e';
      case 'WATCH': return '#eab308';
      case 'AT_RISK': return '#f97316';
      case 'CRITICAL': return '#ef4444';
      case 'BLOCKED': return '#a855f7';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ color: 'var(--text-primary)', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontWeight: 800, fontSize: '18px' }}>
            🏢
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                Companies
              </h1>
              <span style={{ fontSize: '18px', color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-devanagari)', fontWeight: 700 }}>
                उद्योग
              </span>
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              Multi-tenant autonomous enterprise operating system with dedicated agent councils.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCreateCompany(true)}
            className="btn btn-primary"
            style={{ fontSize: '12.5px', padding: '7px 16px' }}
          >
            + New Company
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(225, 29, 72, 0.2)', border: '1px solid var(--accent-rose)', color: '#fca5a5', borderRadius: '6px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Multi-tenant Illustrated Cards from Live Backend */}
      {companies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏛️</div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)', fontSize: '18px' }}>
            No Autonomous Companies Registered Yet
          </h3>
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            Initialize your first sovereign enterprise with dedicated department hierarchies and specialized agent workforce.
          </p>
          <button onClick={() => setShowCreateCompany(true)} className="btn btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
            + Register First Company
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {companies.map((c, idx) => {
            const isSelected = selectedCompanyId === c.id;
            const gradients = [
              'radial-gradient(ellipse at 50% 30%, #4A260C 0%, #1A0E05 100%)',
              'radial-gradient(ellipse at 50% 30%, #0C324A 0%, #05141F 100%)',
              'radial-gradient(ellipse at 50% 30%, #3D260A 0%, #180F03 100%)',
            ];
            const emblems = ['🏛️', '☸️', '🪷'];
            const bannerGrad = gradients[idx % gradients.length];
            const emblem = emblems[idx % emblems.length];

            return (
              <div
                key={c.id}
                style={{
                  background: 'var(--bg-card)',
                  border: `1.5px solid ${isSelected ? 'var(--accent-gold-bright)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  boxShadow: isSelected ? '0 0 24px rgba(245, 200, 66, 0.3)' : 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header Banner */}
                <div
                  style={{
                    height: '120px',
                    background: bannerGrad,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      background: 'rgba(245, 200, 66, 0.15)',
                      border: '1.5px solid rgba(245, 200, 66, 0.4)',
                      boxShadow: '0 0 20px rgba(245, 200, 66, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '26px',
                    }}
                  >
                    {emblem}
                  </div>

                  <div style={{ position: 'absolute', top: '10px', right: '12px' }}>
                    <span
                      className={c.status === 'ACTIVE' || (c.status as string) === 'OPERATIONAL' ? 'status-pill-active' : 'status-pill-planning'}
                      style={{ fontSize: '10px' }}
                    >
                      ● {c.status}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                        {c.name}
                      </h2>
                    </div>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.4 }}>
                      {c.mission || (c as any).description || 'Sovereign Multi-Agent Enterprise'}
                    </p>
                  </div>

                  {/* Metrics Row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '8px 4px',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                        {isSelected ? projects.length : ((c as any).projectsCount || 0)}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Projects
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border-subtle)' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                        {isSelected ? departments.length : ((c as any).departmentsCount || 0)}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Depts
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border-subtle)' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                        {isSelected ? workforce.length : ((c as any).workforceCount || 0)}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Workforce
                      </div>
                    </div>
                  </div>

                  {/* Enter Button */}
                  <button
                    onClick={() => setSelectedCompanyId(c.id)}
                    className={isSelected ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 0', fontWeight: 700 }}
                  >
                    {isSelected ? '✓ Currently Selected' : `Inspect ${c.name} →`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Company Operating Control Bar */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13.5px' }}>Active Enterprise Workspace:</span>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                minWidth: '220px',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {currentCompany && (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    backgroundColor: isPaused ? '#ef4444' : '#0369a1',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fff',
                    letterSpacing: '0.5px'
                  }}
                >
                  STATE: {operatingState}
                </span>

                {health && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: '#0f172a',
                      border: `1px solid ${getHealthColor(health.overallStatus)}`,
                      color: getHealthColor(health.overallStatus),
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                  >
                    HEALTH: {health.overallStatus} ({health.overallScore}%)
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button
                  onClick={handleRunOperatingCycle}
                  disabled={runningCycle || isPaused}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: runningCycle ? '#475569' : '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: runningCycle || isPaused ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {runningCycle ? '⚙️ Executing Cycle...' : '⚡ Run Operating Cycle'}
                </button>

                <button
                  onClick={handleTogglePause}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: isPaused ? '#3b82f6' : '#64748b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  {isPaused ? '▶️ Resume Operations' : '⏸️ Pause Company'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {currentCompany ? (
        <>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #334155', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'autonomous', label: '⚡ Autonomous Operations' },
              { id: 'objectives', label: `🎯 Objectives & OKRs (${objectives.length})` },
              { id: 'kpis', label: `📈 KPIs & Metrics (${kpis.length})` },
              { id: 'orders', label: `🛒 CRM, Orders & Support (${orders.length})` },
              { id: 'sre', label: `🚨 Incidents & Risks (${incidents.length + risks.length})` },
              { id: 'governance', label: `📜 Governance, SOPs & Approvals (${approvals.length + sops.length})` },
              { id: 'workforce', label: `🏛️ Workforce (${workforce.length})` },
              { id: 'projects', label: `🚀 Projects (${projects.length})` },
              { id: 'products', label: `📦 Products (${products.length})` },
              { id: 'overview', label: '📊 Company Overview' },
              { id: 'lifecycle', label: '🔄 15-Stage Lifecycle' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '9px 14px',
                  backgroundColor: activeTab === tab.id ? '#0f172a' : 'transparent',
                  color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: AUTONOMOUS OPERATIONS */}
          {activeTab === 'autonomous' && (
            <div>
              {/* Health Dimensions Grid */}
              {health && (
                <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#38bdf8' }}>11-Dimensional Health Evaluation</h3>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Evaluated: {new Date(health.evaluatedAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {Object.entries(health.dimensions || {}).map(([dim, val]: [string, any]) => {
                      const numScore = typeof val === 'number' ? val : (val?.score ?? 0);
                      return (
                        <div key={dim} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>{dim}</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: numScore >= 80 ? '#22c55e' : numScore >= 60 ? '#eab308' : '#ef4444', marginTop: '2px' }}>
                            {numScore}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Operating Loop Status & Last Cycle Result */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#f8fafc' }}>Operating Cycle Engine</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                      <span style={{ color: '#94a3b8' }}>Sovereign Orchestrator:</span>
                      <strong style={{ color: '#38bdf8' }}>HṚṢĪKEŚA</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                      <span style={{ color: '#94a3b8' }}>Human Authority:</span>
                      <strong style={{ color: '#e2e8f0' }}>Rushikesh (Sovereign)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                      <span style={{ color: '#94a3b8' }}>Operating State:</span>
                      <span style={{ color: '#4ade80', fontWeight: '600' }}>{operatingState}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                      <span style={{ color: '#94a3b8' }}>Active Workforce Specialists:</span>
                      <span>17 Agents Assigned</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Cycle Budget Cap:</span>
                      <span style={{ color: '#fbbf24' }}>10 Tasks / 5 Missions / 120s</span>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#f8fafc' }}>Latest Autonomous Cycle Execution</h3>
                  {lastCycleResult ? (
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Cycle ID:</span>
                        <code style={{ color: '#38bdf8' }}>{lastCycleResult.cycleId?.slice(0, 16)}...</code>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Duration:</span>
                        <span>{lastCycleResult.durationMs}ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Dispatched Tasks:</span>
                        <span style={{ color: '#4ade80', fontWeight: '600' }}>{lastCycleResult.tasksDispatched}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Created Missions:</span>
                        <span style={{ color: '#38bdf8', fontWeight: '600' }}>{lastCycleResult.missionsCreated}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Health Evaluated:</span>
                        <span>{lastCycleResult.healthEvaluated?.overallStatus || 'HEALTHY'}</span>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '13px' }}>No autonomous cycles executed in this UI session. Click "⚡ Run Operating Cycle" to trigger autonomous dispatch.</p>
                  )}
                </div>
              </div>

              {/* Workforce Capacity Matrix */}
              <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#f8fafc' }}>17-Agent Workforce Live Capacity Matrix</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {capacities.map((cap) => (
                    <div key={cap.agentId} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#38bdf8', fontSize: '13px' }}>{cap.agentId}</strong>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: cap.status === 'AVAILABLE' ? '#065f46' : cap.status === 'BUSY' ? '#92400e' : '#1e293b',
                            color: '#e2e8f0'
                          }}
                        >
                          {cap.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Role: {cap.specialization || 'Specialist'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Active Tasks: {cap.activeTasksCount || 0} / {cap.maxConcurrentTasks || 3}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OBJECTIVES & OKRS */}
          {activeTab === 'objectives' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Company Strategic & Operational Objectives (OKRs)</h3>
                <button
                  onClick={() => setShowCreateObjective(true)}
                  style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  + Add Objective
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {objectives.map((obj) => (
                  <div key={obj.id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: '0 0 4px', color: '#38bdf8', fontSize: '14px' }}>{obj.title}</h4>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#0369a1' }}>{obj.category}</span>
                    </div>
                    {obj.description && <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0 10px' }}>{obj.description}</p>}
                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Owner: <strong style={{ color: '#e2e8f0' }}>{obj.ownerAgentId}</strong></span>
                      <span>Status: <strong style={{ color: '#4ade80' }}>{obj.status}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: KPIS & METRICS */}
          {activeTab === 'kpis' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Performance Indicators & Operational Metrics</h3>
                <button
                  onClick={() => setShowCreateKpi(true)}
                  style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  + Record KPI
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {kpis.map((kpi) => (
                  <div key={kpi.id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '14px' }}>{kpi.name}</h4>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#334155', color: '#38bdf8' }}>{kpi.source}</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ade80', margin: '8px 0' }}>
                      {kpi.currentValue} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ {kpi.targetValue} {kpi.unit}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Trend: {kpi.trend}</span>
                      <span>Confidence: {kpi.confidence * 100}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CRM, ORDERS & SUPPORT */}
          {activeTab === 'orders' && (
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Commercial Orders & Support Operations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {orders.map((ord) => (
                  <div key={ord.id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: '0 0 4px', color: '#fbbf24', fontSize: '14px' }}>Order #{ord.id.slice(0, 8)}</h4>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#065f46' }}>{ord.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0' }}>Amount: {ord.currency} {ord.totalAmount}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fulfillment: {ord.fulfillmentStatus || 'PENDING'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: INCIDENTS & RISKS */}
          {activeTab === 'sre' && (
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>SRE Incident Register & Risk Register</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ color: '#ef4444', margin: '0 0 10px' }}>Active Incidents ({incidents.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {incidents.map((inc) => (
                      <div key={inc.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{inc.title}</strong>
                          <span style={{ fontSize: '10px', color: '#fca5a5' }}>{inc.severity}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0' }}>{inc.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#fbbf24', margin: '0 0 10px' }}>Risk Management Register ({risks.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {risks.map((risk) => (
                      <div key={risk.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #fbbf24' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{risk.title}</strong>
                          <span style={{ fontSize: '10px', color: '#fde047' }}>Sev: {risk.severity}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0' }}>Mitigation: {risk.mitigation || 'Under investigation'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GOVERNANCE, SOPS & APPROVALS */}
          {activeTab === 'governance' && (
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Sovereign Governance, Approvals & Versioned SOPs</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ color: '#38bdf8', margin: '0 0 10px' }}>HITL Pending Approvals ({approvals.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {approvals.map((app) => (
                      <div key={app.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{app.title}</strong>
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#7f1d1d', color: '#fca5a5' }}>
                            {app.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0' }}>Category: {app.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#c084fc', margin: '0 0 10px' }}>Standard Operating Procedures ({sops.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sops.map((sop) => (
                      <div key={sop.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{sop.name}</strong>
                          <span style={{ fontSize: '10px', color: '#c084fc' }}>v{sop.version}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0' }}>Owner: {sop.ownerAgentId}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: WORKFORCE */}
          {activeTab === 'workforce' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>Organizational Structure & Workforce Assignments</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {departments.map((dept) => {
                  const deptWorkers = workforce.filter((w) => w.departmentId === dept.id);
                  return (
                    <div key={dept.id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <h4 style={{ margin: '0 0 4px', color: '#c084fc' }}>{dept.name}</h4>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px' }}>{dept.description}</p>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                        <strong>Lead Agent:</strong> {dept.leadAgentId || 'None'}
                      </div>
                      <div style={{ borderTop: '1px solid #334155', paddingTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Assigned Specialists:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {deptWorkers.map((w) => (
                            <span key={w.id} style={{ padding: '2px 6px', backgroundColor: '#0f172a', borderRadius: '4px', fontSize: '11px', color: '#38bdf8' }}>
                              {w.agentId} ({w.roleTitle || 'Member'})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 8: PROJECTS */}
          {activeTab === 'projects' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Company Projects</h3>
                <button
                  onClick={() => setShowCreateProject(true)}
                  style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  + Create Project
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {projects.map((p) => (
                  <div key={p.id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: '0 0 4px', color: '#38bdf8' }}>{p.name}</h4>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#0369a1' }}>{p.priority}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '4px 0 12px' }}>{p.objective}</p>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Status: <span style={{ color: '#4ade80' }}>{p.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: PRODUCTS */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Products & Services Catalog</h3>
                <button
                  onClick={() => setShowCreateProduct(true)}
                  style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  + Add Product / Service
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {products.map((prod) => (
                  <div key={prod.id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: '0 0 4px', color: '#4ade80' }}>{prod.name}</h4>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#334155' }}>v{prod.version}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>{prod.type}</div>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 12px' }}>{prod.description || 'No description provided.'}</p>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Lifecycle Status: <span style={{ color: '#38bdf8' }}>{prod.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '24px', borderLeft: '4px solid #38bdf8' }}>
                <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#f8fafc' }}>{currentCompany.name}</h2>
                {currentCompany.description && <p style={{ color: '#cbd5e1', margin: '0 0 12px' }}>{currentCompany.description}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>Mission</span>
                    <p style={{ margin: '4px 0 0', color: '#e2e8f0', fontSize: '14px' }}>{currentCompany.mission || 'No company mission defined.'}</p>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#a855f7', textTransform: 'uppercase' }}>Vision</span>
                    <p style={{ margin: '4px 0 0', color: '#e2e8f0', fontSize: '14px' }}>{currentCompany.vision || 'No company vision defined.'}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Active Projects', value: overview?.activeProjectsCount ?? projects.length, color: '#38bdf8' },
                  { label: 'Products & Services', value: overview?.productsCount ?? products.length, color: '#4ade80' },
                  { label: 'Customers', value: overview?.customersCount ?? customers.length, color: '#fbbf24' },
                  { label: 'Assigned Agents', value: overview?.assignedAgentsCount ?? workforce.length, color: '#c084fc' },
                  { label: 'Active Objectives', value: objectives.length, color: '#f87171' }
                ].map((stat, i) => (
                  <div key={i} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: BUSINESS LIFECYCLE */}
          {activeTab === 'lifecycle' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>15-Stage Business Lifecycle Engine</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lifecycleStages.map((stage, idx) => (
                  <div
                    key={stage.stage}
                    style={{
                      backgroundColor: '#1e293b',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      border: '1px solid #334155'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '16px',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '13px'
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#f8fafc' }}>{stage.displayName}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stage.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {stage.responsibleAgentIds.map((agentId) => (
                        <span key={agentId} style={{ padding: '3px 8px', backgroundColor: '#0f172a', borderRadius: '4px', fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>
                          {agentId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
          No companies available. Click "+ New Company" to initialize your first persistent enterprise.
        </div>
      )}

      {/* CREATE COMPANY MODAL */}
      {showCreateCompany && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '480px', color: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 16px', color: '#38bdf8' }}>Create New Company</h3>
            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  placeholder="e.g. Sovereign AI Inc"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Mission</label>
                <input
                  type="text"
                  value={newCompanyMission}
                  onChange={(e) => setNewCompanyMission(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  placeholder="e.g. Build sovereign AI products"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateCompany(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {loading ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OBJECTIVE MODAL */}
      {showCreateObjective && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '480px', color: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 16px', color: '#38bdf8' }}>Add Strategic / Operational Objective</h3>
            <form onSubmit={handleCreateObjective} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Objective Title *</label>
                <input
                  type="text"
                  required
                  value={newObjTitle}
                  onChange={(e) => setNewObjTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  placeholder="e.g. Launch Cloud Analytics MVP"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Category</label>
                <select
                  value={newObjCategory}
                  onChange={(e) => setNewObjCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                >
                  <option value="STRATEGIC">STRATEGIC</option>
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="FINANCIAL">FINANCIAL</option>
                  <option value="PRODUCT">PRODUCT</option>
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="GROWTH">GROWTH</option>
                  <option value="TECHNICAL">TECHNICAL</option>
                  <option value="COMPLIANCE">COMPLIANCE</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Owner Agent</label>
                <select
                  value={newObjOwner}
                  onChange={(e) => setNewObjOwner(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                >
                  {['Aja', 'Rahu', 'Ritvan', 'Tvas', 'Spoota', 'Gāṇḍīva', 'Vighna', 'Raudra', 'Rutam', 'Arvan', 'Tāraka', 'Kalki', 'Garuḍa', 'Kali', 'KĀLA', 'Yama', 'Mṛtyu'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateObjective(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Save Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE KPI MODAL */}
      {showCreateKpi && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '480px', color: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 16px', color: '#4ade80' }}>Record New Key Performance Indicator</h3>
            <form onSubmit={handleCreateKpi} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Metric Name *</label>
                <input
                  type="text"
                  required
                  value={newKpiName}
                  onChange={(e) => setNewKpiName(e.target.value)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  placeholder="e.g. System Uptime"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Target Value</label>
                  <input
                    type="number"
                    value={newKpiTarget}
                    onChange={(e) => setNewKpiTarget(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Current Value</label>
                  <input
                    type="number"
                    value={newKpiCurrent}
                    onChange={(e) => setNewKpiCurrent(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateKpi(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Record KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

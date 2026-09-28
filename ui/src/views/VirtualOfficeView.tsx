import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Zap,
  ArrowRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Bot,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Terminal,
  FileCode,
  Shield,
  Layers,
  X,
  Radio,
  Share2
} from 'lucide-react';
import { api } from '../services/api';

export type DepartmentKey = 'MARKETING' | 'EMAILS' | 'DELIVERY' | 'SALES' | 'FINANCE' | 'OPERATIONS';

interface DepartmentPod {
  id: DepartmentKey;
  name: string;
  agentCount: number;
  color: string;
  dotColor: string;
  metrics: { label: string; value: string | number }[];
  doing: number;
  next: number;
  done: number;
  desks: {
    id: string;
    label: string;
    agentId: string;
    isLead?: boolean;
    x: number;
    y: number;
  }[];
  // Center coordinate for SVG walkways and lines
  cx: number;
  cy: number;
}

const DEPARTMENTS: DepartmentPod[] = [
  {
    id: 'MARKETING',
    name: 'MARKETING',
    agentCount: 6,
    color: '#F43F5E',
    dotColor: '#F43F5E',
    metrics: [
      { label: 'NEW INSIGHTS', value: 3 },
      { label: 'COST PER USER', value: '$41' }
    ],
    doing: 6,
    next: 5,
    done: 7,
    cx: 190,
    cy: 480,
    desks: [
      { id: 'm_res', label: 'RESEARCH', agentId: 'rahu', x: 130, y: 440 },
      { id: 'm_gf', label: 'GRAPHICS DESIGNER', agentId: 'spoota', x: 80, y: 490 },
      { id: 'm_nl', label: 'NEWSLETTER', agentId: 'raudra', x: 210, y: 450 },
      { id: 'm_ig', label: 'INSTAGRAM ORGANIC', agentId: 'taraka', x: 100, y: 530 },
      { id: 'm_ad', label: 'META ADS', agentId: 'arvan', x: 170, y: 500 },
      { id: 'm_vd', label: 'VIDEO EDITOR', agentId: 'kali', x: 160, y: 550 }
    ]
  },
  {
    id: 'EMAILS',
    name: 'EMAILS',
    agentCount: 5,
    color: '#10B981',
    dotColor: '#10B981',
    metrics: [
      { label: 'EMAILS SENT', value: 128 },
      { label: 'REPLIES DRAFTED', value: 41 }
    ],
    doing: 5,
    next: 10,
    done: 9,
    cx: 360,
    cy: 280,
    desks: [
      { id: 'e_lead', label: '★ EMAILS LEAD', agentId: 'aja', isLead: true, x: 360, y: 235 },
      { id: 'e_cl', label: 'CLIENT EMAILS', agentId: 'taraka', x: 300, y: 275 },
      { id: 'e_in', label: 'INTERNAL EMAILS', agentId: 'rutam', x: 400, y: 275 },
      { id: 'e_vd', label: 'VENDOR EMAILS', agentId: 'kaala', x: 290, y: 315 },
      { id: 'e_ct', label: 'CONTRACTOR EMAILS', agentId: 'mrtyu', x: 350, y: 320 }
    ]
  },
  {
    id: 'DELIVERY',
    name: 'DELIVERY',
    agentCount: 7,
    color: '#0EA5E9',
    dotColor: '#0EA5E9',
    metrics: [
      { label: 'REPORTS SENT', value: 10 },
      { label: 'ON TRACK', value: '11 / 12' }
    ],
    doing: 7,
    next: 8,
    done: 8,
    cx: 640,
    cy: 290,
    desks: [
      { id: 'd_lead', label: '★ DELIVERY LEAD', agentId: 'tvas', isLead: true, x: 670, y: 235 },
      { id: 'd_pc', label: 'PROJECT CO-ORDINATOR', agentId: 'rahu', x: 600, y: 275 },
      { id: 'd_qa', label: 'QUALITY ASSURANCE', agentId: 'vighna', x: 690, y: 275 },
      { id: 'd_cr', label: 'CLIENT REPORTS', agentId: 'ritvan', x: 550, y: 310 },
      { id: 'd_ca', label: 'CLIENT ASSETS', agentId: 'gandiva', x: 640, y: 310 },
      { id: 'd_da', label: 'DESIGNER ASSISTANT', agentId: 'spoota', x: 510, y: 345 },
      { id: 'd_ob', label: 'ONBOARDER', agentId: 'kalki', x: 580, y: 350 }
    ]
  },
  {
    id: 'SALES',
    name: 'SALES',
    agentCount: 6,
    color: '#F59E0B',
    dotColor: '#F59E0B',
    metrics: [
      { label: 'CALLS S·A·J', value: '14·31·16' },
      { label: 'NEW MANAGERS', value: 5 },
      { label: 'AUTO-ONBOARDED', value: 17 }
    ],
    doing: 6,
    next: 7,
    done: 6,
    cx: 660,
    cy: 530,
    desks: [
      { id: 's_lead', label: '★ SALES LEAD', agentId: 'kalki', isLead: true, x: 680, y: 475 },
      { id: 's_le', label: 'LEAD ENRICHER', agentId: 'raudra', x: 630, y: 510 },
      { id: 's_ib', label: 'INBOUND LEADS', agentId: 'taraka', x: 695, y: 510 },
      { id: 's_pr', label: 'PROSPECTOR', agentId: 'arvan', x: 570, y: 545 },
      { id: 's_pp', label: 'PROPOSALS', agentId: 'aja', x: 640, y: 550 },
      { id: 's_fu', label: 'FOLLOW UPS', agentId: 'kaala', x: 560, y: 580 }
    ]
  },
  {
    id: 'OPERATIONS',
    name: 'OPERATIONS',
    agentCount: 5,
    color: '#8B5CF6',
    dotColor: '#8B5CF6',
    metrics: [
      { label: 'PROPOSALS MADE', value: 6 },
      { label: 'NEW INSIGHTS', value: 5 }
    ],
    doing: 5,
    next: 6,
    done: 7,
    cx: 210,
    cy: 710,
    desks: [
      { id: 'o_int', label: 'INTEL', agentId: 'rahu', x: 230, y: 660 },
      { id: 'o_cc', label: 'COMPLIANCE CHECKER', agentId: 'rutam', x: 140, y: 690 },
      { id: 'o_lr', label: 'LEGAL REVIEW', agentId: 'ritvan', x: 250, y: 690 },
      { id: 'o_ir', label: 'INTERNAL REPORTING', agentId: 'garuda', x: 210, y: 725 },
      { id: 'o_db', label: 'INTERNAL DASHBOARDS', agentId: 'spoota', x: 150, y: 725 }
    ]
  },
  {
    id: 'FINANCE',
    name: 'FINANCE',
    agentCount: 4,
    color: '#6366F1',
    dotColor: '#6366F1',
    metrics: [
      { label: 'INVOICES ISSUED', value: 23 },
      { label: 'BILLS PAID', value: 14 }
    ],
    doing: 4,
    next: 5,
    done: 9,
    cx: 460,
    cy: 710,
    desks: [
      { id: 'f_lead', label: '★ ACCOUNTING LEAD', agentId: 'kaala', isLead: true, x: 490, y: 660 },
      { id: 'f_inv', label: 'INVOICING', agentId: 'yama', x: 420, y: 690 },
      { id: 'f_ap', label: 'ACCOUNTS PAYABLE', agentId: 'mrtyu', x: 490, y: 690 },
      { id: 'f_rec', label: 'RECONCILIATION', agentId: 'kalki', x: 410, y: 730 }
    ]
  }
];

const INTEGRATION_APPS = [
  { name: 'Meta', icon: '♾️', color: '#0668E1' },
  { name: 'Canva', icon: '🎨', color: '#00C4CC' },
  { name: 'HubSpot', icon: '🟠', color: '#FF7A59' },
  { name: 'Slack', icon: '💬', color: '#4A154B' },
  { name: 'Asana', icon: '🔺', color: '#F06A6A' },
  { name: 'Google Drive', icon: '▲', color: '#1FA463' },
  { name: 'Notion', icon: '📓', color: '#000000' },
  { name: 'Pipedrive', icon: '🟢', color: '#26292C', badge: 'pd' },
  { name: 'Stripe', icon: '💳', color: '#635BFF' },
  { name: 'Linear', icon: '📐', color: '#5E6AD2' },
  { name: 'Discord', icon: '🎮', color: '#5865F2' },
  { name: 'Gmail', icon: '✉️', color: '#EA4335' }
];

interface TaskStatusItem {
  id: string;
  percent: number;
  title: string;
  role: string;
  dept: string;
  timeAgo: string;
  stage: 'BACKLOG' | 'IN_PROGRESS' | 'WAITING' | 'DONE';
}

export const VirtualOfficeView: React.FC = () => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [timeString, setTimeString] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'BACKLOG' | 'IN_PROGRESS' | 'WAITING' | 'DONE'>('ALL');
  const [selectedDept, setSelectedDept] = useState<DepartmentKey>('MARKETING');
  const [taskInput, setTaskInput] = useState<string>('');
  const [activeDeskId, setActiveDeskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskStatusItem | null>(null);
  const [pulseBrain, setPulseBrain] = useState<boolean>(true);
  const [brainActivity, setBrainActivity] = useState<string>('CLIENT EMAILS READ ICP');

  // Live Tasks list
  const [taskList, setTaskList] = useState<TaskStatusItem[]>([
    {
      id: 'task_1',
      percent: 12,
      title: 'Data retention check, 3 systems',
      role: 'COMPLIANCE CHECKER',
      dept: 'OPERATIONS',
      timeAgo: 'just now',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_2',
      percent: 15,
      title: 'Verify mobiles on the AU batch',
      role: 'LEAD ENRICHER',
      dept: 'SALES',
      timeAgo: 'just now',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_3',
      percent: 21,
      title: 'Refresh the fatigued ad set',
      role: 'META ADS',
      dept: 'MARKETING',
      timeAgo: '1 min',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_4',
      percent: 26,
      title: 'Rebuild the welcome sequence, email 2',
      role: 'NEWSLETTER',
      dept: 'MARKETING',
      timeAgo: '1 min',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_5',
      percent: 32,
      title: 'Weekly competitor pricing scan',
      role: 'RESEARCH',
      dept: 'MARKETING',
      timeAgo: '1 min',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_6',
      percent: 33,
      title: 'Weekly dashboard health check',
      role: 'INTERNAL DASHBOARDS',
      dept: 'OPERATIONS',
      timeAgo: '1 min',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_7',
      percent: 49,
      title: 'Monthly KPI roll-up',
      role: 'INTERNAL REPORTING',
      dept: 'OPERATIONS',
      timeAgo: '1 min',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_8',
      percent: 82,
      title: 'Tighten the ICP with Prospector',
      role: 'SALES LEAD',
      dept: 'SALES',
      timeAgo: '1 min',
      stage: 'IN_PROGRESS'
    },
    {
      id: 'task_9',
      percent: 100,
      title: 'Universal AI Model Fleet Calibration',
      role: 'DELIVERY LEAD',
      dept: 'DELIVERY',
      timeAgo: '4 min',
      stage: 'DONE'
    },
    {
      id: 'task_10',
      percent: 0,
      title: 'Prepare contractor invoice receipts',
      role: 'INVOICING',
      dept: 'FINANCE',
      timeAgo: '6 min',
      stage: 'BACKLOG'
    }
  ]);

  // Live Clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).toLowerCase()
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodic simulated data pulses (Laser connections)
  useEffect(() => {
    const activities = [
      'CLIENT EMAILS READ ICP',
      'GANDIVA GENERATED PATCH',
      'RUTAM REVIEWED COMPLIANCE RULES',
      'SPURTA RENDERED AD ASSETS',
      'KALKI COMMITTED STABLE RELEASE'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % activities.length;
      setBrainActivity(activities[idx]);
      setPulseBrain((prev) => !prev);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    const newTask: TaskStatusItem = {
      id: `task_${Date.now()}`,
      percent: 0,
      title: taskInput.trim(),
      role: `${selectedDept} AGENT`,
      dept: selectedDept,
      timeAgo: 'just now',
      stage: 'IN_PROGRESS'
    };

    setTaskList((prev) => [newTask, ...prev]);
    setTaskInput('');

    // Trigger backend ticket creation
    api.createOfficeTicket({
      title: newTask.title,
      description: `Task dispatched to ${selectedDept} department.`,
      priority: 'HIGH',
      initialRole: newTask.role,
      autoAdvance: true
    }).catch(() => {});
  };

  const filteredTasks = taskList.filter((t) => {
    if (filterTab === 'ALL') return true;
    return t.stage === filterTab;
  });

  const backlogCount = taskList.filter((t) => t.stage === 'BACKLOG').length;
  const inProgressCount = taskList.filter((t) => t.stage === 'IN_PROGRESS').length;
  const waitingCount = taskList.filter((t) => t.stage === 'WAITING').length;
  const doneCount = taskList.filter((t) => t.stage === 'DONE').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 'calc(100vh - 120px)',
        background: '#FAF8F5',
        color: '#241E19',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. TOP HEADER BAR */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #EAE5DD',
          zIndex: 20
        }}
      >
        {/* Left: Branding & Connected Apps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'serif',
                fontWeight: 800,
                fontSize: '15px',
                letterSpacing: '1.2px',
                color: '#1A1612'
              }}
            >
              AGENTS OFFICE
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#9E948A',
                letterSpacing: '0.5px'
              }}
            >
              v3
            </span>
          </div>

          {/* Connected Integrations Ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px', borderLeft: '1px solid #E5DFD5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#786F66', letterSpacing: '0.6px' }}>
                CONNECTED TO
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
              {INTEGRATION_APPS.map((app) => (
                <div
                  key={app.name}
                  title={app.name}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: app.badge ? '#22C55E' : '#FFFFFF',
                    border: '1px solid #E8E2D8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: app.badge ? '#FFF' : '#333',
                    fontWeight: 700,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    cursor: 'pointer'
                  }}
                >
                  {app.badge ? app.badge : app.icon}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Headless runtime info & Live Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#786F66', letterSpacing: '0.6px' }}>
              RUNS HEADLESS ON
            </span>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
              <span title="Groq LPU (~800 tok/s)" style={{ fontSize: '13px' }}>⚡</span>
              <span title="NVIDIA NIM GPU" style={{ fontSize: '13px' }}>⚙️</span>
              <span title="Local Sovereign Ollama" style={{ fontSize: '13px' }}>🔒</span>
            </div>
          </div>

          {/* Digital Clock */}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1A1612',
              letterSpacing: '0.5px'
            }}
          >
            {timeString || '05:44:10 pm'}
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT: ISOMETRIC CANVAS (LEFT) + TASK QUEUE (RIGHT) */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* ================= LEFT: ISOMETRIC OFFICE FLOOR ================= */}
        <div
          style={{
            flex: '1 1 72%',
            position: 'relative',
            background: 'radial-gradient(circle at center, #FCFBF9 0%, #F5F1EB 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Zoomable & Pannable Canvas Wrapper */}
          <div
            style={{
              width: '900px',
              height: '840px',
              position: 'relative',
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* SVG Connecting Walkways, Laser Beams, and Platforms */}
            <svg
              viewBox="0 0 900 840"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              <defs>
                {/* Linear Gradients for Walkways */}
                <linearGradient id="walkwayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E2DDD5" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#CEC7BC" stopOpacity="0.8" />
                </linearGradient>
                {/* Glow Filter for Laser Beams */}
                <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Central Walkways connecting Pods to Central Junction */}
              {/* Central Junction Hub at (400, 480) */}
              <path d="M 230 480 L 400 480 L 610 330" stroke="url(#walkwayGrad)" strokeWidth="22" strokeLinecap="round" />
              <path d="M 370 330 L 400 480 L 440 680" stroke="url(#walkwayGrad)" strokeWidth="22" strokeLinecap="round" />
              <path d="M 230 680 L 400 480 L 620 550" stroke="url(#walkwayGrad)" strokeWidth="22" strokeLinecap="round" />

              {/* Animated Dotted Laser Data Flow Lines to "THE BRAIN" */}
              {/* Marketing -> The Brain */}
              <path
                d="M 190 440 Q 280 380 380 390"
                fill="none"
                stroke="#F43F5E"
                strokeWidth="2"
                strokeDasharray="4 6"
                style={{ opacity: 0.6 }}
              />
              {/* Emails -> The Brain */}
              <path
                d="M 360 300 Q 370 340 380 380"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="4 6"
                style={{ opacity: 0.6 }}
              />
              {/* Delivery -> The Brain */}
              <path
                d="M 600 300 Q 480 330 420 380"
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="2"
                strokeDasharray="4 6"
                style={{ opacity: 0.6 }}
              />
              {/* Sales -> The Brain */}
              <path
                d="M 620 510 Q 520 440 420 410"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="4 6"
                style={{ opacity: 0.6 }}
              />
              {/* Operations -> The Brain */}
              <path
                d="M 230 670 Q 300 520 380 420"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeDasharray="4 6"
                style={{ opacity: 0.6 }}
              />

              {/* Isometric 3D Platform Foundations (Shadows + Slabs) */}
              {DEPARTMENTS.map((dept) => {
                // Approximate isometric rhombus polygon for pod floor
                const rx = dept.cx - 20;
                const ry = dept.cy + 10;
                return (
                  <g key={dept.id}>
                    {/* Shadow */}
                    <polygon
                      points={`${rx - 110},${ry + 10} ${rx + 20},${ry - 50} ${rx + 130},${ry + 10} ${rx},${ry + 70}`}
                      fill="rgba(0,0,0,0.06)"
                      transform="translate(10, 16)"
                    />
                    {/* 3D Isometric Side Extrusions */}
                    <polygon
                      points={`${rx - 110},${ry + 10} ${rx},${ry + 70} ${rx},${ry + 82} ${rx - 110},${ry + 22}`}
                      fill="#CFC8BD"
                    />
                    <polygon
                      points={`${rx + 130},${ry + 10} ${rx},${ry + 70} ${rx},${ry + 82} ${rx + 130},${ry + 22}`}
                      fill="#B8B0A3"
                    />
                    {/* Top Surface Slab */}
                    <polygon
                      points={`${rx - 110},${ry + 10} ${rx + 20},${ry - 50} ${rx + 130},${ry + 10} ${rx},${ry + 70}`}
                      fill="#EAE5DC"
                      stroke="#DFD8CE"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Render Department Floating Metric Cards & 3D Desks */}
            {DEPARTMENTS.map((dept) => (
              <div key={dept.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                
                {/* 1. Floating Department Info Card (White Glassmorphic Card) */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${dept.cx - 95}px`,
                    top: `${dept.cy - 165}px`,
                    width: '185px',
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #ECE7DF',
                    pointerEvents: 'auto',
                    zIndex: 10,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  {/* Card Header with Department Name & Agent Count */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dept.dotColor }} />
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#332D27', letterSpacing: '0.8px' }}>
                        {dept.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#1A1612', fontFamily: 'serif' }}>
                        {dept.agentCount}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#8C837A', letterSpacing: '0.5px' }}>
                        AGENTS
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Metrics List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid #F0ECE4', paddingTop: '6px', marginBottom: '8px' }}>
                    {dept.metrics.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#8C837A', letterSpacing: '0.5px' }}>
                          {m.label}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#241E19' }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Pipeline Progress: DOING / NEXT / DONE */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#F9F7F4',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: '#6E665E'
                    }}
                  >
                    <div>DOING <strong style={{ color: '#1A1612' }}>{dept.doing}</strong></div>
                    <div>NEXT <strong style={{ color: '#1A1612' }}>{dept.next}</strong></div>
                    <div>DONE <strong style={{ color: '#1A1612' }}>{dept.done}</strong></div>
                  </div>
                </div>

                {/* 2. 3D Desks with Computers, Chairs, and Agent Labels */}
                {dept.desks.map((desk) => (
                  <div
                    key={desk.id}
                    onClick={() => setActiveDeskId(desk.id)}
                    style={{
                      position: 'absolute',
                      left: `${desk.x}px`,
                      top: `${desk.y}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      zIndex: 8,
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    {/* Desk Name Pill Tag */}
                    <div
                      style={{
                        background: desk.isLead ? '#FFF8E6' : 'rgba(255, 255, 255, 0.95)',
                        border: desk.isLead ? '1px solid #F59E0B' : '1px solid #DFD9CE',
                        borderRadius: '10px',
                        padding: '2px 7px',
                        fontSize: '8.5px',
                        fontWeight: 700,
                        color: desk.isLead ? '#B45309' : '#473F37',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                        marginBottom: '2px',
                        letterSpacing: '0.3px'
                      }}
                    >
                      {desk.label}
                    </div>

                    {/* Cute 3D Isometric Wooden Desk Graphic */}
                    <div
                      style={{
                        width: '38px',
                        height: '24px',
                        position: 'relative'
                      }}
                    >
                      {/* Desk Top */}
                      <div
                        style={{
                          width: '34px',
                          height: '16px',
                          background: '#C4A482',
                          borderRadius: '3px',
                          border: '1px solid #A88663',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {/* Laptop Monitor */}
                        <div
                          style={{
                            width: '10px',
                            height: '7px',
                            background: '#2B2724',
                            borderRadius: '1px',
                            border: '1px solid #4D453E',
                            boxShadow: '0 0 3px rgba(0, 229, 255, 0.5)'
                          }}
                        />
                      </div>
                      {/* Desk Legs */}
                      <div
                        style={{
                          width: '32px',
                          height: '5px',
                          margin: '0 auto',
                          background: '#8F6E4D',
                          borderRadius: '0 0 2px 2px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* ================= CENTRAL NODE: "THE BRAIN" ================= */}
            <div
              style={{
                position: 'absolute',
                left: '300px',
                top: '380px',
                width: '200px',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '10px 14px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
                border: '1px solid #EAE4DA',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                zIndex: 15
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: pulseBrain ? '0 0 8px #10B981' : 'none',
                    transition: 'box-shadow 0.3s ease'
                  }}
                />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1A1612', letterSpacing: '0.8px' }}>
                  THE BRAIN
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#8C837A' }}>
                  37 NOTES
                </span>
              </div>

              {/* Dynamic Live Action Speech Capsule */}
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: '#047857',
                  letterSpacing: '0.5px',
                  marginTop: '4px',
                  boxShadow: '0 1px 3px rgba(16, 185, 129, 0.15)'
                }}
              >
                {brainActivity}
              </div>
            </div>

          </div>

          {/* Isometric Zoom & Pan Controls (Bottom-Right) */}
          <div
            style={{
              position: 'absolute',
              right: '24px',
              bottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 20
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))}
              title="Zoom In"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #E2DCD2',
                color: '#332D27',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '16px'
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
              title="Zoom Out"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #E2DCD2',
                color: '#332D27',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '16px'
              }}
            >
              −
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Reset View"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #E2DCD2',
                color: '#332D27',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              ⌂
            </button>
          </div>
        </div>

        {/* ================= RIGHT: TASK QUEUE & BRAIN SIDEBAR ================= */}
        <div
          style={{
            flex: '0 0 380px',
            width: '380px',
            background: '#FFFFFF',
            borderLeft: '1px solid #EAE4DA',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            zIndex: 15
          }}
        >
          {/* 1. Quick Task Dispatch Input Box */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #F0ECE4' }}>
            <form
              onSubmit={handleAddTask}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#FFFFFF',
                border: '1px solid #E0D9CE',
                borderRadius: '24px',
                padding: '4px 6px 4px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              {/* Department Dropdown Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '8px', borderRight: '1px solid #E8E2D8' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F43F5E' }} />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value as DepartmentKey)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#332D27',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    outline: 'none',
                    textTransform: 'uppercase'
                  }}
                >
                  <option value="MARKETING">MARKETING</option>
                  <option value="EMAILS">EMAILS</option>
                  <option value="DELIVERY">DELIVERY</option>
                  <option value="SALES">SALES</option>
                  <option value="OPERATIONS">OPERATIONS</option>
                  <option value="FINANCE">FINANCE</option>
                </select>
              </div>

              {/* Task Title Input */}
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder={`Type a task for ${selectedDept.toLowerCase()}...`}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: '#1A1612',
                  outline: 'none'
                }}
              />

              {/* ADD Button */}
              <button
                type="submit"
                style={{
                  background: '#1A1612',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                ADD
              </button>
            </form>
          </div>

          {/* 2. THE BRAIN Card Widget */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F0ECE4' }}>
            <div
              style={{
                background: '#FAF8F5',
                border: '1px solid #EAE4DA',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {/* Neural Network Mini Graph Icon */}
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  border: '1px solid #E2DCD2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}
              >
                🕸️
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1A1612', letterSpacing: '0.5px' }}>
                    THE BRAIN
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#8C837A' }}>
                    37 NOTES
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#665E54', marginTop: '2px' }}>
                  Last read <strong>icp</strong> by CLIENT EMAILS · 5:44 pm
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#1A1612',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Open the Brain →
                </div>
              </div>
            </div>
          </div>

          {/* 3. TASK STATUS FILTER TABS */}
          <div style={{ padding: '14px 18px 8px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'serif', fontSize: '15px', fontWeight: 800, color: '#1A1612', letterSpacing: '0.8px' }}>
                  TASK STATUS
                </span>
                <span
                  style={{
                    background: '#F0ECE4',
                    color: '#786F66',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px'
                  }}
                >
                  DEMO
                </span>
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#8C837A', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                WHOLE OFFICE
              </span>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilterTab('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: filterTab === 'ALL' ? '#1A1612' : '#F4F0E8',
                  color: filterTab === 'ALL' ? '#FFFFFF' : '#6E665E',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ALL {taskList.length}
              </button>
              <button
                onClick={() => setFilterTab('BACKLOG')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: filterTab === 'BACKLOG' ? '#1A1612' : '#F4F0E8',
                  color: filterTab === 'BACKLOG' ? '#FFFFFF' : '#6E665E',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                BACKLOG {backlogCount}
              </button>
              <button
                onClick={() => setFilterTab('IN_PROGRESS')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: filterTab === 'IN_PROGRESS' ? '#1A1612' : '#F4F0E8',
                  color: filterTab === 'IN_PROGRESS' ? '#FFFFFF' : '#6E665E',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                IN PROGRESS {inProgressCount}
              </button>
              <button
                onClick={() => setFilterTab('WAITING')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: filterTab === 'WAITING' ? '#1A1612' : '#F4F0E8',
                  color: filterTab === 'WAITING' ? '#FFFFFF' : '#6E665E',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                WAITING {waitingCount}
              </button>
              <button
                onClick={() => setFilterTab('DONE')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: filterTab === 'DONE' ? '#1A1612' : '#F4F0E8',
                  color: filterTab === 'DONE' ? '#FFFFFF' : '#6E665E',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                DONE {doneCount}
              </button>
            </div>
          </div>

          {/* 4. TASK ITEMS LIST */}
          <div style={{ flex: 1, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #ECE7DF',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {/* Progress Pill % */}
                  <div
                    style={{
                      border: '1.5px solid #241E19',
                      borderRadius: '12px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#1A1612',
                      flexShrink: 0
                    }}
                  >
                    {task.percent}%
                  </div>

                  {/* Title & Subtitle */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A1612' }}>
                        {task.title}
                      </span>
                      <span style={{ fontSize: '10px', color: '#9E948A', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                        {task.timeAgo}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C837A', letterSpacing: '0.4px', marginTop: '3px' }}>
                      {task.role} · {task.dept}
                    </div>

                    {/* Progress Bar Line */}
                    <div style={{ width: '100%', height: '3px', background: '#F0ECE4', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${task.percent}%`,
                          height: '100%',
                          background: task.percent === 100 ? '#10B981' : '#1A1612',
                          borderRadius: '2px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* 5. TICKET / DESK INSPECTOR MODAL */}
      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={() => setSelectedTask(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '560px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              border: '1px solid #EAE5DD',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#F43F5E', letterSpacing: '0.8px' }}>
                  {selectedTask.dept}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1612', margin: '4px 0 0 0' }}>
                  {selectedTask.title}
                </h2>
                <div style={{ fontSize: '12px', color: '#6E665E', marginTop: '2px' }}>
                  Assigned to: <strong>{selectedTask.role}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9E948A' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, marginBottom: '6px' }}>
                <span>Progress</span>
                <span>{selectedTask.percent}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#F0ECE4', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${selectedTask.percent}%`, height: '100%', background: '#10B981', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Execution Stream / Logs */}
            <div
              style={{
                background: '#1A1612',
                color: '#E5E0D8',
                borderRadius: '8px',
                padding: '12px 14px',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: 1.5,
                maxHeight: '180px',
                overflowY: 'auto'
              }}
            >
              <div>[17:54:10] Agent initialized on sovereign fleet (Groq LPU ~800 tok/s).</div>
              <div>[17:54:12] Reading requirements from THE BRAIN neural notes.</div>
              <div>[17:54:14] Tool call: terminal.execute & git diff generation.</div>
              <div style={{ color: '#34D399' }}>[17:54:16] Verification passed: 0 errors detected.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedTask(null)}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

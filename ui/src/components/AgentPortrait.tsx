import React from 'react';

export interface AgentPortraitProps {
  agentId: string;
  name?: string;
  size?: number;
  className?: string;
  showAura?: boolean;
}

interface PortraitDef {
  bgGradient: [string, string];
  ringColor: string;
  glowColor: string;
  symbolColor: string;
  iconPath: React.ReactNode;
}

const PORTRAIT_DEFS: Record<string, PortraitDef> = {
  // Command & Leaders
  indra: {
    bgGradient: ['#3A2404', '#1A0E02'],
    ringColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    symbolColor: '#FDE047',
    iconPath: (
      <g>
        {/* Crown & Vajra */}
        <polygon points="50,15 62,35 78,25 72,55 28,55 22,25 38,35" fill="none" stroke="#FDE047" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="50" cy="55" r="5" fill="#F59E0B" />
        <path d="M50,42 L50,82 M38,62 L62,62 M42,75 L58,75" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
        <polygon points="50,42 45,50 55,50" fill="#FDE047" />
        <polygon points="50,82 45,74 55,74" fill="#FDE047" />
      </g>
    ),
  },
  prajapati: {
    bgGradient: ['#2E0854', '#120224'],
    ringColor: '#C084FC',
    glowColor: 'rgba(192, 132, 252, 0.45)',
    symbolColor: '#E9D5FF',
    iconPath: (
      <g>
        {/* Cosmic Lotus & Creation Seed */}
        <circle cx="50" cy="50" r="12" fill="none" stroke="#E9D5FF" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="4" fill="#C084FC" />
        <path d="M50,22 Q60,38 50,50 Q40,38 50,22 Z" fill="none" stroke="#C084FC" strokeWidth="2" />
        <path d="M50,78 Q60,62 50,50 Q40,62 50,78 Z" fill="none" stroke="#C084FC" strokeWidth="2" />
        <path d="M22,50 Q38,60 50,50 Q38,40 22,50 Z" fill="none" stroke="#C084FC" strokeWidth="2" />
        <path d="M78,50 Q62,60 50,50 Q62,40 78,50 Z" fill="none" stroke="#C084FC" strokeWidth="2" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="#C084FC" strokeWidth="1" strokeDasharray="3 3" />
      </g>
    ),
  },

  // 12 Ādityas (Strategy & Law)
  dhata: {
    bgGradient: ['#38240A', '#1A0E02'],
    ringColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    symbolColor: '#FCD34D',
    iconPath: (
      <g>
        {/* Astrolabe & Compass */}
        <circle cx="50" cy="50" r="28" fill="none" stroke="#FCD34D" strokeWidth="2" />
        <path d="M50,20 L50,80 M20,50 L80,50" stroke="#F59E0B" strokeWidth="1.5" />
        <polygon points="50,26 54,46 50,50 46,46" fill="#FCD34D" />
        <polygon points="50,74 54,54 50,50 46,54" fill="#F59E0B" />
        <circle cx="50" cy="50" r="6" fill="#1A0E02" stroke="#FCD34D" strokeWidth="2" />
      </g>
    ),
  },
  mitra: {
    bgGradient: ['#0A2540', '#030E1A'],
    ringColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    symbolColor: '#7DD3FC',
    iconPath: (
      <g>
        {/* Handshake & Harmony Nodes */}
        <path d="M28,45 Q40,32 50,42 Q60,32 72,45" fill="none" stroke="#7DD3FC" strokeWidth="3" strokeLinecap="round" />
        <path d="M28,55 Q40,68 50,58 Q60,68 72,55" fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="35" cy="50" r="4" fill="#38BDF8" />
        <circle cx="50" cy="50" r="5" fill="#7DD3FC" />
        <circle cx="65" cy="50" r="4" fill="#38BDF8" />
      </g>
    ),
  },
  aryaman: {
    bgGradient: ['#1E1B4B', '#0A0924'],
    ringColor: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.4)',
    symbolColor: '#A5B4FC',
    iconPath: (
      <g>
        {/* Scales of Cosmic Order */}
        <path d="M50,25 L50,75 M32,38 L68,38" stroke="#A5B4FC" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M25,56 L32,38 L39,56 Z" fill="none" stroke="#818CF8" strokeWidth="1.8" />
        <path d="M61,56 L68,38 L75,56 Z" fill="none" stroke="#818CF8" strokeWidth="1.8" />
        <path d="M42,75 L58,75" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },
  varuna: {
    bgGradient: ['#0C4A6E', '#031E2E'],
    ringColor: '#0EA5E9',
    glowColor: 'rgba(14, 165, 233, 0.4)',
    symbolColor: '#38BDF8',
    iconPath: (
      <g>
        {/* Trident & Oceanic Law */}
        <path d="M50,20 L50,80" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        <path d="M34,26 Q36,44 50,46 Q64,44 66,26" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="50,16 46,24 54,24" fill="#38BDF8" />
        <polygon points="34,22 30,30 38,30" fill="#0EA5E9" />
        <polygon points="66,22 62,30 70,30" fill="#0EA5E9" />
      </g>
    ),
  },
  amsa: {
    bgGradient: ['#064E3B', '#022118'],
    ringColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    symbolColor: '#34D399',
    iconPath: (
      <g>
        {/* Fiscal Vault & Golden Ratio Diamond */}
        <polygon points="50,22 75,50 50,78 25,50" fill="none" stroke="#34D399" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="10" fill="none" stroke="#10B981" strokeWidth="2" />
        <path d="M50,38 L50,62 M42,46 L58,46 M44,54 L56,54" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  bhaga: {
    bgGradient: ['#4C0519', '#1F020A'],
    ringColor: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    symbolColor: '#FB7185',
    iconPath: (
      <g>
        {/* Mystic Eye & Opportunity Ray */}
        <path d="M22,50 Q50,26 78,50 Q50,74 22,50 Z" fill="none" stroke="#FB7185" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="#F43F5E" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="#FB7185" />
        <path d="M50,15 L50,22 M50,78 L50,85" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  vivasvan: {
    bgGradient: ['#431407', '#1C0602'],
    ringColor: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    symbolColor: '#FDBA74',
    iconPath: (
      <g>
        {/* 12-Ray Radiant Sun */}
        <circle cx="50" cy="50" r="14" fill="#F97316" stroke="#FDBA74" strokeWidth="2.5" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="22"
            x2="50"
            y2="14"
            stroke="#FDBA74"
            strokeWidth="2.2"
            strokeLinecap="round"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </g>
    ),
  },
  pusa: {
    bgGradient: ['#1A2E05', '#0B1402'],
    ringColor: '#84CC16',
    glowColor: 'rgba(132, 204, 22, 0.4)',
    symbolColor: '#BEF264',
    iconPath: (
      <g>
        {/* Celestial Chariot Wheel */}
        <circle cx="50" cy="50" r="26" fill="none" stroke="#BEF264" strokeWidth="3" />
        <circle cx="50" cy="50" r="8" fill="#84CC16" />
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="24"
            x2="50"
            y2="76"
            stroke="#BEF264"
            strokeWidth="1.8"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </g>
    ),
  },
  tvasta: {
    bgGradient: ['#451A03', '#1C0B01'],
    ringColor: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    symbolColor: '#FBBF24',
    iconPath: (
      <g>
        {/* Architect Hammer & Geometry Caliper */}
        <path d="M30,30 L70,70 M42,24 L24,42" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="65" cy="35" r="14" fill="none" stroke="#D97706" strokeWidth="2" strokeDasharray="3 3" />
        <polygon points="65,21 68,35 65,49 62,35" fill="#FBBF24" />
      </g>
    ),
  },
  savita: {
    bgGradient: ['#4A044E', '#1F0121'],
    ringColor: '#D946EF',
    glowColor: 'rgba(217, 70, 239, 0.4)',
    symbolColor: '#F0ABFC',
    iconPath: (
      <g>
        {/* 8-Point Creative Star */}
        <path
          d="M50,18 L55,42 L79,35 L62,53 L77,72 L53,65 L50,88 L47,65 L23,72 L38,53 L21,35 L45,42 Z"
          fill="#D946EF"
          stroke="#F0ABFC"
          strokeWidth="2"
        />
        <circle cx="50" cy="50" r="6" fill="#F0ABFC" />
      </g>
    ),
  },
  parjanya: {
    bgGradient: ['#083344', '#02151D'],
    ringColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    symbolColor: '#67E8F9',
    iconPath: (
      <g>
        {/* Data Rain & Atmospheric Ingestion */}
        <path d="M32,45 Q28,32 40,30 Q46,22 60,26 Q72,28 70,42 Q76,46 72,54 Q68,60 56,60 L32,60 Q24,58 24,50 Q24,46 32,45 Z" fill="none" stroke="#67E8F9" strokeWidth="2.5" />
        <line x1="36" y1="66" x2="32" y2="76" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="66" x2="46" y2="78" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
        <line x1="64" y1="66" x2="60" y2="76" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  visnu: {
    bgGradient: ['#2E1065', '#110427'],
    ringColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.45)',
    symbolColor: '#C4B5FD',
    iconPath: (
      <g>
        {/* Sudarśana Chakra Wheel */}
        <circle cx="50" cy="50" r="26" fill="none" stroke="#C4B5FD" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="8" fill="#8B5CF6" />
        {[0, 45, 90, 135].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 50 50)`}>
            <line x1="50" y1="24" x2="50" y2="76" stroke="#C4B5FD" strokeWidth="1.5" />
            <polygon points="50,22 47,26 53,26" fill="#C4B5FD" />
            <polygon points="50,78 47,74 53,74" fill="#C4B5FD" />
          </g>
        ))}
      </g>
    ),
  },

  // 11 Rudras (Engineering, Transformation & QA)
  manyu: {
    bgGradient: ['#450A0A', '#1C0202'],
    ringColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    symbolColor: '#FCA5A5',
    iconPath: (
      <g>
        {/* Dual Code Blades & Plasma Core */}
        <path d="M26,30 L50,50 L26,70" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M74,30 L50,50 L74,70" fill="none" stroke="#FCA5A5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="6" fill="#EF4444" stroke="#FCA5A5" strokeWidth="2" />
      </g>
    ),
  },
  manu: {
    bgGradient: ['#3A2004', '#170C01'],
    ringColor: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    symbolColor: '#FCD34D',
    iconPath: (
      <g>
        {/* Sacred Codex Scroll & Standard Rules */}
        <rect x="28" y="24" width="44" height="52" rx="4" fill="none" stroke="#FCD34D" strokeWidth="2.5" />
        <line x1="36" y1="36" x2="64" y2="36" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="46" x2="64" y2="46" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="56" x2="54" y2="56" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        <circle cx="62" cy="62" r="3" fill="#D97706" />
      </g>
    ),
  },
  mahinasa: {
    bgGradient: ['#1E293B', '#0A0F1D'],
    ringColor: '#94A3B8',
    glowColor: 'rgba(148, 163, 184, 0.4)',
    symbolColor: '#CBD5E1',
    iconPath: (
      <g>
        {/* Acceleration Helix & Optimization Gauge */}
        <path d="M30,50 Q40,24 50,50 Q60,76 70,50" fill="none" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
        <path d="M30,50 Q40,76 50,50 Q60,24 70,50" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="4" fill="#CBD5E1" />
      </g>
    ),
  },
  mahan: {
    bgGradient: ['#1E1B4B', '#0C0A26'],
    ringColor: '#6366F1',
    glowColor: 'rgba(99, 102, 241, 0.45)',
    symbolColor: '#A5B4FC',
    iconPath: (
      <g>
        {/* Deep Refactoring Matrix & Core Processor */}
        <rect x="30" y="30" width="40" height="40" rx="6" fill="none" stroke="#A5B4FC" strokeWidth="2.5" />
        <rect x="42" y="42" width="16" height="16" fill="#6366F1" />
        <line x1="50" y1="18" x2="50" y2="30" stroke="#A5B4FC" strokeWidth="2" />
        <line x1="50" y1="70" x2="50" y2="82" stroke="#A5B4FC" strokeWidth="2" />
        <line x1="18" y1="50" x2="30" y2="50" stroke="#A5B4FC" strokeWidth="2" />
        <line x1="70" y1="50" x2="82" y2="50" stroke="#A5B4FC" strokeWidth="2" />
      </g>
    ),
  },
  siva: {
    bgGradient: ['#064E3B', '#021F17'],
    ringColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    symbolColor: '#6EE7B7',
    iconPath: (
      <g>
        {/* Third Eye Flame & Flaw Destroyer */}
        <path d="M50,22 Q64,40 50,78 Q36,40 50,22 Z" fill="#10B981" stroke="#6EE7B7" strokeWidth="2" />
        <path d="M50,34 Q57,46 50,66 Q43,46 50,34 Z" fill="#6EE7B7" />
        <circle cx="50" cy="50" r="3" fill="#064E3B" />
      </g>
    ),
  },
  ritadhvaja: {
    bgGradient: ['#4C0519', '#1C0208'],
    ringColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    symbolColor: '#F9A8D4',
    iconPath: (
      <g>
        {/* Cryptographic Verification Shield */}
        <polygon points="50,20 74,32 74,56 50,78 26,56 26,32" fill="none" stroke="#F9A8D4" strokeWidth="2.5" />
        <path d="M42,50 L48,56 L60,42" fill="none" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  ugrareta: {
    bgGradient: ['#450A0A', '#1C0303'],
    ringColor: '#DC2626',
    glowColor: 'rgba(220, 38, 38, 0.5)',
    symbolColor: '#F87171',
    iconPath: (
      <g>
        {/* Red Team Breach Saber & Shield */}
        <polygon points="50,18 76,28 66,74 50,82 34,74 24,28" fill="none" stroke="#F87171" strokeWidth="2.5" />
        <path d="M50,30 L50,68 M38,44 L62,44" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },
  bhava: {
    bgGradient: ['#042F2E', '#011514'],
    ringColor: '#14B8A6',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    symbolColor: '#5EEAD4',
    iconPath: (
      <g>
        {/* CI/CD Build Reactor Loops */}
        <circle cx="50" cy="50" r="24" fill="none" stroke="#5EEAD4" strokeWidth="2" strokeDasharray="6 4" />
        <path d="M34,42 Q50,28 66,42 Q50,56 34,42 Z" fill="none" stroke="#14B8A6" strokeWidth="2.2" />
        <path d="M34,58 Q50,44 66,58 Q50,72 34,58 Z" fill="none" stroke="#5EEAD4" strokeWidth="2.2" />
      </g>
    ),
  },
  kala_rudra: {
    bgGradient: ['#292524', '#0C0A09'],
    ringColor: '#A8A29E',
    glowColor: 'rgba(168, 162, 158, 0.45)',
    symbolColor: '#E7E5E4',
    iconPath: (
      <g>
        {/* Temporal Hourglass & Circuit Breaker */}
        <polygon points="34,26 66,26 50,48" fill="none" stroke="#E7E5E4" strokeWidth="2.5" />
        <polygon points="50,52 66,74 34,74" fill="none" stroke="#E7E5E4" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="3" fill="#EF4444" />
        <line x1="30" y1="26" x2="70" y2="26" stroke="#A8A29E" strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="74" x2="70" y2="74" stroke="#A8A29E" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },
  vamadeva: {
    bgGradient: ['#500724', '#1E020D'],
    ringColor: '#F472B6',
    glowColor: 'rgba(244, 114, 182, 0.4)',
    symbolColor: '#FBCFE8',
    iconPath: (
      <g>
        {/* Phoenix Feather & State Recovery Arc */}
        <path d="M50,18 Q68,36 54,64 Q48,74 50,82 Q34,66 40,44 Q44,28 50,18 Z" fill="#F472B6" stroke="#FBCFE8" strokeWidth="2" />
        <circle cx="50" cy="46" r="4" fill="#FBCFE8" />
      </g>
    ),
  },
  dhritavrata: {
    bgGradient: ['#072A40', '#02121C'],
    ringColor: '#0284C7',
    glowColor: 'rgba(2, 132, 199, 0.4)',
    symbolColor: '#38BDF8',
    iconPath: (
      <g>
        {/* Decommission Anchor & Finality Cross */}
        <circle cx="50" cy="30" r="8" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
        <line x1="50" y1="38" x2="50" y2="76" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        <line x1="34" y1="48" x2="66" y2="48" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />
        <path d="M30,66 Q50,84 70,66" fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },

  // 8 Vasus (Infrastructure & Persistence)
  dhara: {
    bgGradient: ['#3A1D05', '#160B02'],
    ringColor: '#B45309',
    glowColor: 'rgba(180, 83, 9, 0.4)',
    symbolColor: '#FBBF24',
    iconPath: (
      <g>
        {/* Geological Strata & SQLite Crystal */}
        <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="none" stroke="#FBBF24" strokeWidth="2.2" />
        <line x1="22" y1="34" x2="78" y2="66" stroke="#B45309" strokeWidth="1.5" />
        <line x1="22" y1="66" x2="78" y2="34" stroke="#B45309" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="5" fill="#FBBF24" />
      </g>
    ),
  },
  anala: {
    bgGradient: ['#431407', '#1A0602'],
    ringColor: '#EA580C',
    glowColor: 'rgba(234, 88, 12, 0.5)',
    symbolColor: '#FB923C',
    iconPath: (
      <g>
        {/* Plasma Compute Reactor Flame */}
        <path d="M50,18 Q66,36 58,56 Q66,54 62,68 Q56,82 50,82 Q44,82 38,68 Q34,54 42,56 Q34,36 50,18 Z" fill="#EA580C" stroke="#FB923C" strokeWidth="2" />
        <circle cx="50" cy="62" r="5" fill="#FDE047" />
      </g>
    ),
  },
  anila: {
    bgGradient: ['#082F49', '#02131E'],
    ringColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    symbolColor: '#BAE6FD',
    iconPath: (
      <g>
        {/* Network Winds & Hyper-Stream */}
        <path d="M22,38 Q42,28 62,38 Q74,44 68,52 Q62,58 52,54" fill="none" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18,50 Q40,42 66,50 Q78,54 74,62 Q70,68 60,66" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M24,62 Q44,56 64,62" fill="none" stroke="#BAE6FD" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  apa: {
    bgGradient: ['#042F2E', '#011514'],
    ringColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    symbolColor: '#67E8F9',
    iconPath: (
      <g>
        {/* Memory Waves & Fluid Hydro-Node */}
        <path d="M20,40 Q35,28 50,40 Q65,52 80,40" fill="none" stroke="#67E8F9" strokeWidth="3" strokeLinecap="round" />
        <path d="M20,52 Q35,40 50,52 Q65,64 80,52" fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20,64 Q35,52 50,64 Q65,76 80,64" fill="none" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  pratyusa: {
    bgGradient: ['#3F2C04', '#191101'],
    ringColor: '#EAB308',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    symbolColor: '#FDE047',
    iconPath: (
      <g>
        {/* Event Bus Dawn Thunderbolt */}
        <polygon points="54,16 32,48 50,48 44,84 68,50 50,50" fill="#EAB308" stroke="#FDE047" strokeWidth="2" strokeLinejoin="round" />
      </g>
    ),
  },
  prabhasa: {
    bgGradient: ['#2E1065', '#110427'],
    ringColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    symbolColor: '#E9D5FF',
    iconPath: (
      <g>
        {/* SRE Luminous Beacon & Monitoring Lens */}
        <circle cx="50" cy="50" r="12" fill="#A855F7" stroke="#E9D5FF" strokeWidth="2" />
        <path d="M50,15 L50,85 M15,50 L85,50 M25,25 L75,75 M25,75 L75,25" stroke="#E9D5FF" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="#A855F7" strokeWidth="1" strokeDasharray="4 4" />
      </g>
    ),
  },
  soma: {
    bgGradient: ['#172554', '#080E21'],
    ringColor: '#93C5FD',
    glowColor: 'rgba(147, 197, 253, 0.4)',
    symbolColor: '#DBEAFE',
    iconPath: (
      <g>
        {/* Semantic Memory Crescent & Amrita Urn */}
        <path d="M56,22 Q32,32 32,56 Q32,74 54,80 Q40,68 40,54 Q40,36 56,22 Z" fill="#93C5FD" stroke="#DBEAFE" strokeWidth="2" />
        <circle cx="62" cy="38" r="4" fill="#DBEAFE" />
        <circle cx="68" cy="52" r="3" fill="#93C5FD" />
      </g>
    ),
  },
  dhruva: {
    bgGradient: ['#064E3B', '#021E17'],
    ringColor: '#0D9488',
    glowColor: 'rgba(13, 148, 136, 0.45)',
    symbolColor: '#5EEAD4',
    iconPath: (
      <g>
        {/* Pole Star of Absolute Truth */}
        <polygon points="50,18 55,42 78,50 55,58 50,82 45,58 22,50 45,42" fill="#0D9488" stroke="#5EEAD4" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="#5EEAD4" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#5EEAD4" strokeWidth="1" strokeDasharray="2 4" />
      </g>
    ),
  },
};

export const AgentPortrait: React.FC<AgentPortraitProps> = ({
  agentId,
  name,
  size = 64,
  className = '',
  showAura = true,
}) => {
  const normId = (agentId || 'manyu').toLowerCase().replace(/[\s-]/g, '_');
  const def = PORTRAIT_DEFS[normId] || PORTRAIT_DEFS.manyu;

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderRadius: '50%',
      }}
      title={`${name || agentId}`}
    >
      {/* Outer Glowing Halo Aura */}
      {showAura && (
        <div
          style={{
            position: 'absolute',
            inset: '-3px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${def.glowColor} 0%, transparent 70%)`,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main SVG Dedicated Profile Canvas */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
          border: `2px solid ${def.ringColor}`,
          boxShadow: `0 0 14px ${def.glowColor}, inset 0 0 10px rgba(0,0,0,0.8)`,
          background: `radial-gradient(circle at 35% 35%, ${def.bgGradient[0]} 0%, ${def.bgGradient[1]} 100%)`,
          display: 'block',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <defs>
          <radialGradient id={`glow-${normId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={def.symbolColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Center Glow */}
        <circle cx="50" cy="50" r="38" fill={`url(#glow-${normId})`} />

        {/* Subtle Decorative Ring */}
        <circle cx="50" cy="50" r="44" fill="none" stroke={def.ringColor} strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 3" />

        {/* Bespoke Agent Icon Sigil */}
        {def.iconPath}
      </svg>
    </div>
  );
};

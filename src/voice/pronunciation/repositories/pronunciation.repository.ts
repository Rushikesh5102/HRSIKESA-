/**
 * HṚṢĪKEŚA (हृषीकेश) — Pronunciation Lexicon Repository
 *
 * Persists and seeds the authoritative protected pronunciation lexicon
 * with provider-independent phonetic representations for Sanskrit,
 * Marathi, Hindi, English, and technical terminology.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PronunciationEntry } from '../interfaces/pronunciation.types.js';
import { ILogger } from '../../../core/logging/logger.types.js';

export const SEED_PRONUNCIATION_LEXICON: readonly PronunciationEntry[] = [
  // 1. BRAND & IDENTITY (CRITICAL)
  {
    canonical: 'HṚṢĪKEŚA',
    aliases: ['Hrisikesa', 'Hrishikesha', 'Hrishikesa', 'HRSIKESA', 'हृषीकेश'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'BRAND',
    syllableBreakdown: 'hṛ - ṣī - ke - śa',
    description: 'Lord of the Senses, Master of the Mind. Canonical sovereign brand token.',
    phoneticVariants: {
      sanskrit: 'hṛ-ṣī-ke-śa',
      hindi: 'हृषीकेश',
      marathi: 'हृषीकेश',
      english: 'Hrishikesha',
      ipa: 'hr̩.ʂiː.keː.ɕɐ',
      sapiPhoneme: 'Hrishikesha',
      piperPhonetic: 'Hrishikesha',
      plainPhonetic: 'Hree-shee-kay-shuh',
    },
  },
  {
    canonical: 'SAHIKARA',
    aliases: ['Sahikara', 'सहिकार'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'BRAND',
    syllableBreakdown: 'sa - hi - ka - ra',
    description: 'Collaborative sovereign workforce co-creator token.',
    phoneticVariants: {
      sanskrit: 'sa-hi-kā-ra',
      hindi: 'सहिकार',
      marathi: 'सहिकार',
      english: 'Sahikaara',
      ipa: 'sɐ.ɦiː.kɑː.rɐ',
      sapiPhoneme: 'Sahikara',
      piperPhonetic: 'Saa-hee-kaa-ruh',
      plainPhonetic: 'Saa-hee-kaa-ra',
    },
  },

  // 2. VEDIC WORKFORCE AGENTS (33 CANONICAL SPECIALISTS)
  // --- LEADERS ---
  {
    canonical: 'Indra',
    aliases: ['indra', 'INDRA', 'इन्द्र', 'इंद्र'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'in - dra',
    description: 'Supreme Field Operations Commander.',
    phoneticVariants: {
      sanskrit: 'in-dra',
      hindi: 'इंद्र',
      marathi: 'इंद्र',
      english: 'Indra',
      ipa: 'ɪn.drɐ',
      sapiPhoneme: 'Indra',
      piperPhonetic: 'In-druh',
      plainPhonetic: 'In-dra',
    },
  },
  {
    canonical: 'Prajāpati',
    aliases: ['Prajapati', 'prajapati', 'PRAJAPATI', 'प्रजापति'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'pra - jā - pa - ti',
    description: 'Workforce Progenitor & Capability Synthesizer.',
    phoneticVariants: {
      sanskrit: 'pra-jā-pa-ti',
      hindi: 'प्रजापति',
      marathi: 'प्रजापती',
      english: 'Prajaapati',
      ipa: 'prɐ.d͡ʒɑː.pɐ.tiː',
      sapiPhoneme: 'Prajapati',
      piperPhonetic: 'Pruh-jaa-puh-tee',
      plainPhonetic: 'Pru-jaa-puh-tee',
    },
  },

  // --- 12 ĀDITYAS (Vision, Intelligence, Governance & Design) ---
  {
    canonical: 'Dhātā',
    aliases: ['Dhata', 'dhata', 'DHATA', 'धाता'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'dhā - tā',
    description: 'Executive Strategy & Vision Architect.',
    phoneticVariants: {
      sanskrit: 'dhā-tā',
      hindi: 'धाता',
      marathi: 'धाता',
      english: 'Dhaataa',
      ipa: 'dʱɑː.tɑː',
      sapiPhoneme: 'Dhata',
      piperPhonetic: 'Dhaa-taa',
      plainPhonetic: 'Dhaa-taa',
    },
  },
  {
    canonical: 'Mitra',
    aliases: ['mitra', 'MITRA', 'मित्र'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'mit - ra',
    description: 'Partnership, Alliance & Customer Contracts.',
    phoneticVariants: {
      sanskrit: 'mit-ra',
      hindi: 'मित्र',
      marathi: 'मित्र',
      english: 'Mitra',
      ipa: 'mɪt.rɐ',
      sapiPhoneme: 'Mitra',
      piperPhonetic: 'Mit-ruh',
      plainPhonetic: 'Mit-ra',
    },
  },
  {
    canonical: 'Aryaman',
    aliases: ['aryaman', 'ARYAMAN', 'अर्यमन्', 'अर्यमा'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ar - ya - man',
    description: 'Corporate Governance, Culture & OKR Alignment.',
    phoneticVariants: {
      sanskrit: 'ar-ya-man',
      hindi: 'अर्यमन',
      marathi: 'अर्यमा',
      english: 'Uryamun',
      ipa: 'ɐr.jɐ.mɐn',
      sapiPhoneme: 'Aryaman',
      piperPhonetic: 'Ar-yuh-mun',
      plainPhonetic: 'Ar-yuh-mun',
    },
  },
  {
    canonical: 'Varuṇa',
    aliases: ['Varuna', 'varuna', 'VARUNA', 'वरुण'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'va - ru - ṇa',
    description: 'Cosmic Law, Compliance & Policy Custodian.',
    phoneticVariants: {
      sanskrit: 'va-ru-ṇa',
      hindi: 'वरुण',
      marathi: 'वरुण',
      english: 'Vuhroona',
      ipa: 'ʋɐ.ru.ɳɐ',
      sapiPhoneme: 'Varuna',
      piperPhonetic: 'Vuh-roo-nuh',
      plainPhonetic: 'Vuh-roo-na',
    },
  },
  {
    canonical: 'Aṁśa',
    aliases: ['Amsa', 'Amsha', 'amsa', 'AMSA', 'अंश'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'am - śa',
    description: 'Equitable Resource Distribution & Financial Accounting.',
    phoneticVariants: {
      sanskrit: 'aṁ-śa',
      hindi: 'अंश',
      marathi: 'अंश',
      english: 'Umsha',
      ipa: 'ɐm.ɕɐ',
      sapiPhoneme: 'Amsha',
      piperPhonetic: 'Um-shuh',
      plainPhonetic: 'Um-sha',
    },
  },
  {
    canonical: 'Bhaga',
    aliases: ['bhaga', 'BHAGA', 'भग'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'bha - ga',
    description: 'Market Intelligence, Share & Growth Strategy.',
    phoneticVariants: {
      sanskrit: 'bha-ga',
      hindi: 'भग',
      marathi: 'भग',
      english: 'Bhuguh',
      ipa: 'bʱɐ.ɡɐ',
      sapiPhoneme: 'Bhaga',
      piperPhonetic: 'Bha-guh',
      plainPhonetic: 'Bha-ga',
    },
  },
  {
    canonical: 'Vivasvān',
    aliases: ['Vivasvan', 'vivasvan', 'VIVASVAN', 'विवस्वान्', 'विवस्वान'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'vi - vas - vān',
    description: 'Public API, Illumination & Outreach.',
    phoneticVariants: {
      sanskrit: 'vi-vas-vān',
      hindi: 'विवस्वान',
      marathi: 'विवस्वान',
      english: 'Veevusvaan',
      ipa: 'ʋi.ʋɐs.ʋɑːn',
      sapiPhoneme: 'Vivasvan',
      piperPhonetic: 'Vee-vus-vaan',
      plainPhonetic: 'Vee-vas-vaan',
    },
  },
  {
    canonical: 'Pūṣā',
    aliases: ['Pusa', 'Poosha', 'pusa', 'PUSA', 'पूषा'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'pū - ṣā',
    description: 'Distribution, Package Delivery & Supply Chains.',
    phoneticVariants: {
      sanskrit: 'pū-ṣā',
      hindi: 'पूषा',
      marathi: 'पूषा',
      english: 'Pooshaa',
      ipa: 'puː.ʂɑː',
      sapiPhoneme: 'Poosha',
      piperPhonetic: 'Poo-shaa',
      plainPhonetic: 'Poo-shaa',
    },
  },
  {
    canonical: 'Tvaṣṭā',
    aliases: ['Tvasta', 'Tvashta', 'tvasta', 'TVASTA', 'त्वष्टा'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'tvaṣ - ṭā',
    description: 'System Architecture & Creative Tool Maker.',
    phoneticVariants: {
      sanskrit: 'tvaṣ-ṭā',
      hindi: 'त्वष्टा',
      marathi: 'त्वष्टा',
      english: 'Tvush-taa',
      ipa: 'tʋɐʂ.ʈɑː',
      sapiPhoneme: 'Tvashta',
      piperPhonetic: 'Tvush-taa',
      plainPhonetic: 'Tvash-taa',
    },
  },
  {
    canonical: 'Savitā',
    aliases: ['Savita', 'savita', 'SAVITA', 'सविता'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'sa - vi - tā',
    description: 'Creative Synthesis, Brand & Multimodal Generation.',
    phoneticVariants: {
      sanskrit: 'sa-vi-tā',
      hindi: 'सविता',
      marathi: 'सविता',
      english: 'Suveetaa',
      ipa: 'sɐ.ʋi.tɑː',
      sapiPhoneme: 'Savita',
      piperPhonetic: 'Suh-vee-taa',
      plainPhonetic: 'Suh-vee-taa',
    },
  },
  {
    canonical: 'Parjanya',
    aliases: ['parjanya', 'PARJANYA', 'पर्जन्य'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'par - jan - ya',
    description: 'Dynamic Resource Provisioning & Cloud Rain.',
    phoneticVariants: {
      sanskrit: 'par-jan-ya',
      hindi: 'पर्जन्य',
      marathi: 'पर्जन्य',
      english: 'Purjunya',
      ipa: 'pɐr.d͡ʒɐn.jɐ',
      sapiPhoneme: 'Parjanya',
      piperPhonetic: 'Pur-jun-yuh',
      plainPhonetic: 'Par-jan-ya',
    },
  },
  {
    canonical: 'Viṣṇu',
    aliases: ['Visnu', 'Vishnu', 'visnu', 'VISNU', 'विष्णु'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'viṣ - ṇu',
    description: 'System Integrity, Harmony & Holistic Alignment.',
    phoneticVariants: {
      sanskrit: 'viṣ-ṇu',
      hindi: 'विष्णु',
      marathi: 'विष्णू',
      english: 'Veeshnoo',
      ipa: 'ʋiʂ.ɳu',
      sapiPhoneme: 'Vishnu',
      piperPhonetic: 'Veesh-noo',
      plainPhonetic: 'Veesh-noo',
    },
  },

  // --- 11 RUDRAS (Engineering, Transformation, Verification & Security) ---
  {
    canonical: 'Manyu',
    aliases: ['manyu', 'MANYU', 'मन्यु'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'man - yu',
    description: 'High-Impact Implementation & Rapid Prototyping.',
    phoneticVariants: {
      sanskrit: 'man-yu',
      hindi: 'मन्यु',
      marathi: 'मन्यू',
      english: 'Munyoo',
      ipa: 'mɐn.ju',
      sapiPhoneme: 'Manyu',
      piperPhonetic: 'Mun-yoo',
      plainPhonetic: 'Mun-yoo',
    },
  },
  {
    canonical: 'Manu',
    aliases: ['manu', 'MANU', 'मनु'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ma - nu',
    description: 'Algorithmic Specifications & Deterministic Logic.',
    phoneticVariants: {
      sanskrit: 'ma-nu',
      hindi: 'मनु',
      marathi: 'मनू',
      english: 'Muhnoo',
      ipa: 'mɐ.nu',
      sapiPhoneme: 'Manu',
      piperPhonetic: 'Muh-noo',
      plainPhonetic: 'Muh-noo',
    },
  },
  {
    canonical: 'Mahinasa',
    aliases: ['mahinasa', 'MAHINASA', 'महिनास'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ma - hi - na - sa',
    description: 'Backend Engine & Systems Architecture.',
    phoneticVariants: {
      sanskrit: 'ma-hi-na-sa',
      hindi: 'महिनास',
      marathi: 'महिनास',
      english: 'Muheenuhsah',
      ipa: 'mɐ.ɦiː.nɐ.sɐ',
      sapiPhoneme: 'Mahinasa',
      piperPhonetic: 'Muh-hee-nuh-suh',
      plainPhonetic: 'Muh-hee-nuh-suh',
    },
  },
  {
    canonical: 'Mahān',
    aliases: ['Mahan', 'mahan', 'MAHAN', 'महान्', 'महान'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ma - hān',
    description: 'Scalability & Distributed High-Throughput Systems.',
    phoneticVariants: {
      sanskrit: 'ma-hān',
      hindi: 'महान',
      marathi: 'महान',
      english: 'Muhaan',
      ipa: 'mɐ.ɦɑːn',
      sapiPhoneme: 'Mahan',
      piperPhonetic: 'Muh-haan',
      plainPhonetic: 'Muh-haan',
    },
  },
  {
    canonical: 'Śiva',
    aliases: ['Siva', 'Shiva', 'siva', 'SIVA', 'शिव'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'śi - va',
    description: 'Code Modernization, Refactoring & Transformation.',
    phoneticVariants: {
      sanskrit: 'śi-va',
      hindi: 'शिव',
      marathi: 'शिव',
      english: 'Sheevuh',
      ipa: 'ɕi.ʋɐ',
      sapiPhoneme: 'Shiva',
      piperPhonetic: 'Shee-vuh',
      plainPhonetic: 'Shee-va',
    },
  },
  {
    canonical: 'Ṛtadhvaja',
    aliases: ['Ritadhvaja', 'ritadhvaja', 'RITADHVAJA', 'ऋतध्वज'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ṛ - ta - dhva - ja',
    description: 'Security Enforcement, Invariant Verification & Risk.',
    phoneticVariants: {
      sanskrit: 'ṛ-ta-dhva-ja',
      hindi: 'ऋतध्वज',
      marathi: 'ऋतध्वज',
      english: 'Ritudhvujuh',
      ipa: 'r̩.tɐ.dʱʋɐ.d͡ʒɐ',
      sapiPhoneme: 'Ritadhvaja',
      piperPhonetic: 'Rit-uh-dhvuh-juh',
      plainPhonetic: 'Rit-a-dhva-ja',
    },
  },
  {
    canonical: 'Ugraretā',
    aliases: ['Ugrareta', 'ugrareta', 'UGRARETA', 'उग्ररेता'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ug - ra - re - tā',
    description: 'Chaos Engineering, Load Testing & Tear-Down.',
    phoneticVariants: {
      sanskrit: 'ug-ra-re-tā',
      hindi: 'उग्ररेता',
      marathi: 'उग्ररेता',
      english: 'Oograreytaa',
      ipa: 'uɡ.rɐ.reː.tɑː',
      sapiPhoneme: 'Ugrareta',
      piperPhonetic: 'Oog-ruh-ray-taa',
      plainPhonetic: 'Oog-ra-ray-taa',
    },
  },
  {
    canonical: 'Bhava',
    aliases: ['bhava', 'BHAVA', 'भव'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'bha - va',
    description: 'System Evolution, Adaptive Generation & Rebirth.',
    phoneticVariants: {
      sanskrit: 'bha-va',
      hindi: 'भव',
      marathi: 'भव',
      english: 'Bhuvuh',
      ipa: 'bʱɐ.ʋɐ',
      sapiPhoneme: 'Bhava',
      piperPhonetic: 'Bha-vuh',
      plainPhonetic: 'Bha-va',
    },
  },
  {
    canonical: 'Kāla Rudra',
    aliases: ['Kala', 'kala_rudra', 'KALA_RUDRA', 'काल'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'kā - la',
    description: 'Real-time Telemetry, Temporal Sentry & SLA Monitoring.',
    phoneticVariants: {
      sanskrit: 'kā-la',
      hindi: 'काल',
      marathi: 'काळ',
      english: 'Kaala',
      ipa: 'kɑː.lɐ',
      sapiPhoneme: 'Kala',
      piperPhonetic: 'Kaa-luh',
      plainPhonetic: 'Kaa-la',
    },
  },
  {
    canonical: 'Vāmadeva',
    aliases: ['Vamadeva', 'vamadeva', 'VAMADEVA', 'वामदेव'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'vā - ma - de - va',
    description: 'UI/UX Design, Aesthetic Harmony & Frontend.',
    phoneticVariants: {
      sanskrit: 'vā-ma-de-va',
      hindi: 'वामदेव',
      marathi: 'वामदेव',
      english: 'Vaamadeyvuh',
      ipa: 'ʋɑː.mɐ.deː.ʋɐ',
      sapiPhoneme: 'Vamadeva',
      piperPhonetic: 'Vaa-muh-day-vuh',
      plainPhonetic: 'Vaa-ma-day-va',
    },
  },
  {
    canonical: 'Dhṛtavrata',
    aliases: ['Dhritavrata', 'dhritavrata', 'DHRITAVRATA', 'धृतव्रत'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'dhṛ - ta - vra - ta',
    description: 'Fault Tolerance, Self-Healing & Resilience.',
    phoneticVariants: {
      sanskrit: 'dhṛ-ta-vra-ta',
      hindi: 'धृतव्रत',
      marathi: 'धृतव्रत',
      english: 'Dhreetuvrutuh',
      ipa: 'dʱr̩.tɐ.ʋrɐ.tɐ',
      sapiPhoneme: 'Dhritavrata',
      piperPhonetic: 'Dhree-tuh-vruh-tuh',
      plainPhonetic: 'Dhree-ta-vra-ta',
    },
  },

  // --- 8 VASUS (Infrastructure, Foundations, Persistence & Telemetry) ---
  {
    canonical: 'Dharā',
    aliases: ['Dhara', 'dhara', 'DHARA', 'धरा'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'dha - rā',
    description: 'Database Storage & Persistent Grounding.',
    phoneticVariants: {
      sanskrit: 'dha-rā',
      hindi: 'धरा',
      marathi: 'धरा',
      english: 'Dhu-raa',
      ipa: 'dʱɐ.rɑː',
      sapiPhoneme: 'Dhara',
      piperPhonetic: 'Dhuh-raa',
      plainPhonetic: 'Dha-raa',
    },
  },
  {
    canonical: 'Anala',
    aliases: ['anala', 'ANALA', 'अनल'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'a - na - la',
    description: 'Core Execution Engine & Computational Fire.',
    phoneticVariants: {
      sanskrit: 'a-na-la',
      hindi: 'अनल',
      marathi: 'अनल',
      english: 'Unuluh',
      ipa: 'ɐ.nɐ.lɐ',
      sapiPhoneme: 'Anala',
      piperPhonetic: 'Uh-nuh-luh',
      plainPhonetic: 'Uh-na-la',
    },
  },
  {
    canonical: 'Anila',
    aliases: ['anila', 'ANILA', 'अनिल'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'a - ni - la',
    description: 'Event Bus, Message Streaming & Fast Routing.',
    phoneticVariants: {
      sanskrit: 'a-ni-la',
      hindi: 'अनिल',
      marathi: 'अनिल',
      english: 'Uneeluh',
      ipa: 'ɐ.ni.lɐ',
      sapiPhoneme: 'Anila',
      piperPhonetic: 'Uh-nee-luh',
      plainPhonetic: 'Uh-nee-la',
    },
  },
  {
    canonical: 'Āpa',
    aliases: ['Apa', 'apa', 'APA', 'आप'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ā - pa',
    description: 'Data Pipeline, ETL & Fluid Streaming.',
    phoneticVariants: {
      sanskrit: 'ā-pa',
      hindi: 'आप',
      marathi: 'आप',
      english: 'Aapuh',
      ipa: 'ɑː.pɐ',
      sapiPhoneme: 'Apa',
      piperPhonetic: 'Aa-puh',
      plainPhonetic: 'Aa-pa',
    },
  },
  {
    canonical: 'Pratyūṣa',
    aliases: ['Pratyusa', 'pratyusa', 'PRATYUSA', 'प्रत्यूष'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'prat - yū - ṣa',
    description: 'Cache Acceleration & Fast Memory Retrieval.',
    phoneticVariants: {
      sanskrit: 'prat-yū-ṣa',
      hindi: 'प्रत्यूष',
      marathi: 'प्रत्यूष',
      english: 'Prutyoo-shuh',
      ipa: 'prɐt.juː.ʂɐ',
      sapiPhoneme: 'Pratyusha',
      piperPhonetic: 'Prut-yoo-shuh',
      plainPhonetic: 'Prat-yoo-sha',
    },
  },
  {
    canonical: 'Prabhāsa',
    aliases: ['Prabhasa', 'prabhasa', 'PRABHASA', 'प्रभास'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'pra - bhā - sa',
    description: 'Infrastructure Topology & Compute Hardware.',
    phoneticVariants: {
      sanskrit: 'pra-bhā-sa',
      hindi: 'प्रभास',
      marathi: 'प्रभास',
      english: 'Prubhaasuh',
      ipa: 'prɐ.bʱɑː.sɐ',
      sapiPhoneme: 'Prabhasa',
      piperPhonetic: 'Pruh-bhaa-suh',
      plainPhonetic: 'Pru-bhaa-sa',
    },
  },
  {
    canonical: 'Soma',
    aliases: ['soma', 'SOMA', 'सोम'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'so - ma',
    description: 'Knowledge Base, Vector Indices & Documentation.',
    phoneticVariants: {
      sanskrit: 'so-ma',
      hindi: 'सोम',
      marathi: 'सोम',
      english: 'Somuh',
      ipa: 'soː.mɐ',
      sapiPhoneme: 'Soma',
      piperPhonetic: 'So-muh',
      plainPhonetic: 'So-ma',
    },
  },
  {
    canonical: 'Dhruva',
    aliases: ['dhruva', 'DHRUVA', 'ध्रुव'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'dhru - va',
    description: 'Root Invariants, Anchored State & Static Safety.',
    phoneticVariants: {
      sanskrit: 'dhru-va',
      hindi: 'ध्रुव',
      marathi: 'ध्रुव',
      english: 'Dhroovuh',
      ipa: 'dʱru.ʋɐ',
      sapiPhoneme: 'Dhruva',
      piperPhonetic: 'Dhroo-vuh',
      plainPhonetic: 'Dhroo-va',
    },
  },

  // 3. MASTER & AUTHORITY
  {
    canonical: 'Rushikesh',
    aliases: ['Rushi', 'रुषिकेश', 'ऋषिकेश', 'ऋषी'],
    language: 'mr',
    priority: 'PROTECTED',
    category: 'INDIAN_NAME',
    syllableBreakdown: 'ru - shi - kesh',
    description: 'Master, Creator & Root Sovereign Authority.',
    phoneticVariants: {
      sanskrit: 'ṛ-ṣi-ke-śa',
      hindi: 'ऋषिकेश',
      marathi: 'ऋषिकेश',
      english: 'Rooshikesh',
      ipa: 'ruː.ʃiː.keːʃ',
      sapiPhoneme: 'Rushikesh',
      piperPhonetic: 'Roo-shee-kesh',
      plainPhonetic: 'Roo-shee-kesh',
    },
  },
  {
    canonical: 'Pattiwar',
    aliases: ['पट्टीवार'],
    language: 'mr',
    priority: 'PROTECTED',
    category: 'INDIAN_NAME',
    syllableBreakdown: 'pat - ti - war',
    description: 'Root Authority Surname.',
    phoneticVariants: {
      sanskrit: 'pat-ti-vār',
      hindi: 'पट्टीवार',
      marathi: 'पट्टीवार',
      english: 'Puttiwaar',
      ipa: 'pɐʈ.ʈiː.ʋɑːr',
      sapiPhoneme: 'Pattiwar',
      piperPhonetic: 'Put-tee-vaar',
      plainPhonetic: 'Puh-tee-waar',
    },
  },

  // 4. COMMON TECHNICAL AND AI TERMINOLOGY
  {
    canonical: 'Ollama',
    aliases: ['ollama'],
    language: 'en',
    priority: 'STANDARD',
    category: 'TECHNICAL',
    phoneticVariants: {
      english: 'Oh-lah-muh',
      piperPhonetic: 'Oh-lah-muh',
      sapiPhoneme: 'Ollama',
      plainPhonetic: 'Oh-lah-ma',
    },
  },
  {
    canonical: 'Qwen',
    aliases: ['qwen', 'qwen2.5'],
    language: 'en',
    priority: 'STANDARD',
    category: 'TECHNICAL',
    phoneticVariants: {
      english: 'Kwen',
      piperPhonetic: 'Kwen',
      sapiPhoneme: 'Qwen',
      plainPhonetic: 'Kwen',
    },
  },
  {
    canonical: 'DeepSeek',
    aliases: ['deepseek', 'deepseek-r1'],
    language: 'en',
    priority: 'STANDARD',
    category: 'TECHNICAL',
    phoneticVariants: {
      english: 'Deep-seek',
      piperPhonetic: 'Deep-seek',
      sapiPhoneme: 'DeepSeek',
      plainPhonetic: 'Deep-seek',
    },
  },
  {
    canonical: 'SQLite',
    aliases: ['sqlite', 'sqlite3'],
    language: 'en',
    priority: 'STANDARD',
    category: 'TECHNICAL',
    phoneticVariants: {
      english: 'S-Q-L-lite',
      piperPhonetic: 'Sequel-lite',
      sapiPhoneme: 'SQLite',
      plainPhonetic: 'See-kwul-lite',
    },
  },
];

export class PronunciationRepository {
  private readonly storagePath: string;
  private readonly logger?: ILogger;
  private entries = new Map<string, PronunciationEntry>();
  private aliasIndex = new Map<string, string>(); // alias.toLowerCase() -> canonical.toLowerCase()

  constructor(storagePath = 'data/pronunciations.json', logger?: ILogger) {
    this.storagePath = storagePath;
    this.logger = logger?.child('PronunciationRepository');
    this.initialize();
  }

  private initialize(): void {
    // Seed initial protected dictionary
    for (const seed of SEED_PRONUNCIATION_LEXICON) {
      this.saveInternal(seed);
    }

    // Load persisted entries if file exists
    if (fs.existsSync(this.storagePath)) {
      try {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const loaded: PronunciationEntry[] = JSON.parse(raw);
        for (const entry of loaded) {
          // Do not allow disk file to downgrade a PROTECTED seed unless it's a valid extension
          const existing = this.entries.get(entry.canonical.toLowerCase());
          if (existing && existing.priority === 'PROTECTED' && entry.priority !== 'PROTECTED') {
            continue;
          }
          this.saveInternal(entry);
        }
        this.logger?.info(`Loaded ${this.entries.size} pronunciation entries from ${this.storagePath}`);
      } catch (err) {
        this.logger?.warn(`Failed to parse pronunciation lexicon file, preserving seed defaults`, { err });
      }
    } else {
      this.persist();
    }
  }

  public get(canonicalOrAlias: string): PronunciationEntry | undefined {
    const key = canonicalOrAlias.toLowerCase();
    const direct = this.entries.get(key);
    if (direct) return direct;

    const canonicalKey = this.aliasIndex.get(key);
    if (canonicalKey) {
      return this.entries.get(canonicalKey);
    }

    return undefined;
  }

  public getAll(): readonly PronunciationEntry[] {
    return Array.from(this.entries.values());
  }

  public count(): number {
    return this.entries.size;
  }

  public list(search?: string): readonly PronunciationEntry[] {
    const all = Array.from(this.entries.values());
    if (!search || !search.trim()) return all;
    const lower = search.trim().toLowerCase();
    return all.filter(
      (e) =>
        e.canonical.toLowerCase().includes(lower) ||
        e.aliases.some((a) => a.toLowerCase().includes(lower)) ||
        (e.description && e.description.toLowerCase().includes(lower))
    );
  }

  public save(entry: PronunciationEntry): PronunciationEntry {
    this.set(entry);
    return entry;
  }

  public delete(canonical: string): boolean {
    return this.remove(canonical);
  }

  public set(entry: PronunciationEntry): void {
    this.saveInternal(entry);
    this.persist();
  }

  public remove(canonical: string): boolean {
    const key = canonical.toLowerCase();
    const entry = this.entries.get(key);
    if (!entry) return false;

    if (entry.priority === 'PROTECTED') {
      throw new Error(`Cannot delete protected core lexicon entry: ${entry.canonical}`);
    }

    this.entries.delete(key);
    this.aliasIndex.delete(key);
    for (const alias of entry.aliases) {
      this.aliasIndex.delete(alias.toLowerCase());
    }

    this.persist();
    return true;
  }

  private saveInternal(entry: PronunciationEntry): void {
    const canonicalKey = entry.canonical.toLowerCase();
    this.entries.set(canonicalKey, entry);
    this.aliasIndex.set(canonicalKey, canonicalKey);

    for (const alias of entry.aliases) {
      this.aliasIndex.set(alias.toLowerCase(), canonicalKey);
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(Array.from(this.entries.values()), null, 2), 'utf-8');
    } catch (err) {
      this.logger?.warn(`Could not persist pronunciation lexicon to ${this.storagePath}`, { err });
    }
  }
}

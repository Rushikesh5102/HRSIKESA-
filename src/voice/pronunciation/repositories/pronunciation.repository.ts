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

  // 2. VEDIC WORKFORCE AGENTS (17 SPECIALISTS)
  {
    canonical: 'Gāṇḍīva',
    aliases: ['Gandiva', 'गाण्डीव'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'gāṇ - dī - va',
    description: 'Autonomous Systems & Infrastructure Engineer.',
    phoneticVariants: {
      sanskrit: 'gāṇ-ḍī-va',
      hindi: 'गांडीव',
      marathi: 'गांडीव',
      english: 'Gaandeeva',
      ipa: 'ɡɑːɳ.ɖiː.ʋɐ',
      sapiPhoneme: 'Gandiva',
      piperPhonetic: 'Gaan-dee-vuh',
      plainPhonetic: 'Gaan-dee-va',
    },
  },
  {
    canonical: 'KĀLA',
    aliases: ['Kala', 'Kaala', 'काल'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'kā - la',
    description: 'Temporal Scheduler & Resource Governor.',
    phoneticVariants: {
      sanskrit: 'kā-la',
      hindi: 'काल',
      marathi: 'काळ',
      english: 'Kaala',
      ipa: 'kɑː.lɐ',
      sapiPhoneme: 'Kaala',
      piperPhonetic: 'Kaa-luh',
      plainPhonetic: 'Kaa-la',
    },
  },
  {
    canonical: 'Mṛtyu',
    aliases: ['Mrtyu', 'Mrityu', 'मृत्यु'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'mṛt - yu',
    description: 'Decommissioning, Cleanup & Graceful Termination.',
    phoneticVariants: {
      sanskrit: 'mṛt-yu',
      hindi: 'मृत्यु',
      marathi: 'मृत्यू',
      english: 'Mrityu',
      ipa: 'mr̩t.ju',
      sapiPhoneme: 'Mrityu',
      piperPhonetic: 'Mrit-yoo',
      plainPhonetic: 'Mrit-yoo',
    },
  },
  {
    canonical: 'Rāhu',
    aliases: ['Rahu', 'राहु'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'rā - hu',
    description: 'Sovereign Orchestration Core & Strategic Planning.',
    phoneticVariants: {
      sanskrit: 'rā-hu',
      hindi: 'राहु',
      marathi: 'राहू',
      english: 'Raahu',
      ipa: 'rɑː.ɦu',
      sapiPhoneme: 'Rahu',
      piperPhonetic: 'Raa-hoo',
      plainPhonetic: 'Raa-hoo',
    },
  },
  {
    canonical: 'Ṛtvan',
    aliases: ['Ritvan', 'ऋत्वन्'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ṛt - van',
    description: 'Order, Cosmic Law & Architectural Governance.',
    phoneticVariants: {
      sanskrit: 'ṛt-van',
      hindi: 'ऋत्वन',
      marathi: 'ऋत्वन',
      english: 'Ritvan',
      ipa: 'r̩t.ʋɐn',
      sapiPhoneme: 'Ritvan',
      piperPhonetic: 'Rit-vun',
      plainPhonetic: 'Rit-van',
    },
  },
  {
    canonical: 'Spooṭa',
    aliases: ['Spoota', 'Sphota', 'स्फोटा'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'spho - ṭa',
    description: 'Instantaneous Conceptual Flash & Fast Synthesis.',
    phoneticVariants: {
      sanskrit: 'spho-ṭa',
      hindi: 'स्फोट',
      marathi: 'स्फोट',
      english: 'Sphota',
      ipa: 'spʰoː.ʈɐ',
      sapiPhoneme: 'Sphota',
      piperPhonetic: 'Sfo-tuh',
      plainPhonetic: 'Sfo-ta',
    },
  },
  {
    canonical: 'Vighna',
    aliases: ['Vighna', 'विघ्न'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'vigh - na',
    description: 'Obstacle Detection, Risk Evaluation & Circuit Breaking.',
    phoneticVariants: {
      sanskrit: 'vigh-na',
      hindi: 'विघ्न',
      marathi: 'विघ्न',
      english: 'Vighna',
      ipa: 'ʋiɡʱ.nɐ',
      sapiPhoneme: 'Vighna',
      piperPhonetic: 'Vig-nuh',
      plainPhonetic: 'Vigh-na',
    },
  },
  {
    canonical: 'Raudra',
    aliases: ['Raudra', 'रौद्र'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'rau - dra',
    description: 'Security Enforcement & Attack Surface Mitigation.',
    phoneticVariants: {
      sanskrit: 'rau-dra',
      hindi: 'रौद्र',
      marathi: 'रौद्र',
      english: 'Rowdra',
      ipa: 'rɐu.drɐ',
      sapiPhoneme: 'Raudra',
      piperPhonetic: 'Row-druh',
      plainPhonetic: 'Row-dra',
    },
  },
  {
    canonical: 'Kalki',
    aliases: ['Kalki', 'कल्कि'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'kal - ki',
    description: 'Future State Synthesis & Autonomous Evolution.',
    phoneticVariants: {
      sanskrit: 'kal-ki',
      hindi: 'कल्कि',
      marathi: 'कल्की',
      english: 'Kulki',
      ipa: 'kɐl.ki',
      sapiPhoneme: 'Kalki',
      piperPhonetic: 'Kul-kee',
      plainPhonetic: 'Kul-kee',
    },
  },
  {
    canonical: 'Garuḍa',
    aliases: ['Garuda', 'गरुड'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ga - ru - ḍa',
    description: 'High-Altitude Reconnaissance & External Intelligence.',
    phoneticVariants: {
      sanskrit: 'ga-ru-ḍa',
      hindi: 'गरुड़',
      marathi: 'गरुड',
      english: 'Guhrooda',
      ipa: 'ɡɐ.ru.ɖɐ',
      sapiPhoneme: 'Garuda',
      piperPhonetic: 'Guh-roo-duh',
      plainPhonetic: 'Guh-roo-da',
    },
  },
  {
    canonical: 'Arvan',
    aliases: ['Arvan', 'अर्वन्'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ar - van',
    description: 'High-Velocity Courier & Cloud Networking Operations.',
    phoneticVariants: {
      sanskrit: 'ar-van',
      hindi: 'अर्वन्',
      marathi: 'अर्वन्',
      english: 'Arvan',
      ipa: 'ɐr.ʋɐn',
      sapiPhoneme: 'Arvan',
      piperPhonetic: 'Ar-vun',
      plainPhonetic: 'Ar-van',
    },
  },
  {
    canonical: 'Tāraka',
    aliases: ['Taraka', 'तारक'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'tā - ra - ka',
    description: 'Star Navigator & Multi-Node Cluster Orchestrator.',
    phoneticVariants: {
      sanskrit: 'tā-ra-ka',
      hindi: 'तारक',
      marathi: 'तारक',
      english: 'Taaraka',
      ipa: 'tɑː.rɐ.kɐ',
      sapiPhoneme: 'Taraka',
      piperPhonetic: 'Taa-ruh-kuh',
      plainPhonetic: 'Taa-ra-ka',
    },
  },
  {
    canonical: 'Aja',
    aliases: ['Aja', 'अज'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'a - ja',
    description: 'Unborn Foundation & Root Kernel Bootstrapping.',
    phoneticVariants: {
      sanskrit: 'a-ja',
      hindi: 'अज',
      marathi: 'अज',
      english: 'Uja',
      ipa: 'ɐ.d͡ʒɐ',
      sapiPhoneme: 'Aja',
      piperPhonetic: 'Uh-juh',
      plainPhonetic: 'Uh-ja',
    },
  },
  {
    canonical: 'Ṛtam',
    aliases: ['Rutam', 'Ritam', 'ऋतं', 'ऋतम्'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ṛ - tam',
    description: 'Fundamental Truth, Invariant Law & Verification.',
    phoneticVariants: {
      sanskrit: 'ṛ-tam',
      hindi: 'ऋत',
      marathi: 'ऋत',
      english: 'Ritam',
      ipa: 'r̩.tɐm',
      sapiPhoneme: 'Ritam',
      piperPhonetic: 'Ri-tum',
      plainPhonetic: 'Ri-tam',
    },
  },
  {
    canonical: 'Yama',
    aliases: ['Yama', 'यम'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'ya - ma',
    description: 'Disaster Recovery, State Checkpointing & Audit Enforcement.',
    phoneticVariants: {
      sanskrit: 'ya-ma',
      hindi: 'यम',
      marathi: 'यम',
      english: 'Yama',
      ipa: 'jɐ.mɐ',
      sapiPhoneme: 'Yama',
      piperPhonetic: 'Yuh-muh',
      plainPhonetic: 'Yuh-ma',
    },
  },
  {
    canonical: 'Kālī',
    aliases: ['Kali', 'काली'],
    language: 'sa',
    priority: 'PROTECTED',
    category: 'AGENT',
    syllableBreakdown: 'kā - lī',
    description: 'Time Dissolution, Garbage Collection & Rebirth.',
    phoneticVariants: {
      sanskrit: 'kā-lī',
      hindi: 'काली',
      marathi: 'काळी',
      english: 'Kaalee',
      ipa: 'kɑː.liː',
      sapiPhoneme: 'Kali',
      piperPhonetic: 'Kaa-lee',
      plainPhonetic: 'Kaa-lee',
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

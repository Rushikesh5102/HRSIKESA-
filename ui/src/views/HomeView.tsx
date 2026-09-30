import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Cpu,
  Users,
  Building2,
  Terminal,
  Code,
  Wrench,
  Monitor,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Database,
  RefreshCw,
  Server,
  Compass,
  Zap,
  Globe,
  GitBranch,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Award,
  Key,
  Flame,
  Activity,
  Network,
  Share2,
  CheckSquare,
  Target,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Radio,
  Lock,
  Send,
  RotateCcw,
  StopCircle,
  Copy,
  Check,
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';
import { IndianEmblem } from '../components/IndianEmblem';
import { GoldenVoiceOrb, OrbState } from '../components/GoldenVoiceOrb';
import { HealthResponse, SystemStatusResponse, AgentInfo } from '../types/api.types';
import { api } from '../services/api';

// Supported Indian & Global Languages for Voice Synthesis & STT
export interface VoiceLanguage {
  code: string;
  name: string;
  nativeName: string;
  greeting: string;
  promptInstruction: string;
}

export const SUPPORTED_LANGUAGES: VoiceLanguage[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear, articulate English.' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'Indian English', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear, articulate Indian English.' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'Hindi', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'Sanskrit', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'Marathi', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'Tamil', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'Telugu', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'Kannada', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'Bengali', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'Gujarati', greeting: 'Hello! How may I help you today?', promptInstruction: 'Respond in clear English.' },
];

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface HomeViewProps {
  health?: HealthResponse;
  status?: SystemStatusResponse;
  agents?: AgentInfo[];
  onNavigate: (tab: NavTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  health,
  status,
  agents = [],
  onNavigate,
}) => {
  // Mouse position tracking for interactive cursor spotlight glow
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // =========================================================================
  // VOICE-TO-VOICE GOLDEN CIRCLE INTERACTION ENGINE
  // =========================================================================
  const [voiceState, setVoiceState] = useState<OrbState>('IDLE');
  const [hasInitiatedVoice, setHasInitiatedVoice] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState<string>('');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isTtsMuted, setIsTtsMuted] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>(SUPPORTED_LANGUAGES[0]);
  const [textInput, setTextInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [voiceStatusText, setVoiceStatusText] = useState<string>('Click to Talk');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);

  const startListeningRef = useRef<() => void>(() => {});
  const speakTextRef = useRef<(text: string, onDone?: () => void) => void>(() => {});
  const handleProcessUserQueryRef = useRef<(queryText: string) => Promise<void>>(async () => {});

  // Stop all active voice output safely (both HTML5 audio and browser speech synthesis)
  const stopVoice = useCallback(() => {
    isSpeakingRef.current = false;
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {}
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  // Browser speech synthesis fallback with Chromium unpause and keepalive
  const fallbackBrowserTts = useCallback(
    (cleanText: string, onFinish: () => void) => {
      if (!('speechSynthesis' in window)) {
        onFinish();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        synthRef.current = utterance;
        utterance.lang = selectedLang.code;
        utterance.rate = 1.02;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(
          (v) => v.lang === selectedLang.code || v.lang.startsWith(selectedLang.code.slice(0, 2))
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        utterance.onend = () => {
          onFinish();
        };
        utterance.onerror = () => {
          onFinish();
        };

        // Chromium keepalive: periodically unpauses speech synthesis
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 3000);

        window.speechSynthesis.speak(utterance);
      } catch {
        onFinish();
      }
    },
    [selectedLang]
  );

  // Speak text aloud: prefers high-fidelity backend neural voice, falls back to browser TTS
  const speakText = useCallback(
    async (text: string, onDone?: () => void) => {
      if (isTtsMuted) {
        if (onDone) onDone();
        return;
      }

      stopVoice();
      isSpeakingRef.current = true;
      setVoiceState('SPEAKING');
      setVoiceStatusText('HṚṢĪKEŚA Speaking...');

      const cleanText = text.replace(/[*_#`~[\]()]/g, '').trim();
      if (!cleanText) {
        setVoiceState('IDLE');
        if (onDone) onDone();
        return;
      }

      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        isSpeakingRef.current = false;
        stopVoice();
        setVoiceState('IDLE');
        setVoiceStatusText('Listening...');
        if (onDone) {
          onDone();
        } else if (hasInitiatedVoice) {
          startListeningRef.current();
        }
      };

      // Safety timeout: prevents the Golden Circle from ever freezing in SPEAKING state
      const estimatedDurationMs = Math.max(4000, Math.min(35000, (cleanText.length / 9) * 1000 + 2500));
      speechTimeoutRef.current = setTimeout(() => {
        if (!completed) {
          finish();
        }
      }, estimatedDurationMs);

      // 1. Attempt high-fidelity backend neural voice synthesis
      try {
        const synthRes = await api.synthesizeSpeech(cleanText);
        if (synthRes && synthRes.audioUrl && isSpeakingRef.current && !completed) {
          const audio = new Audio(synthRes.audioUrl);
          audioPlayerRef.current = audio;
          audio.onended = () => {
            finish();
          };
          audio.onerror = () => {
            fallbackBrowserTts(cleanText, finish);
          };
          await audio.play();
          return;
        }
      } catch {
        // Backend synthesis unavailable; gracefully proceed to browser TTS
      }

      if (isSpeakingRef.current && !completed) {
        fallbackBrowserTts(cleanText, finish);
      }
    },
    [isTtsMuted, stopVoice, hasInitiatedVoice, fallbackBrowserTts]
  );

  // Start Speech Recognition (Microphone)
  const startListening = useCallback(async () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceStatusText('Microphone API not supported. Type below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      stopVoice();

      // Check microphone permissions without hanging
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr: any) {
          if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
            setVoiceStatusText('Mic permission denied. Enable in URL bar.');
            setVoiceState('IDLE');
            return;
          }
        }
      }

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.lang = selectedLang.code;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setVoiceState('LISTENING');
        setVoiceStatusText('Listening to your voice...');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }
        setInterimTranscript(interim);
        if (final && final.trim()) {
          setUserTranscript(final.trim());
          handleProcessUserQueryRef.current(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        isListeningRef.current = false;
        if (event.error === 'not-allowed') {
          setVoiceStatusText('Microphone blocked. Enable in URL bar.');
        } else if (event.error === 'no-speech') {
          setVoiceStatusText('No speech detected. Tap orb to speak.');
        } else if (event.error !== 'aborted') {
          setVoiceStatusText(`Mic: ${event.error}. Tap orb to retry.`);
        }
        setVoiceState('IDLE');
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        if (voiceState === 'LISTENING') {
          setVoiceState('IDLE');
          setVoiceStatusText('Click Golden Circle to speak');
        }
      };

      recognition.start();
    } catch {
      setVoiceStatusText('Failed to start microphone. Tap to retry.');
      setVoiceState('IDLE');
    }
  }, [selectedLang, stopVoice, voiceState]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
    setVoiceState('IDLE');
    setVoiceStatusText('Ready');
  }, []);

  // Process User Query via Backend API
  const handleProcessUserQuery = useCallback(
    async (queryText: string) => {
      if (!queryText.trim() || isProcessingRef.current) return;
      isProcessingRef.current = true;
      stopListening();
      setVoiceState('WORKING');
      setVoiceStatusText('HṚṢĪKEŚA Reasoning...');
      setCurrentDialogue('');

      try {
        const fullPrompt = `${selectedLang.promptInstruction} ${queryText.trim()}`;
        let responseAccumulator = '';

        await api.streamChat(
          fullPrompt,
          undefined,
          undefined,
          undefined,
          (token: string) => {
            responseAccumulator += token;
            setCurrentDialogue(responseAccumulator);
          },
          'CONCISE'
        );

        const finalAnswer =
          responseAccumulator.trim() ||
          'I am ready to assist you across all 33 specialist agents, missions, and companies.';
        setCurrentDialogue(finalAnswer);
        setVoiceState('SPEAKING');
        speakTextRef.current(finalAnswer, () => {
          isProcessingRef.current = false;
          setVoiceState('IDLE');
          setVoiceStatusText('Click Golden Circle or speak again');
          startListeningRef.current();
        });
      } catch (err: any) {
        const fallbackMsg = `Received query: "${queryText}". Connecting to local microkernel.`;
        setCurrentDialogue(fallbackMsg);
        speakTextRef.current(fallbackMsg, () => {
          isProcessingRef.current = false;
          setVoiceState('IDLE');
        });
      } finally {
        isProcessingRef.current = false;
      }
    },
    [selectedLang, stopListening]
  );

  // Synchronize mutable refs for zero-stale callback references
  startListeningRef.current = startListening;
  speakTextRef.current = speakText;
  handleProcessUserQueryRef.current = handleProcessUserQuery;

  // Initial Click on the Golden Circle
  const handleGoldenCircleClick = () => {
    if (!hasInitiatedVoice) {
      setHasInitiatedVoice(true);
      const greeting = selectedLang.greeting;
      setCurrentDialogue(greeting);
      setUserTranscript('');
      speakTextRef.current(greeting, () => {
        startListeningRef.current();
      });
    } else {
      if (voiceState === 'LISTENING') {
        stopListening();
        setVoiceStatusText('Voice paused. Tap to talk.');
      } else if (voiceState === 'SPEAKING') {
        stopVoice();
        setVoiceState('IDLE');
        setVoiceStatusText('Speech paused. Tap to talk.');
      } else if (voiceState === 'WORKING') {
        isProcessingRef.current = false;
        setVoiceState('IDLE');
        setVoiceStatusText('Cancelled. Tap to talk.');
      } else {
        startListeningRef.current();
      }
    }
  };

  const handleCopyDialogue = () => {
    if (!currentDialogue) return;
    navigator.clipboard.writeText(currentDialogue);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const query = textInput.trim();
    setTextInput('');
    setUserTranscript(query);
    setHasInitiatedVoice(true);
    handleProcessUserQuery(query);
  };

  // Cleanup speech synthesis, audio player, and recognition on unmount
  useEffect(() => {
    return () => {
      stopVoice();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [stopVoice]);

  // Master Capability Stage Tab (8 Key Pillars)
  const [activeStageTab, setActiveStageTab] = useState(0);
  const [isAutoCycling, setIsAutoCycling] = useState(true);

  // 3D Infinite Coverflow Agent Carousel State
  const [centerAgentIdx, setCenterAgentIdx] = useState(0);
  const [isAgentAutoPlaying, setIsAgentAutoPlaying] = useState(true);

  // 8 Core Execution Pillars
  const executionPillars = [
    {
      id: 'workforce',
      tabTitle: '01. 33-Agent Fleet',
      title: 'Canonical 33-Agent Workforce',
      subtitle: '12 Ādityas • 11 Rudras • 8 Vasus • Indra • Prajāpati',
      tag: 'Workforce Architecture',
      icon: <Users size={24} color="var(--accent-gold)" />,
      badge: '33 Sovereign Roles',
      tab: 'office' as NavTab,
      actionText: 'Enter 3D Virtual Office',
      description:
        'A comprehensive multi-agent organization of 33 canonical AI specialists structured across 5 foundational tiers. Features hierarchical delegation, blackboard state memory, collaborative Council consensus deliberation, and a live 3D Virtual Office floor.',
      highlights: [
        '3D Isometric Virtual Office floor with live workstations and routines',
        '5-Tier Vedic-inspired architecture: Strategy, Engineering, Infra, Operations & Evolution',
        'Automatic task breakdown, queue dispatching & dependency tracking',
        'Dynamic role-specific safety limits and isolated execution sandboxes',
      ],
      metrics: [
        { label: 'Workforce Roster', val: '33 Canonical Core Agents' },
        { label: 'Structural Source', val: 'Bṛhadāraṇyaka Upaniṣad 3.9' },
        { label: 'Consensus Mode', val: 'Council Deliberation' },
        { label: 'Task Routing', val: 'Real-time Blackboard' },
      ],
    },
    {
      id: 'companies',
      tabTitle: '02. Autonomous Ventures',
      title: 'Autonomous Companies & Ventures',
      subtitle: 'Self-Driving Corporate Operations',
      tag: 'Enterprise Engine',
      icon: <Building2 size={24} color="#00c4a8" />,
      badge: 'Venture Lifecycle',
      tab: 'companies' as NavTab,
      actionText: 'Explore Companies Hub',
      description:
        'Incubate, launch, scale, and govern entire business entities autonomously. HṚṢĪKEŚA establishes departmental rosters, tracks OKRs & KPIs, fulfills customer orders, manages financial budgets, and resolves incidents with end-to-end automation.',
      highlights: [
        '4-stage company lifecycle: Incubation → Foundation → Expansion → Autonomy',
        'Departmental rosters spanning Engineering, Strategy, Marketing & Operations',
        'Real-time financial budget limits and cryptographic spending audits',
        'Automated incident triage and customer fulfillment delivery pipelines',
      ],
      metrics: [
        { label: 'Venture Stages', val: 'Incubation to Scale' },
        { label: 'Departments', val: 'Engineering & Marketing' },
        { label: 'Governance', val: 'Autonomous OKRs' },
        { label: 'Ledger Audit', val: 'Cryptographic Trail' },
      ],
    },
    {
      id: 'computer',
      tabTitle: '03. Desktop Operator',
      title: 'Computer & Desktop Operator',
      subtitle: 'Windows UIA & Browser Automation',
      tag: 'OS Automation',
      icon: <Monitor size={24} color="#3878c0" />,
      badge: 'Full OS Mastery',
      tab: 'computer' as NavTab,
      actionText: 'Launch Desktop Operator',
      description:
        'Complete autonomous control over your physical workstation. Automates Windows applications via UI Automation (mouse clicks, typing, window focus) paired with Playwright browser automation for web tasks and research.',
      highlights: [
        'Native Windows UI Automation: clicks, typing, hotkeys, window tracking',
        'Full browser automation: web scraping, form submission, and navigation',
        'Multimodal desktop visual observation and element identification',
        'Isolated execution safeguards preventing unintended system actions',
      ],
      metrics: [
        { label: 'Desktop Engine', val: 'Windows UIA' },
        { label: 'Web Engine', val: 'Playwright Sandbox' },
        { label: 'Perception', val: 'Live Screen OCR' },
        { label: 'Safety Mode', val: 'Guarded Execution' },
      ],
    },
    {
      id: 'engineering',
      tabTitle: '04. Universal IDE',
      title: 'Universal IDE & Autonomous Coding',
      subtitle: 'Self-Guided Software Engineering Fabric',
      tag: 'Engineering Studio',
      icon: <Code size={24} color="#e8b830" />,
      badge: 'Full-Stack IDE',
      tab: 'ide' as NavTab,
      actionText: 'Open Universal IDE',
      description:
        'A full-stack in-browser IDE with Monaco-style syntax, code exploration, test runner, and autonomous engineering fabric (Manyu & Bhava) that inspects repositories, fixes bugs, writes hermetic tests, and publishes verified pull requests.',
      highlights: [
        'In-browser full-stack code editor with file tree & syntax highlighting',
        'Autonomous test execution, typecheck verification & automated linting',
        'GitHub intelligence repository synchronization and commit history',
        'AI-driven code generation, refactoring, and test suite creation',
      ],
      metrics: [
        { label: 'Lead Engineers', val: 'Manyu & Bhava' },
        { label: 'Code Gates', val: 'Typecheck & Linting' },
        { label: 'Git Sync', val: 'GitHub Worktrees' },
        { label: 'Test Runner', val: 'Hermetic Sandbox' },
      ],
    },
    {
      id: 'voice',
      tabTitle: '05. Neural Voice & Vision',
      title: 'Voice & Multimodal Perception',
      subtitle: 'Faster-Whisper & Piper Neural TTS',
      tag: 'Sensory Neural Core',
      icon: <Mic size={24} color="var(--accent-gold)" />,
      badge: '100% Offline Voice',
      tab: 'multimodal' as NavTab,
      actionText: 'Explore Multimodal Core',
      description:
        'Zero-cloud-dependency voice engine with ultra-fast local speech recognition (Faster-Whisper), expressive neural voice synthesis (Piper TTS), and multimodal visual perception & canvas diagram analysis.',
      highlights: [
        'Sub-second Push-to-Talk voice dialogue without external API delays',
        'Phonetic pronunciation normalization for Sanskrit terms & domain vocabularies',
        'Visual artifact analysis, image generation & canvas diagram rendering',
        'Continuous ambient audio stream processing with noise gate filters',
      ],
      metrics: [
        { label: 'STT Engine', val: 'Faster-Whisper Local' },
        { label: 'TTS Engine', val: 'Piper Neural (100% Offline)' },
        { label: 'Latency', val: 'Sub-second' },
        { label: 'Vision Model', val: 'Local OCR & Vision' },
      ],
    },
    {
      id: 'memory',
      tabTitle: '06. 4-Tier Memory',
      title: 'Hierarchical 4-Tier Memory Matrix',
      subtitle: 'Vector Embeddings & SQLite Episodic Storage',
      tag: 'Cognitive Memory',
      icon: <Database size={24} color="#00c4a8" />,
      badge: 'Infinite Retention',
      tab: 'memory' as NavTab,
      actionText: 'Inspect Memory Tiers',
      description:
        'Comprehensive 4-tier memory architecture: Tier 1 Session Scratchpad, Tier 2 Semantic Vector Search (Ollama nomic-embed-text), Tier 3 SQLite Episodic History, and Tier 4 immutable Creator Profile & Sovereign Directives.',
      highlights: [
        'Hybrid FTS + cosine vector similarity retrieval across historical sessions',
        'Automated episodic memory summarization and long-term retention',
        'Immutable Creator profile preserving your preferences and directives',
        'Zero telemetry leakage — all embeddings stored in local SQLite database',
      ],
      metrics: [
        { label: 'Vector Store', val: 'nomic-embed-text' },
        { label: 'History DB', val: 'SQLite 3 (WAL Mode)' },
        { label: 'Search Type', val: 'Hybrid FTS5 + Cosine' },
        { label: 'Retention', val: 'Persistent & Sovereign' },
      ],
    },
    {
      id: 'tools',
      tabTitle: '07. Governed Tool Bus',
      title: 'Governed Tool Bus & Risk Sandbox',
      subtitle: '101+ Native OS & Hardware Levers',
      tag: 'Execution Engine',
      icon: <Wrench size={24} color="#e8b830" />,
      badge: '4-Tier Risk Sandbox',
      tab: 'tools' as NavTab,
      actionText: 'View Tool Bus',
      description:
        'Unified tool registry executing across filesystem, PowerShell terminal, hardware telemetry, process management, and custom MCP tool bridges with cryptographic audit logging and human approval gates.',
      highlights: [
        '4-Tier risk governance: Tier 0 (Safe) to Tier 3 (Critical Authorization)',
        'Human-in-the-loop approval gates for sensitive system modifications',
        'Cryptographic audit ledger recording every executed tool parameter',
        'MCP tool bridges for expanding external runtime services dynamically',
      ],
      metrics: [
        { label: 'Active Levers', val: '101+ Native Tools' },
        { label: 'Safety Gates', val: 'Human-in-the-loop' },
        { label: 'Audit Trail', val: 'Cryptographic Ledger' },
        { label: 'Protocol', val: 'Model Context Protocol (MCP)' },
      ],
    },
    {
      id: 'evolution',
      tabTitle: '08. Self-Evolution',
      title: 'Autonomous Self-Evolution Loop',
      subtitle: 'Runtime Introspection & Sandbox Patching',
      tag: 'Self-Improvement',
      icon: <RefreshCw size={24} color="#b83820" />,
      badge: 'Self-Improving OS',
      tab: 'evolution' as NavTab,
      actionText: 'Monitor Evolution',
      description:
        'HṚṢĪKEŚA observes its own telemetry, analyzes errors, benchmarks models, and proposes verified code modifications inside sandboxed workspaces with instantaneous git rollback guarantees.',
      highlights: [
        'Runtime anomaly detection and self-diagnostic telemetry analysis',
        'Sandboxed changeset testing with automated build & typecheck gates',
        'Zero-risk git checkpoint creation with instantaneous rollback safety',
        'Continuous self-prompt optimization based on execution metrics',
      ],
      metrics: [
        { label: 'Kaizen Loop', val: 'Autonomous Kaizen' },
        { label: 'Verification', val: 'Sandboxed Gateways' },
        { label: 'Rollback', val: 'Zero-Risk Checkpoints' },
        { label: 'Diagnostics', val: 'Live Telemetry Engine' },
      ],
    },
  ];

  // Canonical 33-Agent Roster for Coverflow
  const canonical33Roster = [
    // 12 Ādityas
    { name: 'Dhātā', role: 'Chief Strategy Architect', tier: 'ĀDITYA', desc: 'Long-term business models, strategic roadmaps, and architectural feasibility.' },
    { name: 'Mitra', role: 'Customer Success Specialist', tier: 'ĀDITYA', desc: 'User enablement, empathy synthesis, and customer onboarding journeys.' },
    { name: 'Aryaman', role: 'Organization Setup Specialist', tier: 'ĀDITYA', desc: 'Departmental structures, team topologies, and workforce alignment.' },
    { name: 'Varuṇa', role: 'Governance & Compliance', tier: 'ĀDITYA', desc: 'Policy enforcement, legal compliance audits, and contractual guardrails.' },
    { name: 'Aṃśa', role: 'Commercial & Financial Ops', tier: 'ĀDITYA', desc: 'Invoicing, financial accounting, pricing tiers, and unit economics.' },
    { name: 'Bhaga', role: 'Market Intelligence Specialist', tier: 'ĀDITYA', desc: 'Competitive intelligence, market gap analysis, and industry trend forecasting.' },
    { name: 'Vivasvān', role: 'Growth Marketing & Outreach', tier: 'ĀDITYA', desc: 'Brand positioning, lead funnels, and distribution channels.' },
    { name: 'Pūṣā', role: 'Fulfillment & Delivery', tier: 'ĀDITYA', desc: 'Packaging, release logistics, delivery milestone tracking, and distribution.' },
    { name: 'Tvaṣṭā', role: 'Product Specs & UX Blueprint', tier: 'ĀDITYA', desc: 'User needs analysis, UI/UX workflow wireframes, and interaction contracts.' },
    { name: 'Savitā', role: 'Creative Prototyping Specialist', tier: 'ĀDITYA', desc: 'Rapid conceptualization, prototype modeling, and design spikes.' },
    { name: 'Parjanya', role: 'Ecosystem Telemetry Specialist', tier: 'ĀDITYA', desc: 'External API monitoring, market telemetry ingestion, and cloud sync.' },
    { name: 'Viṣṇu', role: 'Sovereign Alignment Guardian', tier: 'ĀDITYA', desc: 'Goal alignment preservation, core principle guardianship, and squad harmony.' },
    // 11 Rudras
    { name: 'Manyu', role: 'Lead Autonomous Engineer', tier: 'RUDRA', desc: 'Core algorithmic construction, system coding, and full-stack building.' },
    { name: 'Manu', role: 'Code Standards Architect', tier: 'RUDRA', desc: 'Type safety enforcement, linting rules, and structural conventions.' },
    { name: 'Mahinasa', role: 'Continuous Optimization Engine', tier: 'RUDRA', desc: 'Algorithmic optimization, query tuning, and compute scaling.' },
    { name: 'Mahān', role: 'System Refactoring Specialist', tier: 'RUDRA', desc: 'Large-scale codebase refactoring, modularization, and debt cleanup.' },
    { name: 'Śiva', role: 'Integrity Verification & RCA', tier: 'RUDRA', desc: 'Root cause analysis, regression extermination, and zero-defect checks.' },
    { name: 'Ṛtadhvaja', role: 'QA & Risk Gatekeeper', tier: 'RUDRA', desc: 'Test suite execution, edge-case probing, and quality gates.' },
    { name: 'Ugraretā', role: 'Security Defense & Shield', tier: 'RUDRA', desc: 'Static code analysis, vulnerability mitigation, and CVE threat containment.' },
    { name: 'Bhava', role: 'Build & CI/CD Engineer', tier: 'RUDRA', desc: 'Compilation pipelines, package bundling, container builds, and test runners.' },
    { name: 'Kāla', role: 'Process Circuit Breaker', tier: 'RUDRA', desc: 'Hanging task termination, process timeouts, and deadlock detection.' },
    { name: 'Vāmadeva', role: 'Disaster Recovery & Rollback', tier: 'RUDRA', desc: 'Safe rollbacks, checkpoint restoration, snapshot management, and recovery.' },
    { name: 'Dhṛtavrata', role: 'Decommissioning & Archival', tier: 'RUDRA', desc: 'Service sunsetting, structured data archival, and orphan cleanup.' },
    // 8 Vasus
    { name: 'Dharā', role: 'Storage & Workspace Guardian', tier: 'VASU', desc: 'Native directory structures, file IO, and workspace hygiene.' },
    { name: 'Anala', role: 'Terminal & Shell Powerhouse', tier: 'VASU', desc: 'Native PowerShell/bash execution, scripting, and process control.' },
    { name: 'Anila', role: 'Network & Inter-Agent Channels', tier: 'VASU', desc: 'Event bus dispatch, Server-Sent Events, and worker sockets.' },
    { name: 'Āpa', role: 'Database & Persistent State', tier: 'VASU', desc: 'SQLite WAL maintenance, query optimization, and schema integrity.' },
    { name: 'Pratyūṣa', role: 'Temporal Scheduling & Cron', tier: 'VASU', desc: 'Scheduled missions, queue prioritization, and execution windows.' },
    { name: 'Prabhāsa', role: 'SRE & Host Observability', tier: 'VASU', desc: 'Hardware metrics, CPU/RAM telemetry, and incident alerting.' },
    { name: 'Soma', role: 'Memory & Knowledge Custodian', tier: 'VASU', desc: 'Semantic vector indexing, knowledge graph resolution, and associative recall.' },
    { name: 'Dhruva', role: 'Audit Ledger & Provenance', tier: 'VASU', desc: 'Immutable action logs, tool call audits, and verification registers.' },
    // Leaders
    { name: 'Indra', role: 'Supreme Field Commander', tier: 'COMMAND', desc: 'Active mission command, multi-agent dispatch, and operational crisis leadership.' },
    { name: 'Prajāpati', role: 'Workforce Progenitor', tier: 'PROGENITOR', desc: 'Dynamic agent spawning (dyn_*), metacognition, and self-evolution.' },
  ];

  // 3D Infinite Coverflow Agent Carousel State
  const coverflowSectionRef = useRef<HTMLElement>(null);
  const scrollAccumulator = useRef(0);
  const isScrollThrottled = useRef(false);
  const sideScrollCount = useRef(0);
  const sideScrollResetTimer = useRef<NodeJS.Timeout | null>(null);

  // Mouse & Touch Drag State for Coverflow
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragAccumulator = useRef(0);
  const hasDragged = useRef(false);

  // Auto-cycle through the 8 execution pillars
  useEffect(() => {
    if (!isAutoCycling) return;
    const interval = setInterval(() => {
      setActiveStageTab((prev) => (prev + 1) % executionPillars.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isAutoCycling, executionPillars.length]);

  // Infinite Auto-scroll for the 3D Agent Coverflow
  useEffect(() => {
    if (!isAgentAutoPlaying || isDragging) return;
    const interval = setInterval(() => {
      setCenterAgentIdx((prev) => (prev + 1) % canonical33Roster.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAgentAutoPlaying, isDragging, canonical33Roster.length]);

  // Observe sections to trigger horizontal slide-in animations on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            entry.target.classList.remove('is-exited-top');
          } else {
            if (entry.boundingClientRect.top < 0) {
              entry.target.classList.add('is-exited-top');
            } else {
              entry.target.classList.remove('is-visible');
            }
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const sections = document.querySelectorAll('.scroll-reveal-section');
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, []);

  const currentPillar = executionPillars[activeStageTab];

  const handlePrevAgent = () => {
    setCenterAgentIdx((prev) => (prev - 1 + canonical33Roster.length) % canonical33Roster.length);
  };

  const handleNextAgent = () => {
    setCenterAgentIdx((prev) => (prev + 1) % canonical33Roster.length);
  };

  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX;
    dragAccumulator.current = 0;
    hasDragged.current = false;
    setIsDragging(true);
    setIsAgentAutoPlaying(false);
  };

  const handleDragMove = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    if (Math.abs(delta) > 6) {
      hasDragged.current = true;
    }
    dragAccumulator.current += delta;
    dragStartX.current = clientX;

    if (dragAccumulator.current > 42) {
      setCenterAgentIdx((prev) => (prev - 1 + canonical33Roster.length) % canonical33Roster.length);
      dragAccumulator.current = 0;
    } else if (dragAccumulator.current < -42) {
      setCenterAgentIdx((prev) => (prev + 1) % canonical33Roster.length);
      dragAccumulator.current = 0;
    }
  };

  const handleDragEnd = () => {
    dragStartX.current = null;
    dragAccumulator.current = 0;
    setIsDragging(false);
    setTimeout(() => {
      hasDragged.current = false;
    }, 60);
  };

  const sampleQuickPrompts = [
    { label: '🌟 Introduce HṚṢĪKEŚA', prompt: 'Introduce yourself, your architecture, and how your 33 canonical agents work.' },
    { label: '🚀 Launch Mission', prompt: 'Help me plan and start a new autonomous software development mission.' },
    { label: '🏢 Virtual Office Floor', prompt: 'Explain the 3D Virtual Office floor and how agent workstations are coordinated.' },
    { label: '📊 System Diagnostics', prompt: 'Summarize system health, CPU/RAM telemetry, and local microkernel status.' },
    { label: '🔒 Sovereign Privacy', prompt: 'How do you guarantee 100% air-gapped data privacy and sovereign local control?' },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '64px',
        padding: '24px 28px 120px 28px',
        maxWidth: '1440px',
        margin: '0 auto',
      }}
    >
      {/* Prismatic Ambient Light Orbs for Deep Glassmorphic Refraction */}
      <div
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          top: '5%',
          left: '10%',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 168, 55, 0.15) 0%, rgba(212, 168, 55, 0.02) 55%, transparent 70%)',
          filter: 'blur(75px)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          top: '30%',
          right: '5%',
          width: '580px',
          height: '580px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 196, 168, 0.13) 0%, rgba(0, 196, 168, 0.02) 55%, transparent 70%)',
          filter: 'blur(85px)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          bottom: '12%',
          left: '15%',
          width: '640px',
          height: '640px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.11) 0%, rgba(139, 92, 246, 0.05) 55%, transparent 70%)',
          filter: 'blur(95px)',
          zIndex: 0,
        }}
      />

      {/* Dynamic Cursor Spotlight Mesh Glow */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(212, 168, 55, 0.09), rgba(0, 196, 168, 0.045), transparent 70%)`,
            transition: 'background 0.15s ease',
          }}
        />
      )}

      {/* =========================================================================
          SECTION 1: GRAND INTRODUCTION OF HṚṢĪKEŚA
         ========================================================================= */}
      <section className="scroll-reveal-section reveal-from-center is-visible" style={{ position: 'relative', zIndex: 1, paddingTop: '4px' }}>
        <div className="glass-panel" style={{ padding: '38px 46px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Top Status & Node Live Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span
                className="glass-pill"
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-cinzel)',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--accent-teal)',
                  padding: '5px 16px',
                  borderRadius: '30px',
                  border: '1px solid rgba(0, 196, 168, 0.35)',
                }}
              >
                Sovereign Autonomous AI Operating System • v0.2.0
              </span>
              <span
                className="glass-pill"
                style={{
                  fontSize: '11px',
                  color: '#10B981',
                  padding: '5px 14px',
                  borderRadius: '30px',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                Local Microkernel Active
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => onNavigate('office')}
                className="fluid-stage-pill"
                style={{
                  padding: '8px 18px',
                  fontSize: '12px',
                  borderRadius: '30px',
                  color: 'var(--text-gold)',
                  border: '1px solid rgba(212, 168, 55, 0.4)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <Building2 size={14} />
                <span>3D Virtual Office</span>
              </button>
              <button
                onClick={() => onNavigate('chat')}
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '30px',
                  boxShadow: '0 4px 16px rgba(212, 168, 55, 0.3)',
                }}
              >
                <Sparkles size={14} />
                <span>Full Chat View</span>
              </button>
            </div>
          </div>

          {/* Hero Brand Title & Introduction */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '920px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <h1
                  className="shimmer-text-gold"
                  style={{
                    fontSize: '46px',
                    fontWeight: 900,
                    fontFamily: 'var(--font-cinzel)',
                    letterSpacing: '3px',
                    margin: 0,
                    lineHeight: 1.05,
                  }}
                >
                  HṚṢĪKEŚA
                </h1>
              </div>
              <p
                style={{
                  fontSize: '17px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.65,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 400,
                }}
              >
                A self-contained, sovereign AI operating system engineered for absolute privacy, 
                canonical <strong>33-agent autonomous workforce</strong> orchestration, and direct personal computing control on your machine.
              </p>
            </div>
          </div>

          {/* Key Metric Tickers */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              paddingTop: '16px',
              borderTop: '1px solid rgba(212, 168, 55, 0.15)',
            }}
          >
            <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '24px' }}>
              <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>33 Canonical Agents</span>
              <span style={{ color: 'var(--text-muted)' }}>Vedic 33-Deva Structure</span>
            </div>
            <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '24px' }}>
              <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>101+ Native Tools</span>
              <span style={{ color: 'var(--text-muted)' }}>Governed Levers</span>
            </div>
            <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '24px' }}>
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>Sub-second</span>
              <span style={{ color: 'var(--text-muted)' }}>Offline Neural Voice</span>
            </div>
            <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '24px' }}>
              <span style={{ color: '#10B981', fontWeight: 700 }}>Zero Cloud Leakage</span>
              <span style={{ color: 'var(--text-muted)' }}>Air-Gapped Sovereignty</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: VOICE-TO-VOICE INTERACTION GOLDEN CIRCLE
         ========================================================================= */}
      <section className="scroll-reveal-section reveal-from-center is-visible" style={{ position: 'relative', zIndex: 2 }}>
        <div
          className="glass-panel golden-circle-container"
          style={{
            padding: '36px 32px 42px 32px',
            border: '1.5px solid rgba(212, 168, 55, 0.25)',
          }}
        >
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px', maxWidth: '680px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '20px', background: 'rgba(212, 168, 55, 0.12)', border: '1px solid rgba(212, 168, 55, 0.3)', marginBottom: '8px' }}>
              <Radio size={14} color="var(--accent-gold)" className="animate-pulse" />
              <span style={{ fontSize: '11.5px', color: 'var(--text-gold)', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                Direct Voice-to-Voice Interaction
              </span>
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '4px 0 6px 0' }}>
              Speak with HṚṢĪKEŚA
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              {!hasInitiatedVoice
                ? 'Click the golden circle below to start real-time voice conversation.'
                : 'Speak naturally or tap the orb to control your voice dialogue.'}
            </p>
          </div>

          {/* Golden Circle Orb Stage with Halo Pulsations */}
          <div
            className={`golden-circle-stage state-${voiceState.toLowerCase()}`}
            onClick={handleGoldenCircleClick}
            title={
              !hasInitiatedVoice
                ? 'Click Golden Circle to start voice interaction'
                : voiceState === 'LISTENING'
                ? 'Listening to you... Click to pause'
                : voiceState === 'SPEAKING'
                ? 'Speaking... Click to pause'
                : 'Click to talk'
            }
            style={{ margin: '16px 0 24px 0' }}
          >
            {/* Pulsing Outer Cosmic Halo Rings */}
            <div className="golden-halo-ring golden-halo-ring-1" />
            <div className="golden-halo-ring golden-halo-ring-2" />
            <div className="golden-halo-ring golden-halo-ring-3" />

            {/* The 3D Golden Particle Orb */}
            <GoldenVoiceOrb
              state={voiceState}
              size={330}
              interactive={true}
              statusLabel={voiceStatusText}
              onMicClick={handleGoldenCircleClick}
            />
          </div>

          {/* Interactive Live Dialogue Bubble (Appears on click & streams AI response) */}
          <div className="golden-dialogue-bubble" style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(212, 168, 55, 0.18)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: '13px' }}>
                  H
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-gold)', fontFamily: 'var(--font-cinzel)' }}>
                    HṚṢĪKEŚA AI Voice
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    {voiceState === 'SPEAKING' ? 'Speaking...' : voiceState === 'LISTENING' ? 'Listening...' : voiceState === 'WORKING' ? 'Reasoning...' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Controls: Audio Wave Visualizer & Mute Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`voice-audio-bars ${voiceState === 'SPEAKING' || voiceState === 'LISTENING' ? 'active' : ''}`}>
                  <div className="voice-audio-bar" />
                  <div className="voice-audio-bar" />
                  <div className="voice-audio-bar" />
                  <div className="voice-audio-bar" />
                  <div className="voice-audio-bar" />
                  <div className="voice-audio-bar" />
                  <div className="voice-audio-bar" />
                  <div className="voice-audio-bar" />
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTtsMuted((prev) => !prev);
                    if (!isTtsMuted) stopVoice();
                  }}
                  className="fluid-stage-pill"
                  style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '16px' }}
                  title={isTtsMuted ? 'Unmute voice synthesis' : 'Mute voice synthesis'}
                >
                  {isTtsMuted ? <VolumeX size={14} color="#ef4444" /> : <Volume2 size={14} color="var(--accent-gold)" />}
                  <span>{isTtsMuted ? 'Muted' : 'Voice On'}</span>
                </button>

                {currentDialogue && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyDialogue();
                    }}
                    className="fluid-stage-pill"
                    style={{ padding: '5px 10px', fontSize: '11.5px', borderRadius: '16px' }}
                    title="Copy response text"
                  >
                    {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Live Spoken Text Output */}
            <div style={{ minHeight: '64px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userTranscript && (
                <div style={{ fontSize: '13px', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <Users size={13} />
                  <span>You: "{userTranscript}"</span>
                </div>
              )}

              {interimTranscript && (
                <div style={{ fontSize: '13px', color: '#a855f7', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mic size={13} className="animate-pulse" />
                  <span>Listening: "{interimTranscript}..."</span>
                </div>
              )}

              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  margin: 0,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {currentDialogue || (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Click the golden circle above to start. When clicked, HṚṢĪKEŚA will greet you and listen to your command.
                  </span>
                )}
              </p>
            </div>

            {/* Interactive Inline Prompt Input & Language Selector */}
            <form onSubmit={handleTextSubmit} style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Language Selector Dropdown */}
              <select
                value={selectedLang.code}
                onChange={(e) => {
                  const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                  if (found) setSelectedLang(found);
                }}
                className="glass-pill"
                style={{
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  borderRadius: '24px',
                  background: 'rgba(26, 15, 6, 0.95)',
                  color: 'var(--text-gold)',
                  border: '1px solid rgba(212, 168, 55, 0.3)',
                  cursor: 'pointer',
                }}
                title="Select Voice Language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} style={{ background: '#1a0f06', color: '#f0dca0' }}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type a message to HṚṢĪKEŚA..."
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 18px',
                    borderRadius: '26px',
                    background: 'rgba(14, 8, 4, 0.8)',
                    border: '1px solid rgba(212, 168, 55, 0.3)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (voiceState === 'LISTENING') {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: voiceState === 'LISTENING' ? '#a855f7' : 'var(--text-gold)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={voiceState === 'LISTENING' ? 'Stop listening' : 'Speak via microphone'}
                >
                  {voiceState === 'LISTENING' ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!textInput.trim()}
                style={{
                  padding: '11px 20px',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </form>

            {/* Quick Interactive Prompt Suggestions */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Try asking:
              </span>
              {sampleQuickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => {
                    setUserTranscript(item.prompt);
                    setHasInitiatedVoice(true);
                    handleProcessUserQuery(item.prompt);
                  }}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: PANORAMIC CAPABILITIES STAGE: SEAMLESS HORIZONTAL PILLS
         ========================================================================= */}
      <section
        className="scroll-reveal-section reveal-from-left"
        style={{ position: 'relative', zIndex: 1 }}
        onMouseEnter={() => setIsAutoCycling(false)}
        onMouseLeave={() => setIsAutoCycling(true)}
      >
        {/* Horizontal Navigation Pills */}
        <div style={{ marginBottom: '20px' }}>
          <div className="fluid-stage-bar">
            {executionPillars.map((pillar, idx) => (
              <button
                key={pillar.id}
                className={`fluid-stage-pill ${idx === activeStageTab ? 'active' : ''}`}
                onClick={() => setActiveStageTab(idx)}
              >
                <span>{pillar.tabTitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Panoramic Glass Stage Canvas */}
        <div className="panoramic-glass-stage" style={{ padding: '38px 44px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.25fr) minmax(320px, 1fr)', gap: '48px', alignItems: 'center' }}>
            {/* Left Narrative Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(212, 168, 55, 0.12)',
                    border: '1px solid rgba(212, 168, 55, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currentPillar.icon}
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700 }}>
                    {currentPillar.tag}
                  </span>
                  <h2 style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: 0 }}>
                    {currentPillar.title}
                  </h2>
                </div>
              </div>

              <p style={{ fontSize: '15.5px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {currentPillar.description}
              </p>

              {/* Feature Highlights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                {currentPillar.highlights.map((item, idx) => (
                  <div key={idx} className="seamless-feature-bullet">
                    <Sparkles size={14} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Direct Action Link Button */}
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={() => onNavigate(currentPillar.tab)}
                  className="btn btn-primary"
                  style={{
                    padding: '11px 22px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '30px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{currentPillar.actionText}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Right Telemetry Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px' }}>
                Architecture & Telemetry Specs
              </span>
              {currentPillar.metrics.map((metric, mIdx) => (
                <div key={mIdx} className="metric-glow-item">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', boxShadow: '0 0 8px var(--accent-gold)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{metric.label}</span>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{metric.val}</strong>
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: '8px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(0, 196, 168, 0.05)',
                  border: '1px solid rgba(0, 196, 168, 0.18)',
                  fontSize: '12.5px',
                  color: 'var(--accent-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Lock size={14} style={{ flexShrink: 0 }} />
                <span>Runs 100% locally on your workstation with sovereign cryptographic privacy.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: 3D INFINITE COVERFLOW: 33 CANONICAL AGENTS
         ========================================================================= */}
      <section
        ref={coverflowSectionRef}
        className="scroll-reveal-section reveal-from-center"
        style={{ position: 'relative', zIndex: 1 }}
        onMouseEnter={() => setIsAgentAutoPlaying(false)}
        onMouseLeave={() => {
          if (!isDragging) setIsAgentAutoPlaying(true);
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '22px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Canonical Workforce
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-gold)',
                  background: 'rgba(212, 168, 55, 0.08)',
                  border: '1px solid rgba(212, 168, 55, 0.22)',
                  padding: '3px 12px',
                  borderRadius: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Agent {centerAgentIdx + 1} of {canonical33Roster.length}</span>
                <span>•</span>
                <span>Drag sideways or scroll to explore ⟷</span>
              </span>
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
              33 Specialized Canonical Agents
            </h2>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="carousel-nav-btn"
              onClick={handlePrevAgent}
              aria-label="Previous agent"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="carousel-nav-btn"
              onClick={handleNextAgent}
              aria-label="Next agent"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* 3D Infinite Coverflow Stage with Click & Drag Scrubbing */}
        <div
          className={`coverflow-carousel-container ${isDragging ? 'is-dragging' : ''}`}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
        >
          {canonical33Roster.map((agent, idx) => {
            const total = canonical33Roster.length;
            let offset = idx - centerAgentIdx;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            const isCenter = offset === 0;
            const absOffset = Math.abs(offset);

            if (absOffset > 3) return null;

            const scale = isCenter ? 1.15 : Math.max(0.68, 1 - absOffset * 0.16);
            const opacity = isCenter ? 1 : Math.max(0.18, 1 - absOffset * 0.38);
            const zIndex = 25 - absOffset * 6;
            const translateX = offset * 280;
            const rotateY = offset * -14;

            return (
              <div
                key={agent.name}
                className={`coverflow-agent-card ${isCenter ? 'active' : ''}`}
                style={{
                  transform: `translateX(calc(-50% + ${translateX}px)) scale(${scale}) rotateY(${rotateY}deg)`,
                  left: '50%',
                  opacity,
                  zIndex,
                }}
                onClick={() => {
                  if (hasDragged.current) return;
                  if (isCenter) {
                    onNavigate('office');
                  } else {
                    setCenterAgentIdx(idx);
                  }
                }}
                title={isCenter ? `Open ${agent.name}'s workstation in 3D Virtual Office` : `Bring ${agent.name} to center`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: isCenter ? 'linear-gradient(135deg, rgba(212, 168, 55, 0.3) 0%, rgba(26, 15, 6, 0.9) 100%)' : 'rgba(212, 168, 55, 0.12)',
                        border: `1px solid ${isCenter ? 'var(--accent-gold)' : 'rgba(212, 168, 55, 0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-gold)',
                        fontWeight: 800,
                        fontFamily: 'var(--font-cinzel)',
                        fontSize: '15px',
                        boxShadow: isCenter ? '0 0 12px rgba(212, 168, 55, 0.4)' : 'none',
                      }}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ fontSize: isCenter ? '18px' : '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)', margin: 0 }}>
                          {agent.name}
                        </h3>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--accent-teal)', fontWeight: 600 }}>{agent.role}</span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: isCenter ? 'rgba(212, 168, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isCenter ? 'rgba(212, 168, 55, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: isCenter ? 'var(--text-gold)' : 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {agent.tier}
                  </span>
                </div>

                <p style={{ fontSize: isCenter ? '13px' : '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  {agent.desc}
                </p>

                {isCenter && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid rgba(212, 168, 55, 0.15)' }}>
                    <span>Workstation: Ready</span>
                    <span style={{ color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                      Open Desk in Office <ArrowRight size={12} />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: FOUNDER & SOVEREIGN NODE BAR
         ========================================================================= */}
      <section className="scroll-reveal-section reveal-from-right" style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="panoramic-glass-stage"
          style={{
            padding: '30px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '36px',
            flexWrap: 'wrap',
          }}
        >
          {/* Founder Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: '280px', flex: 1 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(200, 146, 14, 0.25) 0%, rgba(20, 12, 5, 0.9) 100%)',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-gold)',
                flexShrink: 0,
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700 }}>
                Founder & Lead Architect
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-gold)', margin: '2px 0 0 0' }}>
                Rushikesh Pattiwar
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Operating under complete creator allegiance, zero cloud lock-in, and local privacy guarantees.
              </p>
            </div>
          </div>

          {/* Node Architecture Spec Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>PERSISTENCE</span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>SQLite 3 WAL</span>
            </div>
            <span style={{ opacity: 0.2, height: '24px', width: '1px', background: 'var(--text-muted)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>CLUSTER MESH</span>
              <span style={{ fontSize: '12.5px', color: 'var(--accent-teal)', fontWeight: 600 }}>TLS 1.3 Port 4300</span>
            </div>
            <span style={{ opacity: 0.2, height: '24px', width: '1px', background: 'var(--text-muted)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>INFERENCE</span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-gold)', fontWeight: 600 }}>Bundled Ollama</span>
            </div>
            <span style={{ opacity: 0.2, height: '24px', width: '1px', background: 'var(--text-muted)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>CAPABILITIES</span>
              <span style={{ fontSize: '12.5px', color: '#10B981', fontWeight: 600 }}>101 Tools • 33 Agents</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

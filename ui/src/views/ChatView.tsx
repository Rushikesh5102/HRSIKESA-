import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  RotateCcw,
  Bot,
  User,
  Clock,
  Volume2,
  VolumeX,
  AlertCircle,
  Mic,
  MicOff,
  Sparkles,
  Radio,
  Globe,
  MessageSquare,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  StopCircle,
  Zap,
  Sliders,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ChatMessage } from '../types/api.types';
import { api } from '../services/api';
import { AICore, AICoreState } from '../components/AICore';
import { GoldenVoiceOrb, OrbState } from '../components/GoldenVoiceOrb';
import { IndianFrame } from '../components/IndianFrame';
import { AnimationService } from '../services/animation.service';

// Supported Indian Languages with BCP-47 tags and native script
export interface IndianLanguage {
  code: string;
  name: string;
  nativeName: string;
  promptInstruction: string;
}

export const INDIAN_LANGUAGES: IndianLanguage[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', promptInstruction: 'Respond in clear, articulate English.' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'Hindi', promptInstruction: 'Respond in clear, articulate Hindi.' },
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'Sanskrit', promptInstruction: 'Respond in clean, eloquent Sanskrit.' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'Marathi', promptInstruction: 'Respond in clear, fluent Marathi.' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'Gujarati', promptInstruction: 'Respond in clear Gujarati.' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'Tamil', promptInstruction: 'Respond in clear Tamil.' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'Telugu', promptInstruction: 'Respond in clear Telugu.' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'Kannada', promptInstruction: 'Respond in clear Kannada.' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'Bengali', promptInstruction: 'Respond in clear Bengali.' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'Malayalam', promptInstruction: 'Respond in clear Malayalam.' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'Punjabi', promptInstruction: 'Respond in clear Punjabi.' },
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

interface ChatSessionItem {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt?: string;
  messageCount?: number;
}

interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sessionId: string;
  setSessionId: (id: string) => void;
  onVoiceSynthesize?: (text: string) => void;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  badge: string;
  speed: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: 'qwen2.5:7b', name: 'Local Fast (Qwen 2.5 7B)', provider: 'ollama', badge: '⚡ Local Fast', speed: 'Optimized 512t' },
  { id: 'llama-3.3-70b-versatile', name: 'Groq (Llama 3.3 70B)', provider: 'groq', badge: '🚀 500 t/s Ultra-Fast', speed: '500 tokens/s' },
  { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash', provider: 'gemini', badge: '⚡ Gemini Flash', speed: 'Ultra-Fast' },
  { id: 'gpt-4o', name: 'OpenAI GPT-4o', provider: 'openai', badge: '🧠 GPT-4o', speed: 'Smart Cloud' },
  { id: 'claude-3-7-sonnet', name: 'Anthropic Claude 3.7', provider: 'anthropic', badge: '🔮 Claude Sonnet', speed: 'Reasoning' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', badge: '🌌 DeepSeek V3', speed: 'Cloud' },
];

// Sovereign Audio PCM to WAV Base64 encoder (zero external dependencies)
function encodePcmToWavBase64(buffers: Float32Array[], sampleRate: number): string {
  let totalLength = 0;
  for (const b of buffers) totalLength += b.length;
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    merged.set(b, offset);
    offset += b.length;
  }

  const buffer = new ArrayBuffer(44 + merged.length * 2);
  const view = new DataView(buffer);

  const writeStr = (v: DataView, o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };

  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + merged.length * 2, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, merged.length * 2, true);

  let byteOffset = 44;
  for (let i = 0; i < merged.length; i++, byteOffset += 2) {
    const s = Math.max(-1, Math.min(1, merged[i]));
    view.setInt16(byteOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  setMessages,
  sessionId,
  setSessionId,
  onVoiceSynthesize,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState<number>(0);

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[0]);

  // Response Mode state (Part C: CONCISE, NORMAL, DETAILED, DEEP - default NORMAL)
  const [responseMode, setResponseMode] = useState<'CONCISE' | 'NORMAL' | 'DETAILED' | 'DEEP'>('NORMAL');

  // Multilingual state
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>(INDIAN_LANGUAGES[0]);

  // Voice-to-Voice Full Duplex state
  const [isVoiceToVoice, setIsVoiceToVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [voiceViewMode, setVoiceViewMode] = useState<'chamber' | 'transcript'>('chamber');

  // Multi-Chat History state (Panel 4) - Default closed for clean spacious dialogue
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const isVoiceToVoiceRef = useRef(isVoiceToVoice);
  isVoiceToVoiceRef.current = isVoiceToVoice;
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sovereign Direct Microphone Audio Engine Refs (Zero Google/Cloud dependency)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmBuffersRef = useRef<Float32Array[]>([]);
  const silenceTimerRef = useRef<any>(null);
  const hasSpokenRef = useRef(false);
  const isDirectRecordingRef = useRef(false);
  const handleSendMessageRef = useRef<(text: string) => void>(() => {});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (messagesContainerRef.current) {
      const rows = messagesContainerRef.current.querySelectorAll('.chat-msg-row');
      const lastRow = rows[rows.length - 1] as HTMLElement;
      if (lastRow) {
        AnimationService.animateMessageIn(lastRow);
      }
    }
  }, [messages.length, loading, speakingMsgId]);

  // Load chat sessions from backend SQLite
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await api.getConversations();
      if (res && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.warn('Failed to load past chat sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Cleanup recognition, direct mic recorder, and speech on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      isDirectRecordingRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (scriptProcessorRef.current) {
        try { scriptProcessorRef.current.disconnect(); } catch (_) {}
        scriptProcessorRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (_) {}
        audioContextRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
        } catch (_) {}
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop current speech
  const stopSpeech = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (_) {}
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    api.interruptVoice().catch(() => {});
    setSpeakingMsgId(null);
  }, []);

  // Web SpeechSynthesis fallback
  const fallbackBrowserSpeech = useCallback(
    (msgId: string, cleanText: string, onDone?: () => void) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = selectedLanguage.code;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        (window as any).__hr_utterance = utterance;

        let finished = false;
        const finish = () => {
          if (!finished) {
            finished = true;
            setSpeakingMsgId(null);
            (window as any).__hr_utterance = null;
            if (onDone) onDone();
          }
        };

        utterance.onend = finish;
        utterance.onerror = finish;

        const timeoutMs = Math.max(4000, cleanText.length * 85);
        setTimeout(() => {
          if (!finished) {
            finish();
          }
        }, timeoutMs);

        window.speechSynthesis.speak(utterance);
      } else {
        setSpeakingMsgId(null);
        if (onDone) onDone();
      }
    },
    [selectedLanguage]
  );

  // Text-To-Speech Playback using real HṚṢĪKEŚA Sovereign backend voice with browser fallback
  const speakText = useCallback(
    async (msgId: string, text: string, onDone?: () => void) => {
      stopSpeech();
      const cleanText = text.replace(/[*#`_]/g, '').trim();
      if (!cleanText) {
        if (onDone) onDone();
        return;
      }

      setSpeakingMsgId(msgId);

      // 1. Try real HṚṢĪKEŚA Sovereign backend voice synthesis
      try {
        const langCode = selectedLanguage.code.split('-')[0] || 'en';
        const res = await api.synthesizeSpeech(cleanText.slice(0, 1200), langCode);
        if (res && res.audioUrl) {
          const audio = new Audio(res.audioUrl);
          activeAudioRef.current = audio;

          let doneCalled = false;
          const finishAudio = () => {
            if (!doneCalled) {
              doneCalled = true;
              setSpeakingMsgId(null);
              activeAudioRef.current = null;
              if (onDone) onDone();
            }
          };

          audio.onended = finishAudio;
          audio.onerror = () => {
            fallbackBrowserSpeech(msgId, cleanText, onDone);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('Backend TTS synthesis failed, using browser speech synthesis fallback', err);
      }

      // 2. Fallback to Browser Speech Synthesis
      fallbackBrowserSpeech(msgId, cleanText, onDone);
    },
    [selectedLanguage, stopSpeech, fallbackBrowserSpeech]
  );

  // Stop direct audio recording and optionally transcribe
  const stopDirectRecording = useCallback(
    async (shouldTranscribe = true) => {
      isDirectRecordingRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (scriptProcessorRef.current) {
        try {
          scriptProcessorRef.current.disconnect();
        } catch (_) {}
        scriptProcessorRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
        audioContextRef.current = null;
      }

      const buffers = pcmBuffersRef.current;
      pcmBuffersRef.current = [];
      const hadSpeech = hasSpokenRef.current;
      hasSpokenRef.current = false;

      if (!shouldTranscribe || buffers.length === 0 || !hadSpeech) {
        setIsListening(false);
        setInterimText('');
        if (isVoiceToVoiceRef.current && shouldKeepListeningRef.current && !loading && !speakingMsgId) {
          setTimeout(() => {
            if (isVoiceToVoiceRef.current && shouldKeepListeningRef.current && !loading && !speakingMsgId) {
              startDirectAudioRecording();
            }
          }, 350);
        }
        return;
      }

      setInterimText('Transcribing sovereign audio...');
      try {
        const base64Wav = encodePcmToWavBase64(buffers, 16000);
        const res = await api.transcribeAudio(base64Wav, 'wav');
        if (res && res.text && res.text.trim()) {
          const spoken = res.text.trim();
          setInterimText('');
          setIsListening(false);
          if (isVoiceToVoiceRef.current) {
            shouldKeepListeningRef.current = false;
            handleSendMessageRef.current(spoken);
          } else {
            setInput((prev) => (prev ? prev + ' ' + spoken : spoken));
          }
        } else {
          setInterimText('');
          setIsListening(false);
          if (isVoiceToVoiceRef.current && shouldKeepListeningRef.current && !loading && !speakingMsgId) {
            setTimeout(() => {
              if (isVoiceToVoiceRef.current && shouldKeepListeningRef.current && !loading && !speakingMsgId) {
                startDirectAudioRecording();
              }
            }, 350);
          }
        }
      } catch (err: any) {
        console.warn('Direct transcription error:', err);
        setVoiceError('Transcription error: ' + (err?.message || 'Processing failed'));
        setIsListening(false);
        setInterimText('');
      }
    },
    [loading, speakingMsgId]
  );

  // Start direct sovereign audio recording (Bypasses Google Speech restrictions)
  const startDirectAudioRecording = useCallback(async () => {
    stopSpeech();
    setVoiceError(null);
    pcmBuffersRef.current = [];
    hasSpokenRef.current = false;
    isDirectRecordingRef.current = true;
    shouldKeepListeningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      setIsListening(true);
      setInterimText('Listening (Sovereign Mic)...');

      processor.onaudioprocess = (e) => {
        if (!isDirectRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        pcmBuffersRef.current.push(new Float32Array(inputData));

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        if (rms > 0.02) {
          hasSpokenRef.current = true;
          setInterimText('Hearing your voice...');
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpokenRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (isDirectRecordingRef.current) {
              stopDirectRecording(true);
            }
          }, 1500);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err: any) {
      isDirectRecordingRef.current = false;
      setIsListening(false);
      setIsVoiceToVoice(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone permission denied. Please allow microphone in your browser settings.');
      } else {
        setVoiceError('Could not access microphone: ' + (err.message || 'Device error'));
      }
    }
  }, [stopSpeech, stopDirectRecording]);

  // Start Speech Recognition with automatic fallback to Direct Sovereign Microphone Capture
  const startListening = useCallback(async () => {
    setVoiceError(null);
    stopSpeech();

    // Check if Brave browser is detected (where webkitSpeechRecognition is blocked by design)
    const isBrave =
      typeof (navigator as any).brave !== 'undefined' &&
      typeof (navigator as any).brave.isBrave === 'function';

    const SpeechRecognitionClass = !isBrave
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

    if (!SpeechRecognitionClass) {
      // Launch sovereign direct microphone recording directly
      await startDirectAudioRecording();
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = selectedLanguage.code;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = true;

      shouldKeepListeningRef.current = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final.trim()) {
          const userText = final.trim();
          setInterimText('');
          setInput('');

          if (isVoiceToVoiceRef.current) {
            shouldKeepListeningRef.current = false;
            try {
              recognition.stop();
            } catch (_) {}
            setIsListening(false);
            handleSendMessageRef.current(userText);
          } else {
            setInput((prev) => (prev ? prev + ' ' + userText : userText));
          }
        } else {
          setInterimText(interim);
        }
      };

      recognition.onerror = async (event: any) => {
        if (event.error === 'no-speech') {
          return;
        }
        // If Google speech service is disabled or blocked in the browser, fallback to Sovereign Mic
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'network'
        ) {
          console.info('Speech recognition blocked by browser privacy. Activating Sovereign Microphone...');
          try {
            recognition.abort();
          } catch (_) {}
          recognitionRef.current = null;
          await startDirectAudioRecording();
          return;
        }
        if (event.error !== 'aborted') {
          setVoiceError(`Voice recognition: ${event.error}`);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (
          shouldKeepListeningRef.current &&
          !loading &&
          !speakingMsgId &&
          !isDirectRecordingRef.current
        ) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else if (!isDirectRecordingRef.current) {
          setIsListening(false);
          setInterimText('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.info('SpeechRecognition failed, falling back to sovereign direct mic.', err);
      await startDirectAudioRecording();
    }
  }, [selectedLanguage, stopSpeech, loading, speakingMsgId, startDirectAudioRecording]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (isDirectRecordingRef.current) {
      stopDirectRecording(true);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    setInterimText('');
  }, [stopDirectRecording]);

  // Toggle Voice-to-Voice mode
  const handleToggleVoiceToVoice = useCallback(() => {
    if (isVoiceToVoice) {
      setIsVoiceToVoice(false);
      stopListening();
      stopSpeech();
    } else {
      setIsVoiceToVoice(true);
      startListening();
    }
  }, [isVoiceToVoice, startListening, stopListening, stopSpeech]);

  // Elapsed timer when loading
  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsedSecs(0);
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedSecs(Number(((Date.now() - start) / 1000).toFixed(1)));
      }, 100);
    } else {
      setElapsedSecs(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Cancel in-flight model execution
  const handleStopExecution = useCallback(() => {
    stopSpeech();
    stopListening();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant' && last.streaming) {
        return [
          ...updated.slice(0, -1),
          {
            ...last,
            streaming: false,
            content: (last.content || '') + '\n\n*(Generation stopped by user)*',
          },
        ];
      }
      return updated;
    });
  }, [stopSpeech, stopListening]);

  // Send message
  const handleSendMessage = async (textToSend: string) => {
    handleSendMessageRef.current = handleSendMessage;
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // If a non-English Indian language is chosen, append guidance to response in that language
    let promptWithLang = trimmed;
    if (selectedLanguage.code !== 'en-IN') {
      promptWithLang = `${trimmed}\n\n[Language Preference: ${selectedLanguage.promptInstruction}]`;
    }

    const startTime = Date.now();
    const astMsgId = `ast-${Date.now()}`;

    // Add placeholder streaming message immediately
    const assistantMsg: ChatMessage = {
      id: astMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      model: selectedModel.name,
      streaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await api.streamChat(
        promptWithLang,
        sessionId,
        selectedModel.id,
        selectedModel.provider,
        (token: string) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === astMsgId ? { ...m, content: m.content + token } : m))
          );
        },
        responseMode,
        abortController.signal
      );

      const durationMs = Date.now() - startTime;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === astMsgId
            ? {
                ...m,
                content: res.response || m.content,
                model: res.model || selectedModel.name,
                durationMs: res.durationMs || durationMs,
                metrics: res.metrics,
                streaming: false,
              }
            : m
        )
      );

      loadSessions(); // refresh history list

      // If Voice-to-Voice mode is active, auto-speak the response, then resume listening!
      if (isVoiceToVoiceRef.current) {
        speakText(astMsgId, res.response, () => {
          if (isVoiceToVoiceRef.current) {
            startListening();
          }
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      const errMsg = err.message || 'I had trouble formulating a response.';
      setError(errMsg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === astMsgId
            ? {
                ...m,
                content: `Error: ${errMsg}`,
                error: true,
                streaming: false,
              }
            : m
        )
      );

      if (isVoiceToVoiceRef.current) {
        startListening();
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };
  handleSendMessageRef.current = handleSendMessage;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // Create fresh chat
  const handleNewChat = () => {
    stopSpeech();
    stopListening();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newSession = `session-${Date.now()}`;
    setSessionId(newSession);
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: 'HṚṢĪKEŚA Sovereign Control Plane online. Multi-agent workforce and governed tool bus active. How may I serve you, Master Rushikesh?',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Switch to past session
  const handleSelectSession = async (sId: string) => {
    if (sId === sessionId) return;
    stopSpeech();
    stopListening();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSessionId(sId);
    setLoading(true);
    try {
      const res = await api.getConversation(sId);
      if (res && res.messages && res.messages.length > 0) {
        const mapped: ChatMessage[] = res.messages.map((m: any) => ({
          id: m.id || `msg-${Date.now()}-${Math.random()}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
          model: m.model,
          durationMs: m.durationMs,
        }));
        setMessages(mapped);
      } else {
        const matched = sessions.find((s) => s.id === sId);
        setMessages([
          {
            id: `init-${Date.now()}`,
            role: 'assistant',
            content: `Switched to workspace session: "${matched?.title || sId}". Ready to continue.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load session messages', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (e: React.MouseEvent, sId: string) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(sId);
      setSessions((prev) => prev.filter((s) => s.id !== sId));
      if (sId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  // Clear all sessions
  const handleClearAllSessions = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete all chat history? This will permanently remove all stored conversation sessions.')) {
      return;
    }
    try {
      await api.clearAllConversations();
      setSessions([]);
      handleNewChat();
    } catch (err) {
      console.error('Failed to clear all sessions', err);
    }
  };

  // Clear active chat messages
  const handleClearCurrentChat = async () => {
    if (!window.confirm('Clear all messages in the active chat conversation?')) {
      return;
    }
    stopSpeech();
    stopListening();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    try {
      if (sessionId) {
        await api.deleteConversation(sessionId).catch(() => {});
      }
    } catch (_) {}
    setMessages([]);
    loadSessions();
  };

  // Determine current 3D Core state
  let chatCoreState: AICoreState = 'IDLE';
  if (isListening || isVoiceToVoice) chatCoreState = 'LISTENING';
  else if (loading) chatCoreState = 'WORKING';
  else if (speakingMsgId) chatCoreState = 'SPEAKING';
  else if (error) chatCoreState = 'ERROR';

  return (
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', height: 'calc(100vh - 90px)', display: 'flex', gap: '16px', position: 'relative', padding: '0 8px' }}>
      {/* Optional Chat Sessions Drawer */}
      {showHistory && (
        <div
          style={{
            width: '260px',
            flexShrink: 0,
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            zIndex: 20,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="var(--accent-gold)" />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Chat History</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {sessions.length > 0 && (
                <button
                  onClick={handleClearAllSessions}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    fontSize: '11px',
                    height: '26px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}
                  title="Clear All Chat History"
                >
                  <Trash2 size={12} /> Clear All
                </button>
              )}
              <button
                onClick={handleNewChat}
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px', height: '26px' }}
                title="New Conversation"
              >
                <Plus size={13} /> New
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sessions.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                No past chat history found.
              </div>
            ) : (
              sessions.map((s) => {
                const isCurrent = s.id === sessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrent ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(56, 189, 248, 0.08))' : 'transparent',
                      border: isCurrent ? '1px solid var(--border-accent)' : '1px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ overflow: 'hidden', flex: 1, paddingRight: '8px' }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? 'var(--text-gold)' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.title || `Session ${s.id.slice(0, 12)}...`}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(s.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 18px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: showHistory ? 'rgba(212, 175, 55, 0.15)' : undefined,
                borderColor: showHistory ? 'var(--accent-gold)' : undefined,
              }}
              title={showHistory ? 'Hide Chat History' : 'Show Chat History'}
            >
              <MessageSquare size={14} color="var(--accent-gold)" />
              {showHistory ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>

            <AICore state={chatCoreState} size={44} interactive={false} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>HṚṢĪKEŚA Direct Dialogue</span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {isVoiceToVoice
                  ? '🎙️ Voice-to-Voice Duplex Active'
                  : loading
                  ? 'Formulating response...'
                  : isListening
                  ? 'Listening to speech...'
                  : 'Sovereign Control Plane • Voice & Neural Cognition'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            {/* Model / Engine Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-gold)" />
              <select
                value={selectedModel.id}
                onChange={(e) => {
                  const match = MODEL_OPTIONS.find((m) => m.id === e.target.value);
                  if (match) setSelectedModel(match);
                }}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
                title="Select Cognition Engine / Model"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.badge} — {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Response Mode Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--accent-teal)" />
              <select
                value={responseMode}
                onChange={(e) => setResponseMode(e.target.value as any)}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-teal)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
                title="Response Mode"
              >
                <option value="CONCISE">⚡ Concise</option>
                <option value="NORMAL">⚡ Normal</option>
                <option value="DETAILED">📚 Detailed</option>
                <option value="DEEP">🧠 Deep Reasoning</option>
              </select>
            </div>

            {/* Indian Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} color="var(--accent-gold)" />
              <select
                value={selectedLanguage.code}
                onChange={(e) => {
                  const match = INDIAN_LANGUAGES.find((l) => l.code === e.target.value);
                  if (match) setSelectedLanguage(match);
                }}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-gold)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
                title="Select Indian Language"
              >
                {INDIAN_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* 1-on-1 Voice-to-Voice Duplex Toggle */}
            <button
              onClick={handleToggleVoiceToVoice}
              className={`btn ${isVoiceToVoice ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isVoiceToVoice ? '0 0 16px rgba(212, 175, 55, 0.4)' : 'none',
                borderColor: isVoiceToVoice ? 'var(--accent-gold)' : undefined,
              }}
              title="Toggle continuous 1-on-1 voice conversation loop"
            >
              {isVoiceToVoice ? <Radio size={14} className="animate-pulse-ring" /> : <Headphones size={14} />}
              <span>{isVoiceToVoice ? 'Voice-to-Voice ON' : 'Voice-to-Voice'}</span>
            </button>

            {isVoiceToVoice && (
              <button
                onClick={() => setVoiceViewMode(voiceViewMode === 'chamber' ? 'transcript' : 'chamber')}
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '6px 10px', color: 'var(--text-gold)', border: '1px solid var(--border-accent)' }}
                title="Toggle between 3D Cosmic Orb and Chat Transcript"
              >
                <Sparkles size={13} color="var(--accent-gold)" />
                <span>{voiceViewMode === 'chamber' ? '💬 Transcript View' : '🔮 Cosmic Orb View'}</span>
              </button>
            )}

            <button
              onClick={handleClearCurrentChat}
              className="btn btn-secondary"
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                color: '#FDA4AF',
                borderColor: 'rgba(225, 29, 72, 0.4)',
                background: 'rgba(225, 29, 72, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Clear active chat messages"
            >
              <Trash2 size={13} color="#F87171" />
              <span>Clear Chat</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleNewChat}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Start fresh conversation"
            >
              <RotateCcw size={13} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Live Audio Visualizer Banner during active voice (in transcript mode) */}
        {(isVoiceToVoice || speakingMsgId || isListening) && (!isVoiceToVoice || voiceViewMode === 'transcript') && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <div className="audio-bar" style={{ animationDelay: '0.1s' }} />
                <div className="audio-bar" style={{ animationDelay: '0.3s' }} />
                <div className="audio-bar" style={{ animationDelay: '0.5s' }} />
                <div className="audio-bar" style={{ animationDelay: '0.2s' }} />
                <div className="audio-bar" style={{ animationDelay: '0.4s' }} />
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-gold)' }}>
                {speakingMsgId
                  ? 'Speaking response in ' + selectedLanguage.nativeName + '... (Tap Stop to interrupt)'
                  : isListening
                  ? 'Listening for speech in ' + selectedLanguage.nativeName + '...'
                  : 'Voice Loop Active'}
              </span>
            </div>

            {speakingMsgId && (
              <button
                onClick={stopSpeech}
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
              >
                <StopCircle size={13} color="var(--accent-rose)" /> Interrupt / Stop
              </button>
            )}
          </div>
        )}

        {/* Voice Error Notification */}
        {voiceError && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(225, 29, 72, 0.15)',
              border: '1px solid var(--accent-rose)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '12.5px',
              color: '#FDA4AF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{voiceError}</span>
            </div>
            <button
              onClick={() => {
                setVoiceError(null);
                startListening();
              }}
              className="btn btn-secondary"
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                color: '#fff',
                borderColor: 'var(--accent-rose)',
                background: 'rgba(225, 29, 72, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              Retry Microphone
            </button>
          </div>
        )}

        {/* Center-Stage Immersive Golden Voice Chamber Mode */}
        {isVoiceToVoice && voiceViewMode === 'chamber' ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.08) 0%, rgba(10, 6, 2, 0.85) 75%)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8), 0 0 24px rgba(245, 158, 11, 0.1)',
            }}
          >
            {/* Ambient Background Aura */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '420px',
                height: '420px',
                borderRadius: '50%',
                background:
                  speakingMsgId
                    ? 'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(10, 6, 2, 0) 70%)'
                    : isListening
                    ? 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(10, 6, 2, 0) 70%)'
                    : 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(10, 6, 2, 0) 70%)',
                pointerEvents: 'none',
                filter: 'blur(30px)',
                transition: 'background 0.5s ease',
              }}
            />

            {/* 3D Golden Cosmic Particle Orb */}
            <GoldenVoiceOrb
              state={
                speakingMsgId
                  ? 'SPEAKING'
                  : isListening
                  ? 'LISTENING'
                  : loading
                  ? 'WORKING'
                  : voiceError
                  ? 'ERROR'
                  : 'IDLE'
              }
              size={320}
              interactive={true}
              onMicClick={isListening ? stopListening : startListening}
              statusLabel={
                speakingMsgId
                  ? `Speaking in ${selectedLanguage.nativeName}...`
                  : isListening
                  ? `Listening (${selectedLanguage.nativeName})...`
                  : loading
                  ? 'Formulating Response...'
                  : 'Available • Speak Anytime'
              }
            />

            {/* Subtitles / Live Speech Transcription Bar */}
            <div
              style={{
                marginTop: '24px',
                maxWidth: '680px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                alignItems: 'center',
                zIndex: 10,
              }}
            >
              {/* User Live / Interim Transcript */}
              {interimText && (
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px dashed #38BDF8',
                    padding: '8px 18px',
                    borderRadius: '24px',
                    color: '#38BDF8',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 16px rgba(56, 189, 248, 0.2)',
                  }}
                >
                  <Mic size={14} className="animate-pulse-ring" />
                  <span>"{interimText}..."</span>
                </div>
              )}

              {/* Latest Assistant Spoken Message */}
              {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <div
                  style={{
                    background: 'rgba(20, 14, 6, 0.85)',
                    border: '1.5px solid rgba(212, 168, 55, 0.45)',
                    padding: '14px 22px',
                    borderRadius: '16px',
                    color: '#fef08a',
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(245, 158, 11, 0.15)',
                    maxHeight: '110px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 700 }}>
                    HṚṢĪKEŚA Response ({selectedLanguage.nativeName})
                  </div>
                  <div>{messages[messages.length - 1].content}</div>
                </div>
              )}

              {/* Interrupt / Barge-In Floating Action */}
              {speakingMsgId && (
                <button
                  onClick={stopSpeech}
                  style={{
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(225, 29, 72, 0.4)',
                    marginTop: '4px',
                  }}
                >
                  <StopCircle size={14} /> Interrupt / Stop Speaking
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Classic Messages List Area */
          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 0 24px var(--accent-gold-glow)' }}>
                ⚡
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                  HṚṢĪKEŚA Sovereign Dialogue Plane
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px' }}>
                  Direct low-latency cognition bus connected to local models and the 33-agent sovereign hierarchy.
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '520px', marginTop: '8px' }}>
                {[
                  'What is the current system health and memory state?',
                  'Plan a multi-agent software engineering initiative',
                  'Synthesize live telemetry from active workers',
                  'Draft a strategic architecture document'
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleSendMessage(promptText)}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-gold)';
                      e.currentTarget.style.color = 'var(--accent-gold-bright)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeaking = speakingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className="chat-msg-row"
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  width: '100%',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isUser
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(30, 41, 59, 0.9))'
                      : 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
                    border: `1px solid ${isUser ? 'rgba(56, 189, 248, 0.4)' : 'rgba(232, 184, 48, 0.5)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isUser ? '#38BDF8' : '#060810',
                    flexShrink: 0,
                    boxShadow: isUser ? '0 0 12px rgba(56, 189, 248, 0.25)' : '0 0 14px var(--accent-gold-glow)',
                  }}
                >
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                {/* Message Bubble (Panel 4) */}
                <div
                  style={{
                    maxWidth: '80%',
                    background: isUser
                      ? 'linear-gradient(135deg, rgba(200, 146, 14, 0.16) 0%, rgba(26, 15, 6, 0.96) 100%)'
                      : 'rgba(20, 12, 6, 0.95)',
                    border: `1px solid ${isUser ? 'rgba(232, 184, 48, 0.45)' : 'rgba(200, 146, 14, 0.35)'}`,
                    borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    padding: '16px 20px',
                    boxShadow: isUser
                      ? '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(232, 184, 48, 0.2)'
                      : '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(200, 146, 14, 0.15)',
                    position: 'relative',
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '20px',
                        right: '20px',
                        height: '1.5px',
                        background: 'linear-gradient(90deg, transparent, #FFD700, #00E5FF, transparent)',
                        opacity: 0.8,
                      }}
                    />
                  )}

                  {/* Content */}
                  <div
                    style={{
                      fontSize: '14.5px',
                      lineHeight: '1.7',
                      color: 'var(--text-primary)',
                      fontWeight: 400,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                    {msg.streaming && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '7px',
                          height: '14px',
                          background: 'var(--accent-gold)',
                          marginLeft: '4px',
                          verticalAlign: 'middle',
                          borderRadius: '1px',
                          animation: 'pulse 0.8s infinite',
                        }}
                      />
                    )}
                  </div>

                  {/* Web Search Status Pill from Panel 4 */}
                  {!isUser && msg.content.includes('Research Plan') && (
                    <div
                      style={{
                        marginTop: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(0, 229, 255, 0.12)',
                        border: '1px solid rgba(0, 229, 255, 0.35)',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '11px',
                        color: '#00E5FF',
                        fontWeight: 600,
                      }}
                    >
                      <Globe size={12} />
                      <span>Web Search • Completed live intelligence fetch</span>
                    </div>
                  )}

                  {/* Footer / Meta */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={11} />
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.durationMs !== undefined && <span>• {(msg.durationMs / 1000).toFixed(1)}s</span>}
                      {msg.metrics?.ttfbMs !== undefined && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: 'var(--text-gold)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                          }}
                        >
                          ⚡ TTFB: {msg.metrics.ttfbMs}ms
                        </span>
                      )}
                    </div>

                    {!isUser && (
                      <button
                        onClick={() => (isSpeaking ? stopSpeech() : speakText(msg.id, msg.content))}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isSpeaking ? 'var(--accent-saffron-light)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          transition: 'color 0.15s',
                        }}
                        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                      >
                        {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        <span>{isSpeaking ? 'Mute' : 'Speak'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }))}

          {/* Thinking indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#060810',
                }}
              >
                <Sparkles size={18} className="animate-pulse-ring" />
              </div>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-accent)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 18px',
                  fontSize: '13px',
                  color: 'var(--text-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 0 16px rgba(245, 158, 11, 0.12)'
                }}
              >
                <span className="badge badge-running">{selectedModel.badge}</span>
                <span>Formulating response ({elapsedSecs.toFixed(1)}s)...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        )}

        {/* Interim Speech Preview */}
        {interimText && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px dashed #38BDF8',
              fontSize: '13px',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Mic size={14} className="animate-pulse-ring" />
            <span>"{interimText}..."</span>
          </div>
        )}

        {/* Input Box Area */}
        <IndianFrame variant="stone" style={{ padding: '12px 16px' }}>
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`btn ${isListening ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '9px 13px',
                borderRadius: 'var(--radius-sm)',
                color: isListening ? '#060810' : 'var(--text-primary)',
                background: isListening ? 'linear-gradient(135deg, var(--accent-saffron), #38BDF8)' : undefined,
                boxShadow: isListening ? '0 0 16px var(--accent-saffron-glow)' : 'none',
              }}
              title={isListening ? 'Click to stop listening' : 'Click to speak'}
            >
              {isListening ? <MicOff size={17} /> : <Mic size={17} />}
              <span style={{ fontSize: '12px' }}>{isListening ? 'Listening...' : 'Voice'}</span>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Type in ${selectedLanguage.nativeName} or English to HṚṢĪKEŚA...`}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '14.5px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
              disabled={loading}
            />

            {loading ? (
              <button
                type="button"
                onClick={handleStopExecution}
                className="btn"
                style={{
                  padding: '9px 16px',
                  fontSize: '13.5px',
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  color: '#fff',
                  border: '1px solid #ef4444',
                  boxShadow: '0 0 12px rgba(220, 38, 38, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Interrupt and cancel model generation"
              >
                <StopCircle size={15} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '9px 18px', fontSize: '13.5px' }}
                disabled={!input.trim()}
              >
                <span>Send</span>
                <Send size={15} />
              </button>
            )}
          </form>
        </IndianFrame>
      </div>
    </div>
  );
};

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
} from 'lucide-react';
import { ChatMessage } from '../types/api.types';
import { api } from '../services/api';
import { AICore, AICoreState } from '../components/AICore';
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
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', promptInstruction: 'Respond in clear, articulate Indian English.' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', promptInstruction: 'उत्तर शुद्ध और सरल हिन्दी (Devanagari script) में दीजिए।' },
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'संस्कृतम्', promptInstruction: 'उत्तरम् शुद्धे संस्कृते (Devanagari script) यच्छतु।' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', promptInstruction: 'उत्तर मराठीत (Devanagari script) द्या.' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', promptInstruction: 'જવાબ શુદ્ધ ગુજરાતી લિપિમાં આપો.' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', promptInstruction: 'பதிலை தமிழில் (Tamil script) தரவும்.' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', promptInstruction: 'సమాధానం తెలుగులో (Telugu script) ఇవ్వండి.' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', promptInstruction: 'ಉತ್ತರವನ್ನು ಕನ್ನಡದಲ್ಲಿ (Kannada script) ನೀಡಿ.' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', promptInstruction: 'উত্তর বাংলায় (Bengali script) দিন।' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', promptInstruction: 'മറുപടി മലയാളത്തിൽ (Malayalam script) നൽകുക.' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', promptInstruction: 'ਜਵਾਬ ਪੰਜਾਬੀ (Gurmukhi script) ਵਿੱਚ ਦਿਓ।' },
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

  // Multilingual state
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>(INDIAN_LANGUAGES[0]);

  // Voice-to-Voice Full Duplex state
  const [isVoiceToVoice, setIsVoiceToVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Multi-Chat History state (Panel 4)
  const [showHistory, setShowHistory] = useState(true);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const isVoiceToVoiceRef = useRef(isVoiceToVoice);
  isVoiceToVoiceRef.current = isVoiceToVoice;

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

  // Cleanup recognition and speech on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech Playback with language tag
  const speakText = useCallback(
    (msgId: string, text: string, onDone?: () => void) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*#`_]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = selectedLanguage.code;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          setSpeakingMsgId(null);
          if (onDone) onDone();
        };
        utterance.onerror = () => {
          setSpeakingMsgId(null);
          if (onDone) onDone();
        };

        setSpeakingMsgId(msgId);
        window.speechSynthesis.speak(utterance);
      } else if (onDone) {
        onDone();
      }
    },
    [selectedLanguage]
  );

  // Stop current speech
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  }, []);

  // Start Speech Recognition
  const startListening = useCallback(() => {
    setVoiceError(null);
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setVoiceError('Voice recognition not supported. Please use Google Chrome or Microsoft Edge.');
      setIsVoiceToVoice(false);
      return;
    }

    try {
      stopSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
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

          // If in Voice-to-Voice mode, auto-dispatch immediately
          if (isVoiceToVoiceRef.current) {
            shouldKeepListeningRef.current = false;
            recognition.stop();
            setIsListening(false);
            handleSendMessage(userText);
          } else {
            setInput((prev) => (prev ? prev + ' ' + userText : userText));
          }
        } else {
          setInterimText(interim);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Keep listening in voice-to-voice mode
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setVoiceError('Microphone blocked. Please click the lock/camera icon in your address bar to allow mic access.');
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setIsVoiceToVoice(false);
        } else if (event.error !== 'aborted') {
          setVoiceError(`Microphone error: ${event.error}`);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (shouldKeepListeningRef.current && !loading && !speakingMsgId) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimText('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setVoiceError('Failed to activate microphone.');
      setIsListening(false);
      setIsVoiceToVoice(false);
    }
  }, [selectedLanguage, stopSpeech, loading, speakingMsgId]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimText('');
  }, []);

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

  // Send message
  const handleSendMessage = async (textToSend: string) => {
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
        }
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
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // Create fresh chat
  const handleNewChat = () => {
    stopSpeech();
    stopListening();
    const newSession = `session-${Date.now()}`;
    setSessionId(newSession);
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: 'HṚṢĪKEŚA Sovereign Control Plane online. Multi-agent workforce and governed tool bus active. How may I serve you, Master Rushikesh?',
        timestamp: new Date().toISOString(),
        model: 'qwen2.5:7b',
      },
    ]);
  };

  // Switch to past session
  const handleSelectSession = async (sId: string) => {
    if (sId === sessionId) return;
    stopSpeech();
    stopListening();
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
            model: 'gpt-4o',
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

  // Determine current 3D Core state
  let chatCoreState: AICoreState = 'IDLE';
  if (isListening || isVoiceToVoice) chatCoreState = 'LISTENING';
  else if (loading) chatCoreState = 'WORKING';
  else if (speakingMsgId) chatCoreState = 'SPEAKING';
  else if (error) chatCoreState = 'ERROR';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', height: 'calc(100vh - 122px)', display: 'flex', gap: '16px', position: 'relative' }}>
      {/* Optional Chat Sessions Drawer */}
      {showHistory && (
        <div
          style={{
            width: '280px',
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
            <button
              onClick={handleNewChat}
              className="btn btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px', height: '26px' }}
              title="New Conversation"
            >
              <Plus size={13} /> New
            </button>
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
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Toggle Chat History Drawer"
            >
              <MessageSquare size={14} color="var(--accent-gold)" />
              {showHistory ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>

            <AICore state={chatCoreState} size={44} interactive={false} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>HṚṢĪKEŚA Intelligence</span>
                <span style={{ fontSize: '11px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
                  हृषीकेश
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {isVoiceToVoice
                  ? '🎙️ 1-on-1 Voice-to-Voice Active'
                  : loading
                  ? 'Formulating response...'
                  : isListening
                  ? 'Listening to speech...'
                  : 'Ready • Local autonomous session'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Model / Engine Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-sapphire)" />
              <select
                value={selectedModel.id}
                onChange={(e) => {
                  const match = MODEL_OPTIONS.find((m) => m.id === e.target.value);
                  if (match) setSelectedModel(match);
                }}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-sapphire-light)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '5px 8px',
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
                  color: 'var(--text-gold)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '5px 8px',
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
                padding: '6px 12px',
                boxShadow: isVoiceToVoice ? '0 0 16px var(--accent-gold-glow)' : 'none',
              }}
              title="Toggle continuous 1-on-1 voice conversation loop"
            >
              {isVoiceToVoice ? <Radio size={14} className="animate-pulse-ring" /> : <Headphones size={14} />}
              <span>{isVoiceToVoice ? 'Voice-to-Voice ON' : 'Voice-to-Voice'}</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleNewChat}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Start fresh conversation"
            >
              <RotateCcw size={13} />
              New
            </button>
          </div>
        </div>

        {/* Live Audio Visualizer Banner during active voice */}
        {(isVoiceToVoice || speakingMsgId || isListening) && (
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
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(225, 29, 72, 0.15)',
              border: '1px solid var(--accent-rose)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: '#FDA4AF',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{voiceError}</span>
          </div>
        )}

        {/* Messages List Area */}
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.map((msg) => {
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
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isUser
                      ? 'linear-gradient(135deg, var(--accent-sapphire), var(--accent-indigo))'
                      : 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isUser ? '#FFFFFF' : '#060810',
                    flexShrink: 0,
                    boxShadow: isUser ? 'none' : '0 0 14px var(--accent-gold-glow)',
                  }}
                >
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                {/* Message Bubble (Panel 4) */}
                <div
                  style={{
                    maxWidth: '82%',
                    background: isUser
                      ? 'linear-gradient(135deg, #FBF6EA 0%, #F5ECDA 100%)'
                      : 'rgba(24, 15, 7, 0.95)',
                    border: `1.5px solid ${isUser ? '#D6BC97' : 'rgba(212, 168, 55, 0.45)'}`,
                    borderRadius: '14px',
                    padding: '16px 20px',
                    boxShadow: isUser
                      ? '0 4px 14px rgba(0,0,0,0.25)'
                      : '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,220,140,0.15)',
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
                      color: isUser ? '#2A1A0B' : 'var(--text-primary)',
                      fontWeight: isUser ? 500 : 400,
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
          })}

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

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '9px 18px', fontSize: '13.5px' }}
              disabled={!input.trim() || loading}
            >
              <span>Send</span>
              <Send size={15} />
            </button>
          </form>
        </IndianFrame>
      </div>
    </div>
  );
};

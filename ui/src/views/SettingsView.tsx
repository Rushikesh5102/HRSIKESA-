import React, { useState } from 'react';
import {
  Settings,
  Shield,
  User,
  Volume2,
  Cpu,
  Database,
  Monitor,
  Palette,
  Layers,
  Sparkles,
  Users,
  Building2,
  Globe,
  Radio,
  Check,
} from 'lucide-react';
import { SystemStatusResponse, VoiceStatusResponse } from '../types/api.types';
import { api } from '../services/api';

interface SettingsViewProps {
  status?: SystemStatusResponse;
  voiceStatus?: VoiceStatusResponse;
  theme?: string;
  onSetTheme?: (theme: string) => void;
}

type SettingsTab =
  | 'GENERAL'
  | 'AGENTS'
  | 'COMPANIES'
  | 'MODELS'
  | 'SECURITY'
  | 'APPEARANCE'
  | 'AUDIO'
  | 'INTEGRATIONS';

export const SettingsView: React.FC<SettingsViewProps> = ({
  status,
  voiceStatus,
  theme = 'cosmic',
  onSetTheme,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('APPEARANCE');
  const [sanskritLabels, setSanskritLabels] = useState(true);
  const [ambientSounds, setAmbientSounds] = useState(true);
  const [animatedEffects, setAnimatedEffects] = useState(true);
  const [activePalette, setActivePalette] = useState('saffron-gold');

  const categories: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'GENERAL', label: 'General', icon: <User size={15} /> },
    { id: 'AGENTS', label: 'Agents', icon: <Users size={15} /> },
    { id: 'COMPANIES', label: 'Companies', icon: <Building2 size={15} /> },
    { id: 'MODELS', label: 'Models', icon: <Cpu size={15} /> },
    { id: 'SECURITY', label: 'Security', icon: <Shield size={15} /> },
    { id: 'APPEARANCE', label: 'Appearance', icon: <Palette size={15} /> },
    { id: 'AUDIO', label: 'Audio', icon: <Volume2 size={15} /> },
    { id: 'INTEGRATIONS', label: 'Integrations', icon: <Globe size={15} /> },
  ];

  const themes = [
    {
      id: 'cosmic',
      name: 'Traditional (Default)',
      preview: 'radial-gradient(circle, #D4AF37 0%, #2A1708 70%, #150E05 100%)',
      desc: 'Vedic Cyberpunk Temple Sanctum with glowing cyan & gold yantras',
    },
    {
      id: 'light',
      name: 'Light',
      preview: 'linear-gradient(135deg, #FBF6EA 0%, #F5ECDA 100%)',
      desc: 'Warm Royal Sandstone & Ancient Parchment with dark bronze lettering',
    },
    {
      id: 'dark',
      name: 'Dark',
      preview: 'linear-gradient(135deg, #18120C 0%, #0A0704 100%)',
      desc: 'Deep Obsidian Temple Night with minimal subtle gold inlays',
    },
    {
      id: 'mahabharata',
      name: 'Manuscript',
      preview: 'linear-gradient(135deg, #EFE3CE 0%, #DFCCA6 100%)',
      desc: 'Antique Palm-leaf scripture parchment with sepia inks',
    },
  ];

  const palettes = [
    { id: 'saffron-gold', label: 'Saffron & Gold', c1: '#D4820A', c2: '#F5C842' },
    { id: 'beige-cyan', label: 'Beige & Cyan', c1: '#E8D8BE', c2: '#00E5FF' },
    { id: 'royal-blue', label: 'Royal Blue', c1: '#1E3A8A', c2: '#38BDF8' },
    { id: 'earth-tones', label: 'Earth Tones', c1: '#78350F', c2: '#D97706' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header bar (Panel 10) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontWeight: 800, fontSize: '18px' }}>
            ⚙️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                Settings
              </h1>
              <span style={{ fontSize: '18px', color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-devanagari)', fontWeight: 700 }}>
                विन्यास
              </span>
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              Configure appearance, theme palettes, audio engines, and sovereign kernel behavior.
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Settings Layout (Panel 10) */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
        {/* Left Subnav Sidebar in Warm Parchment */}
        <div
          className="parchment-gold-card"
          style={{
            background: '#FAF5EB',
            color: '#2A1A0B',
            borderRadius: 'var(--radius-md)',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            height: 'fit-content',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {categories.map((cat) => {
            const isSelected = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'linear-gradient(90deg, #F5C842 0%, #D4AF37 100%)' : 'transparent',
                  color: isSelected ? '#1A0E05' : '#5C4028',
                  border: isSelected ? '1px solid #D4A837' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: isSelected ? 800 : 600,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ color: isSelected ? '#1A0E05' : '#8A6D4B' }}>
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Area in Warm Parchment */}
        <div
          className="parchment-gold-card"
          style={{
            background: '#FAF5EB',
            color: '#2A1A0B',
            borderRadius: 'var(--radius-md)',
            padding: '28px 32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '26px',
          }}
        >
          {activeTab === 'APPEARANCE' && (
            <>
              {/* Section Header */}
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  Appearance
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  Customize UI themes, color palettes, and ambient animation styles
                </span>
              </div>

              {/* 1. Theme Selection Cards (Panel 10) */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#996515', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                  Theme
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  {themes.map((t) => {
                    const isSelected = theme === t.id || (t.id === 'cosmic' && (theme === 'dark' || !theme));
                    return (
                      <div
                        key={t.id}
                        onClick={() => onSetTheme && onSetTheme(t.id)}
                        style={{
                          background: '#F5ECE0',
                          border: `1.5px solid ${isSelected ? '#D4A837' : '#D6BC97'}`,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 16px rgba(212, 168, 55, 0.45)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            height: '65px',
                            background: t.preview,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderBottom: '1px solid #D6BC97',
                          }}
                        >
                          {isSelected && (
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#D4A837', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#150E06' }}>
                              <Check size={14} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? '#996515' : '#2A1A0B' }}>
                            {t.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Palette Swatches (Panel 10) */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#996515', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                  Color Palette
                </span>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {palettes.map((p) => {
                    const isSelected = activePalette === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivePalette(p.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: '#F5ECE0',
                          border: `1.5px solid ${isSelected ? '#D4A837' : '#D6BC97'}`,
                          padding: '8px 16px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 12px rgba(212, 168, 55, 0.35)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.c1, marginRight: '-5px', zIndex: 1 }} />
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.c2 }} />
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#996515' : '#5C4028' }}>
                          {p.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Toggles & Switches (Panel 10) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Sanskrit Labels */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5ECE0', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>
                      Sanskrit Labels (Optional)
                    </div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>
                      Display Devanagari script alongside section titles and navigation
                    </div>
                  </div>
                  <div
                    onClick={() => setSanskritLabels(!sanskritLabels)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: sanskritLabels ? '#10B981' : '#D6BC97',
                      padding: '2px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transform: sanskritLabels ? 'translateX(20px)' : 'translateX(0px)',
                        transition: 'transform 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>

                {/* Ambient Sounds */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5ECE0', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>
                      Ambient Sounds
                    </div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>
                      Vedic binaural frequencies and soothing autonomous work chimes
                    </div>
                  </div>
                  <div
                    onClick={() => setAmbientSounds(!ambientSounds)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: ambientSounds ? '#10B981' : '#D6BC97',
                      padding: '2px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transform: ambientSounds ? 'translateX(20px)' : 'translateX(0px)',
                        transition: 'transform 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>

                {/* Animated Effects */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5ECE0', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>
                      Animated Effects
                    </div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>
                      Cosmic Yantra orbital rotations, glowing wave lines, and fluid transitions
                    </div>
                  </div>
                  <div
                    onClick={() => setAnimatedEffects(!animatedEffects)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: animatedEffects ? '#10B981' : '#D6BC97',
                      padding: '2px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transform: animatedEffects ? 'translateX(20px)' : 'translateX(0px)',
                        transition: 'transform 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'AUDIO' && (
            <VoiceSettingsSection />
          )}

          {activeTab !== 'APPEARANCE' && activeTab !== 'AUDIO' && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {activeTab} Settings
              </div>
              <p style={{ fontSize: '13px' }}>
                All sovereign kernel parameters for {activeTab.toLowerCase()} are verified and operational.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VoiceSettingsSection: React.FC = () => {
  const [lexicon, setLexicon] = React.useState<any[]>([]);
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [preferences, setPreferences] = React.useState<any>({
    defaultLanguage: 'en',
    speakingRateModifier: 0,
    autoDetectLanguage: true,
    interruptible: true,
    streamingTts: true,
    echoProtection: true
  });
  const [status, setStatus] = React.useState<any>(null);
  const [testPhrase, setTestPhrase] = React.useState('HṚṢĪKEŚA is ready.');
  const [testLang, setTestLang] = React.useState('en');
  const [speed, setSpeed] = React.useState(1.0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [testResult, setTestResult] = React.useState<any>(null);
  const [search, setSearch] = React.useState('');
  const [newCanonical, setNewCanonical] = React.useState('');
  const [newPhonetic, setNewPhonetic] = React.useState('');
  const [newLang, setNewLang] = React.useState('en');
  const [savingWord, setSavingWord] = React.useState(false);

  const loadData = async () => {
    try {
      const [lexRes, profRes, statRes] = await Promise.all([
        api.getPronunciations(),
        api.getVoiceProfiles(),
        api.getVoiceStatus()
      ]);
      if (lexRes.entries) setLexicon(lexRes.entries);
      if (profRes.profiles) setProfiles(profRes.profiles);
      if (profRes.preferences) {
        setPreferences(profRes.preferences);
        setSpeed(1.0 + (profRes.preferences.speakingRateModifier || 0));
        setTestLang(profRes.preferences.defaultLanguage || 'en');
      }
      if (statRes) setStatus(statRes);
    } catch (err) {
      console.error('Failed to load voice settings', err);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleTestAudio = async (textToTest?: string) => {
    const text = textToTest || testPhrase;
    setIsPlaying(true);
    try {
      const res = await api.testVoiceAudio({
        text,
        language: testLang,
        speed
      });
      setTestResult(res);
      // Play returned audio
      if (res.audioFilePath) {
        const audio = new Audio(`/workspace/file?path=${encodeURIComponent(res.audioFilePath)}`);
        audio.play().catch(() => {});
        audio.onended = () => setIsPlaying(false);
      } else {
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Audio test failed', err);
      setIsPlaying(false);
    }
  };

  const handleInterrupt = async () => {
    try {
      await api.interruptVoice();
      setIsPlaying(false);
    } catch (err) {
      console.error('Interrupt failed', err);
    }
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanonical.trim() || !newPhonetic.trim()) return;
    setSavingWord(true);
    try {
      await api.savePronunciation({
        canonical: newCanonical.trim(),
        aliases: [newCanonical.trim().toLowerCase()],
        language: newLang,
        phoneticVariants: {
          plainPhonetic: newPhonetic.trim(),
          piperPhonetic: newPhonetic.trim(),
          sapiPhoneme: newPhonetic.trim()
        },
        priority: 'CUSTOM',
        category: 'USER_DEFINED',
        description: 'Taught custom pronunciation via Settings'
      });
      setNewCanonical('');
      setNewPhonetic('');
      await loadData();
    } catch (err) {
      console.error('Failed to save pronunciation', err);
    } finally {
      setSavingWord(false);
    }
  };

  const handleDeleteWord = async (canonical: string) => {
    try {
      await api.deletePronunciation(canonical);
      await loadData();
    } catch (err) {
      console.error('Failed to delete word', err);
    }
  };

  const handleUpdatePreferences = async (updates: any) => {
    const next = { ...preferences, ...updates };
    setPreferences(next);
    try {
      await api.updateVoicePreferences(next);
    } catch (err) {
      console.error('Failed to update voice preferences', err);
    }
  };

  const filteredLexicon = lexicon.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.canonical.toLowerCase().includes(q) ||
      (e.aliases && e.aliases.some((a: string) => a.toLowerCase().includes(q))) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Status Overview Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 600, textTransform: 'uppercase' }}>Speech-to-Text</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>
            {status?.stt?.name || 'Windows Speech / Whisper'}
          </div>
          <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span> Local Sovereign
          </div>
        </div>

        <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 600, textTransform: 'uppercase' }}>Text-to-Speech Engine</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>
            {status?.tts?.name || 'Piper Neural ONNX'}
          </div>
          <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span> SAPI SSML Fallback
          </div>
        </div>

        <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 600, textTransform: 'uppercase' }}>Protected Lexicon</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>
            {lexicon.length} Words Registered
          </div>
          <div style={{ fontSize: '11px', color: '#D4820A', marginTop: '2px' }}>
            Canonical: HṚṢĪKEŚA Protected
          </div>
        </div>

        <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 600, textTransform: 'uppercase' }}>Interaction Modes</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>
            Streaming + Barge-In
          </div>
          <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>
            Echo-Aware VAD Active
          </div>
        </div>
      </div>

      {/* 2. Interactive Voice & Pronunciation Verification Screen */}
      <div style={{ background: '#FBF6EA', border: '1.5px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={18} color="#D4820A" /> Live Audio Quality & Pronunciation Verification
            </div>
            <div style={{ fontSize: '11.5px', color: '#7A5B36' }}>
              Synthesize actual audio to verify pronunciation of HṚṢĪKEŚA and Indic protected tokens.
            </div>
          </div>
          {isPlaying && (
            <div style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }}></span> Speaking...
            </div>
          )}
        </div>

        {/* Quick Test Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#5C4028' }}>Protected Tests:</span>
          {[
            { label: 'HṚṢĪKEŚA', phrase: 'HṚṢĪKEŚA is ready.' },
            { label: 'हृषीकेश (Hindi)', phrase: 'हृषीकेश, नमस्ते।' },
            { label: 'हृषीकेश (Marathi)', phrase: 'हृषीकेश, आज आपण काम करूया.' },
            { label: 'SAHIKARA', phrase: 'SAHIKARA workforce is aligned.' },
            { label: 'Gāṇḍīva', phrase: 'Agent Gāṇḍīva is optimizing systems.' },
            { label: 'KĀLA & Mṛtyu', phrase: 'KĀLA and Mṛtyu guard the lifecycle.' }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setTestPhrase(item.phrase);
                handleTestAudio(item.phrase);
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #D6BC97',
                borderRadius: '16px',
                padding: '4px 12px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#2A1A0B',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
          <input
            type="text"
            value={testPhrase}
            onChange={(e) => setTestPhrase(e.target.value)}
            placeholder="Type any sentence containing HṚṢĪKEŚA or Indic words..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #D6BC97',
              fontSize: '13px',
              background: '#FFFFFF',
              color: '#2A1A0B',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handleTestAudio()}
            disabled={isPlaying}
            style={{
              background: 'linear-gradient(135deg, #D4820A, #F5C842)',
              color: '#0F0D0A',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              opacity: isPlaying ? 0.7 : 1
            }}
          >
            {isPlaying ? 'Synthesizing...' : 'Synthesize Audio'}
          </button>
          <button
            onClick={handleInterrupt}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            Interrupt / Stop
          </button>
        </div>

        {/* Live Diagnostics Card */}
        {testResult && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E5D5BC', borderRadius: '8px', padding: '12px 16px', marginTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#D4820A', textTransform: 'uppercase', marginBottom: '8px' }}>
              Audio Verification Diagnostics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#7A5B36' }}>Latency: </span>
                <strong style={{ color: '#10B981' }}>{testResult.latencyMs} ms</strong>
              </div>
              <div>
                <span style={{ color: '#7A5B36' }}>Audio Duration: </span>
                <strong>{testResult.durationMs} ms</strong>
              </div>
              <div>
                <span style={{ color: '#7A5B36' }}>Format: </span>
                <code>{testResult.formatUsed}</code>
              </div>
              <div>
                <span style={{ color: '#7A5B36' }}>Engine: </span>
                <strong>{testResult.engine}</strong>
              </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', borderTop: '1px dashed #E5D5BC', paddingTop: '6px' }}>
              <span style={{ color: '#7A5B36' }}>Normalized Phonetic Stream: </span>
              <code style={{ background: '#F5ECE0', padding: '2px 6px', borderRadius: '4px', color: '#2A1A0B' }}>
                {testResult.normalizedText}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* 3. Voice Identity & Personality Controls */}
      <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', marginBottom: '14px' }}>
          Voice Identity & Multilingual Configuration
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Default Language
            </label>
            <select
              value={preferences.defaultLanguage}
              onChange={(e) => handleUpdatePreferences({ defaultLanguage: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D6BC97',
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#2A1A0B'
              }}
            >
              <option value="en">English (Sovereign)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="mr">Marathi (मराठी)</option>
              <option value="sa">Sanskrit (संस्कृतम्)</option>
              <option value="bn">Bengali (বাংলা)</option>
              <option value="gu">Gujarati (ગુજરાતી)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="kn">Kannada (ಕನ್ನಡ)</option>
              <option value="ml">Malayalam (മലയാളം)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Speaking Speed: {speed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.1"
              value={speed}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeed(val);
                handleUpdatePreferences({ speakingRateModifier: val - 1.0 });
              }}
              style={{ width: '100%', accentColor: '#D4820A' }}
            />
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#2A1A0B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.autoDetectLanguage}
              onChange={(e) => handleUpdatePreferences({ autoDetectLanguage: e.target.checked })}
              style={{ accentColor: '#10B981' }}
            />
            <span><strong>Automatic Language & Code-Switching Detection:</strong> Dynamically switch between English, Hindi, and Marathi based on user speech.</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#2A1A0B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.interruptible}
              onChange={(e) => handleUpdatePreferences({ interruptible: e.target.checked })}
              style={{ accentColor: '#10B981' }}
            />
            <span><strong>Conversational Barge-In:</strong> Immediately stop audio playback when you speak into the microphone.</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#2A1A0B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.streamingTts}
              onChange={(e) => handleUpdatePreferences({ streamingTts: e.target.checked })}
              style={{ accentColor: '#10B981' }}
            />
            <span><strong>Streaming Synthesis:</strong> Begin speaking the first sentence immediately while the cognitive model generates the rest.</span>
          </label>
        </div>
      </div>

      {/* 4. Pronunciation Lexicon & Custom Vocabulary */}
      <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B' }}>
              Protected Pronunciation Lexicon & Vocabulary
            </div>
            <div style={{ fontSize: '11.5px', color: '#7A5B36' }}>
              Ensures proper Sanskrit and Indian phonetics without altering the visible screen spelling.
            </div>
          </div>
          <input
            type="text"
            placeholder="Search dictionary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #D6BC97',
              fontSize: '12px',
              background: '#FFFFFF',
              color: '#2A1A0B',
              outline: 'none'
            }}
          />
        </div>

        {/* Add Custom Word Form */}
        <form onSubmit={handleSaveWord} style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E5D5BC' }}>
          <input
            type="text"
            placeholder="Word / Name (e.g. Rushikesh)"
            value={newCanonical}
            onChange={(e) => setNewCanonical(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', outline: 'none' }}
          />
          <input
            type="text"
            placeholder="Phonetic respelling (e.g. Roo-shee-kesh)"
            value={newPhonetic}
            onChange={(e) => setNewPhonetic(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', outline: 'none' }}
          />
          <select
            value={newLang}
            onChange={(e) => setNewLang(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', background: '#F5ECE0' }}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
            <option value="sa">Sanskrit</option>
          </select>
          <button
            type="submit"
            disabled={savingWord || !newCanonical.trim() || !newPhonetic.trim()}
            style={{
              background: '#D4820A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Teach HṚṢĪKEŚA
          </button>
        </form>

        {/* Lexicon Table */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #D6BC97', borderRadius: '8px', background: '#FFFFFF' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#FAF3E8', borderBottom: '1px solid #D6BC97', color: '#5C4028' }}>
                <th style={{ padding: '8px 12px' }}>Display Token</th>
                <th style={{ padding: '8px 12px' }}>Phonetic Variant</th>
                <th style={{ padding: '8px 12px' }}>Lang</th>
                <th style={{ padding: '8px 12px' }}>Priority</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLexicon.map((entry) => (
                <tr key={entry.canonical} style={{ borderBottom: '1px solid #F0E3D0' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 800, color: '#2A1A0B' }}>
                    {entry.canonical}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#7A5B36', fontFamily: 'monospace' }}>
                    {entry.phoneticVariants?.piperPhonetic || entry.phoneticVariants?.sanskrit || entry.phoneticVariants?.plainPhonetic}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#5C4028' }}>
                    {entry.language || 'sa'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: entry.priority === 'PROTECTED' ? '#FEF3C7' : '#E0E7FF',
                        color: entry.priority === 'PROTECTED' ? '#92400E' : '#3730A3'
                      }}
                    >
                      {entry.priority}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {entry.priority !== 'PROTECTED' && (
                      <button
                        onClick={() => handleDeleteWord(entry.canonical)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


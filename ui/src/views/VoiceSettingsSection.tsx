import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

export const VoiceSettingsSection: React.FC = () => {
  const [lexicon, setLexicon] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any>({
    defaultLanguage: 'en',
    speakingRateModifier: 0,
    autoDetectLanguage: true,
    interruptible: true,
    streamingTts: true,
    echoProtection: true,
    outputLanguagePolicy: 'FOLLOW_USER',
    interactionMode: 'CONVERSATIONAL',
    emotionBias: 'warm',
    speakerMap: {
      en: 'hrisekesa-natural',
      hi: 'hrisekesa-indic-hi',
      mr: 'hrisekesa-indic-mr',
      sa: 'hrisekesa-indic-sa',
    },
    pitch: 'normal',
    expressiveness: 'normal',
    reverberation: 'dry',
  });
  const [status, setStatus] = useState<any>(null);
  const [testPhrase, setTestPhrase] = useState('HṚṢĪKEŚA is ready to assist you.');
  const [testLang, setTestLang] = useState('en');
  const [testSpeaker, setTestSpeaker] = useState('hrisekesa-natural');
  const [testEmotion, setTestEmotion] = useState('warm');
  const [testPitch, setTestPitch] = useState('normal');
  const [testReverb, setTestReverb] = useState('dry');
  const [speed, setSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [newCanonical, setNewCanonical] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newLang, setNewLang] = useState('en');
  const [savingWord, setSavingWord] = useState(false);
  const [workerActionLoading, setWorkerActionLoading] = useState(false);
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [lexRes, profRes, statRes] = await Promise.all([
        api.getPronunciations(),
        api.getVoiceProfiles(),
        api.getVoiceStatus(),
      ]);
      if (lexRes?.entries) setLexicon(lexRes.entries);
      if (profRes?.profiles) setProfiles(profRes.profiles);
      if (profRes?.preferences) {
        setPreferences((prev: any) => ({ ...prev, ...profRes.preferences }));
        setSpeed(1.0 + (profRes.preferences.speakingRateModifier || 0));
        setTestLang(profRes.preferences.defaultLanguage || 'en');
        if (profRes.preferences.speakerMap?.en) {
          setTestSpeaker(profRes.preferences.speakerMap.en);
        }
      }
      if (statRes) setStatus(statRes);
    } catch (err) {
      console.error('Failed to load voice settings', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdatePreferences = async (updates: any) => {
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    try {
      await api.updateVoicePreferences(updated);
    } catch (err) {
      console.error('Failed to save preferences', err);
    }
  };

  const handleUnloadWorker = async () => {
    setWorkerActionLoading(true);
    setWorkerMessage(null);
    try {
      const res = await api.unloadVoiceWorker();
      setWorkerMessage(res.message || 'Worker unloaded from RAM');
      await loadData();
    } catch (err: any) {
      setWorkerMessage(`Failed to unload: ${err.message}`);
    } finally {
      setWorkerActionLoading(false);
    }
  };

  const handlePreloadWorker = async () => {
    setWorkerActionLoading(true);
    setWorkerMessage(null);
    try {
      const res = await api.preloadVoiceWorker();
      setWorkerMessage(res.message || 'Worker preloading initiated');
      await loadData();
    } catch (err: any) {
      setWorkerMessage(`Failed to preload: ${err.message}`);
    } finally {
      setWorkerActionLoading(false);
    }
  };

  const handlePlayPreview = async () => {
    setIsPlaying(true);
    setTestResult(null);
    try {
      const res = await api.previewVoiceAudio({
        text: testPhrase,
        language: testLang,
        speaker: testSpeaker,
        emotion: testEmotion,
        rate: speed,
        pitch: testPitch,
        reverberation: testReverb,
        play: true,
      });
      setTestResult(res);
      await loadData();
    } catch (err: any) {
      console.error('Preview error', err);
      setTestResult({
        success: false,
        error: err.message || 'Failed to synthesize speech',
        providerUsed: 'ERROR',
        fallbackUsed: false,
        durationMs: 0,
        latencyMs: 0,
      });
    } finally {
      setIsPlaying(false);
    }
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanonical.trim() || !newPhonetic.trim()) return;
    setSavingWord(true);
    try {
      await api.savePronunciation({
        canonical: newCanonical.trim(),
        phoneticVariants: {
          piperPhonetic: newPhonetic.trim(),
          plainPhonetic: newPhonetic.trim(),
        },
        language: newLang,
        priority: 'CUSTOM',
      });
      setNewCanonical('');
      setNewPhonetic('');
      await loadData();
    } catch (err) {
      console.error('Failed to save word', err);
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

  const filteredLexicon = lexicon.filter(
    (e) =>
      e.canonical?.toLowerCase().includes(search.toLowerCase()) ||
      e.language?.toLowerCase().includes(search.toLowerCase())
  );

  // Compute dynamic acoustic caption preview
  const previewCaption = useMemo(() => {
    const speaker = testSpeaker || 'Jon';
    const emotionDesc =
      testEmotion === 'warm'
        ? 'warm, friendly, and compassionate'
        : testEmotion === 'authoritative'
        ? 'authoritative, clear, and commanding'
        : testEmotion === 'calm'
        ? 'calm, steady, and peaceful'
        : testEmotion === 'empathetic'
        ? 'gentle, empathetic, and attentive'
        : testEmotion === 'excited'
        ? 'energetic, lively, and enthusiastic'
        : 'clear, neutral, and balanced';
    const pitchDesc =
      testPitch === 'low' || testPitch === 'very-low'
        ? 'slightly low pitch'
        : testPitch === 'high'
        ? 'slightly high pitch'
        : 'normal pitch';
    const speedDesc =
      speed > 1.15
        ? 'fast pacing'
        : speed < 0.9
        ? 'measured, slow pacing'
        : 'natural pacing';
    const reverbDesc =
      testReverb === 'reverberant'
        ? 'echoic room acoustic'
        : testReverb === 'very-dry'
        ? 'clean dry studio'
        : 'dry acoustic';
    return `${speaker} speaks in a ${emotionDesc} tone with ${pitchDesc} and ${speedDesc} in a ${reverbDesc}.`;
  }, [testSpeaker, testEmotion, testPitch, speed, testReverb]);

  const indicParler = status?.indicParler || {};
  const isGated = indicParler.gatedRepo;
  const workerStatus = indicParler.workerStatus || 'NOT_RUNNING';
  const activeModel = indicParler.activeModel || 'ai4bharat/indic-parler-tts';
  const ramUsageMb = indicParler.ramUsageMb || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header */}
      <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
          Multilingual Voice & Audio Intelligence
        </h2>
        <span style={{ fontSize: '12px', color: '#7A5B36' }}>
          AI4Bharat Indic Parler-TTS Engine, bounded affect inference, code-switching policy & acoustic prosody
        </span>
      </div>

      {/* 2. Primary Engine Status & Memory Governance Banner */}
      <div
        style={{
          background: '#FAF3E8',
          border: '1.5px solid #D4820A',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 4px 12px rgba(212,130,10,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎙️</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#2A1A0B' }}>
                Primary TTS Engine: AI4Bharat Indic Parler-TTS
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: indicParler.available ? '#D1FAE5' : '#FEF3C7',
                  color: indicParler.available ? '#065F46' : '#92400E',
                }}
              >
                {indicParler.available ? 'CONFIGURED' : 'IMPLEMENTED (FALLBACK ACTIVE)'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#5C4028', marginTop: '6px', lineHeight: 1.5 }}>
              Active Model: <code style={{ background: '#F0E3D0', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>{activeModel}</code>
              {' • '}
              Worker Status: <strong style={{ color: workerStatus === 'RUNNING' ? '#10B981' : '#7A5B36' }}>{workerStatus}</strong>
              {ramUsageMb > 0 && ` • Worker RAM: ${ramUsageMb} MB`}
            </div>
            <div style={{ fontSize: '11.5px', color: '#7A5B36', marginTop: '4px' }}>
              Fallback Policy Chain: <span style={{ fontWeight: 600 }}>ai4bharat/indic-parler-tts</span> → <span style={{ fontWeight: 600 }}>Piper Neural ONNX</span> → <span style={{ fontWeight: 600 }}>Windows SAPI</span>
            </div>
          </div>

          {/* Memory Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handlePreloadWorker}
              disabled={workerActionLoading}
              style={{
                background: '#FFFFFF',
                border: '1px solid #D6BC97',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#2A1A0B',
                cursor: 'pointer',
              }}
            >
              Preload Model
            </button>
            <button
              onClick={handleUnloadWorker}
              disabled={workerActionLoading}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5D5BC',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#B91C1C',
                cursor: 'pointer',
              }}
            >
              Unload RAM
            </button>
          </div>
        </div>

        {workerMessage && (
          <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#D4820A', background: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E5D5BC' }}>
            {workerMessage}
          </div>
        )}

        {isGated && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '11.5px', color: '#92400E' }}>
            <strong>Notice on Hugging Face Access:</strong> <code>ai4bharat/indic-parler-tts</code> is a gated research model on Hugging Face. When gated access or <code>HF_TOKEN</code> is not present, HṚṢĪKEŚA automatically uses its local Piper Neural and Windows SAPI fallback engines without interruption.
          </div>
        )}
      </div>

      {/* 3. Multilingual & Code-Switching Configuration */}
      <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', marginBottom: '14px' }}>
          Multilingual & Language Policy
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Primary Language
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
                color: '#2A1A0B',
              }}
            >
              <option value="en">English (Default)</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
              <option value="sa">Sanskrit</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Output Language Policy
            </label>
            <select
              value={preferences.outputLanguagePolicy || 'FOLLOW_USER'}
              onChange={(e) => handleUpdatePreferences({ outputLanguagePolicy: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D6BC97',
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#2A1A0B',
              }}
            >
              <option value="FOLLOW_USER">FOLLOW_USER (Match user query language)</option>
              <option value="PRESERVE_SCRIPT">PRESERVE_SCRIPT (Respond in source script)</option>
              <option value="STICKY_CONVERSATION">STICKY_CONVERSATION (Lock to session tongue)</option>
              <option value="ALWAYS_DEFAULT">ALWAYS_DEFAULT (Force primary language)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Interaction Mode
            </label>
            <select
              value={preferences.interactionMode || 'CONVERSATIONAL'}
              onChange={(e) => handleUpdatePreferences({ interactionMode: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D6BC97',
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#2A1A0B',
              }}
            >
              <option value="CONVERSATIONAL">Conversational (Warm & Natural)</option>
              <option value="FAST_ASSISTANT">Fast Assistant (Crisp & Rapid)</option>
              <option value="PEDAGOGICAL">Pedagogical (Clear, Deliberate & Measured)</option>
              <option value="STORYTELLER">Storyteller (Expressive & Dynamic)</option>
              <option value="WHISPER_NIGHT">Night Mode (Quiet & Calming)</option>
              <option value="COMMAND_BRIEF">Command Mode (Minimal & Precise)</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#2A1A0B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.autoDetectLanguage !== false}
              onChange={(e) => handleUpdatePreferences({ autoDetectLanguage: e.target.checked })}
              style={{ accentColor: '#10B981' }}
            />
            <span><strong>Multi-signal Language & Dialect Detection:</strong> Distinguishes Devanagari Hindi, Marathi, and Sanskrit, and preserves Romanized Hinglish.</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#2A1A0B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.interruptible !== false}
              onChange={(e) => handleUpdatePreferences({ interruptible: e.target.checked })}
              style={{ accentColor: '#10B981' }}
            />
            <span><strong>Conversational Barge-In:</strong> Stops TTS playback instantly when user starts speaking.</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#2A1A0B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.streamingTts !== false}
              onChange={(e) => handleUpdatePreferences({ streamingTts: e.target.checked })}
              style={{ accentColor: '#10B981' }}
            />
            <span><strong>Streaming Chunk Synthesis:</strong> Begins speaking initial sentences before full response completes.</span>
          </label>
        </div>
      </div>

      {/* 4. Speaker Identity & Language Voice Mapping */}
      <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', marginBottom: '14px' }}>
          Speaker Personas & Language-Specific Mapping
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#5C4028', marginBottom: '4px' }}>
              English Speaker
            </label>
            <input
              type="text"
              value={preferences.speakerMap?.en || 'hrisekesa-natural'}
              onChange={(e) =>
                handleUpdatePreferences({
                  speakerMap: { ...preferences.speakerMap, en: e.target.value },
                })
              }
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', background: '#FFFFFF' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#5C4028', marginBottom: '4px' }}>
              Hindi Speaker
            </label>
            <input
              type="text"
              value={preferences.speakerMap?.hi || 'hrisekesa-indic-hi'}
              onChange={(e) =>
                handleUpdatePreferences({
                  speakerMap: { ...preferences.speakerMap, hi: e.target.value },
                })
              }
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', background: '#FFFFFF' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#5C4028', marginBottom: '4px' }}>
              Marathi Speaker
            </label>
            <input
              type="text"
              value={preferences.speakerMap?.mr || 'hrisekesa-indic-mr'}
              onChange={(e) =>
                handleUpdatePreferences({
                  speakerMap: { ...preferences.speakerMap, mr: e.target.value },
                })
              }
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', background: '#FFFFFF' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#5C4028', marginBottom: '4px' }}>
              Sanskrit Speaker
            </label>
            <input
              type="text"
              value={preferences.speakerMap?.sa || 'hrisekesa-indic-sa'}
              onChange={(e) =>
                handleUpdatePreferences({
                  speakerMap: { ...preferences.speakerMap, sa: e.target.value },
                })
              }
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', background: '#FFFFFF' }}
            />
          </div>
        </div>
      </div>

      {/* 5. Affect, Emotion & Prosodic Controls */}
      <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', marginBottom: '14px' }}>
          Affect, Emotion & Acoustic Parameters
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Emotion Bias
            </label>
            <select
              value={testEmotion}
              onChange={(e) => {
                setTestEmotion(e.target.value);
                handleUpdatePreferences({ emotionBias: e.target.value });
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D6BC97', background: '#FFFFFF', fontSize: '12.5px', color: '#2A1A0B' }}
            >
              <option value="warm">Warm & Compassionate</option>
              <option value="calm">Calm & Serene</option>
              <option value="authoritative">Authoritative & Confident</option>
              <option value="empathetic">Empathetic & Attentive</option>
              <option value="excited">Enthusiastic & Excited</option>
              <option value="neutral">Neutral & Balanced</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Pitch Contour
            </label>
            <select
              value={testPitch}
              onChange={(e) => {
                setTestPitch(e.target.value);
                handleUpdatePreferences({ pitch: e.target.value });
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D6BC97', background: '#FFFFFF', fontSize: '12.5px', color: '#2A1A0B' }}
            >
              <option value="normal">Normal</option>
              <option value="low">Slightly Low (Resonant)</option>
              <option value="very-low">Deep / Low</option>
              <option value="high">Slightly High</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5C4028', marginBottom: '6px' }}>
              Room Acoustics / Reverb
            </label>
            <select
              value={testReverb}
              onChange={(e) => {
                setTestReverb(e.target.value);
                handleUpdatePreferences({ reverberation: e.target.value });
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D6BC97', background: '#FFFFFF', fontSize: '12.5px', color: '#2A1A0B' }}
            >
              <option value="dry">Dry Acoustic</option>
              <option value="very-dry">Very Dry (Clean Studio)</option>
              <option value="slightly-reverberant">Slight Reverberation</option>
              <option value="reverberant">Reverberant Hall</option>
            </select>
          </div>
        </div>

        {/* Dynamic Acoustic Prompt Preview */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5D5BC', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#D4820A', textTransform: 'uppercase', marginBottom: '4px' }}>
            Dynamic Acoustic Prompt Generated for Indic Parler-TTS
          </div>
          <div style={{ fontSize: '12.5px', color: '#2A1A0B', fontStyle: 'italic', fontFamily: 'monospace' }}>
            "{previewCaption}"
          </div>
        </div>
      </div>

      {/* 6. Live Synthesis & Diagnostics Preview */}
      <div style={{ background: '#FAF3E8', border: '1px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', marginBottom: '12px' }}>
          Interactive Voice Synthesis & Verification
        </div>

        {/* Quick Language Fill Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setTestLang('en');
              setTestPhrase('HṚṢĪKEŚA is ready to assist you.');
              setTestSpeaker(preferences.speakerMap?.en || 'hrisekesa-natural');
            }}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #D6BC97', background: testLang === 'en' ? '#D4820A' : '#FFFFFF', color: testLang === 'en' ? '#FFFFFF' : '#2A1A0B', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
          >
            English Sample
          </button>
          <button
            type="button"
            onClick={() => {
              setTestLang('hi');
              setTestPhrase('नमस्ते ऋषिकेश। आज आप क्या कार्य संपन्न करना चाहते हैं?');
              setTestSpeaker(preferences.speakerMap?.hi || 'hrisekesa-indic-hi');
            }}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #D6BC97', background: testLang === 'hi' ? '#D4820A' : '#FFFFFF', color: testLang === 'hi' ? '#FFFFFF' : '#2A1A0B', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
          >
            Hindi Sample
          </button>
          <button
            type="button"
            onClick={() => {
              setTestLang('mr');
              setTestPhrase('नमस्कार ऋषिकेश, सर्व प्रणाली सुरळीतपणे कार्यरत आहेत.');
              setTestSpeaker(preferences.speakerMap?.mr || 'hrisekesa-indic-mr');
            }}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #D6BC97', background: testLang === 'mr' ? '#D4820A' : '#FFFFFF', color: testLang === 'mr' ? '#FFFFFF' : '#2A1A0B', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
          >
            Marathi Sample
          </button>
          <button
            type="button"
            onClick={() => {
              setTestLang('sa');
              setTestPhrase('ॐ नमो भगवते वासुदेवाय। सर्वे सन्तु निरामयाः।');
              setTestSpeaker(preferences.speakerMap?.sa || 'hrisekesa-indic-sa');
            }}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #D6BC97', background: testLang === 'sa' ? '#D4820A' : '#FFFFFF', color: testLang === 'sa' ? '#FFFFFF' : '#2A1A0B', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
          >
            Sanskrit Sample
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <input
            type="text"
            value={testPhrase}
            onChange={(e) => setTestPhrase(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #D6BC97',
              fontSize: '13px',
              outline: 'none',
              background: '#FFFFFF',
              color: '#2A1A0B',
            }}
          />
          <button
            onClick={handlePlayPreview}
            disabled={isPlaying || !testPhrase.trim()}
            style={{
              background: isPlaying ? '#9CA3AF' : '#D4820A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isPlaying ? 'Synthesizing...' : '▶ Synthesize & Play'}
          </button>
        </div>

        {/* Diagnostics Card */}
        {testResult && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E5D5BC', borderRadius: '8px', padding: '14px 16px', marginTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#D4820A', textTransform: 'uppercase', marginBottom: '8px' }}>
              Real-time Synthesis Telemetry
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
                <span style={{ color: '#7A5B36' }}>Engine: </span>
                <strong>{testResult.providerUsed}</strong>
              </div>
              <div>
                <span style={{ color: '#7A5B36' }}>Speaker: </span>
                <strong>{testResult.speaker || 'Default'}</strong>
              </div>
              <div>
                <span style={{ color: '#7A5B36' }}>Fallback Used: </span>
                <strong style={{ color: testResult.fallbackUsed ? '#D97706' : '#10B981' }}>
                  {testResult.fallbackUsed ? `Yes (${testResult.fallbackReason || 'Default'})` : 'No (Direct)'}
                </strong>
              </div>
            </div>
            {testResult.caption && (
              <div style={{ marginTop: '8px', fontSize: '11.5px', borderTop: '1px dashed #E5D5BC', paddingTop: '6px' }}>
                <span style={{ color: '#7A5B36' }}>Acoustic Caption Used: </span>
                <code style={{ background: '#F5ECE0', padding: '2px 6px', borderRadius: '4px', color: '#2A1A0B' }}>
                  {testResult.caption}
                </code>
              </div>
            )}
            {testResult.error && (
              <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#B91C1C' }}>
                Error: {testResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Protected Pronunciation Lexicon */}
      <div style={{ background: '#F5ECE0', border: '1px solid #D6BC97', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B' }}>
              Protected Pronunciation Lexicon & Vocabulary
            </div>
            <div style={{ fontSize: '11.5px', color: '#7A5B36' }}>
              Ensures authentic Vedic and Indian phonetics without altering onscreen spelling.
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
              outline: 'none',
            }}
          />
        </div>

        {/* Add Custom Word Form */}
        <form onSubmit={handleSaveWord} style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E5D5BC', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Word / Name (e.g. Rushikesh)"
            value={newCanonical}
            onChange={(e) => setNewCanonical(e.target.value)}
            style={{ flex: 1, minWidth: '150px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', outline: 'none' }}
          />
          <input
            type="text"
            placeholder="Phonetic respelling (e.g. Roo-shee-kesh)"
            value={newPhonetic}
            onChange={(e) => setNewPhonetic(e.target.value)}
            style={{ flex: 1, minWidth: '150px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D6BC97', fontSize: '12px', outline: 'none' }}
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
              cursor: 'pointer',
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
                        color: entry.priority === 'PROTECTED' ? '#92400E' : '#3730A3',
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

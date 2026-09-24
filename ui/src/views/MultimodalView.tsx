import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Eye,
  Scan,
  ShieldCheck,
  ShieldAlert,
  Play,
  Square,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';

export const MultimodalView: React.FC = () => {
  const [status, setStatus] = useState<any>({
    microphoneState: 'IDLE',
    speakerState: 'IDLE',
    cameraState: 'OFF',
    activeModalities: ['TEXT', 'VISION', 'VOICE', 'UI', 'CAMERA'],
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [observation, setObservation] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [observing, setObserving] = useState(false);

  // Playground inputs
  const [speakText, setSpeakText] = useState('HṚṢĪKEŚA multimodal perception online. How may I assist you, Rushikesh?');
  const [speakLang, setSpeakLang] = useState('en');
  const [targetAppInput, setTargetAppInput] = useState('');
  const [expectedKwInput, setExpectedKwInput] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, sessionsRes] = await Promise.all([
        api.getMultimodalStatus().catch(() => null),
        api.getMultimodalSessions().catch(() => ({ sessions: [] })),
      ]);
      if (statusRes) {
        setStatus(statusRes);
        if (statusRes.latestObservation) {
          setObservation(statusRes.latestObservation);
        }
      }
      setSessions(sessionsRes.sessions || []);
    } catch (err) {
      console.error('Failed to load multimodal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMic = async () => {
    try {
      if (status.microphoneState === 'LISTENING') {
        const res = await api.stopVoiceListening();
        setStatus((prev: any) => ({ ...prev, microphoneState: res.microphoneState }));
        setPartialTranscript('');
      } else {
        const res = await api.startVoiceListening();
        setStatus((prev: any) => ({ ...prev, microphoneState: res.microphoneState }));
        setPartialTranscript('Listening for sovereign voice commands...');
      }
    } catch (err) {
      console.error('Mic toggle error', err);
    }
  };

  const handleToggleCamera = async () => {
    try {
      if (status.cameraState === 'ACTIVE') {
        const res = await api.stopCamera();
        setStatus((prev: any) => ({ ...prev, cameraState: res.cameraState }));
      } else {
        const res = await api.startCamera();
        setStatus((prev: any) => ({ ...prev, cameraState: res.cameraState }));
      }
    } catch (err) {
      console.error('Camera toggle error', err);
    }
  };

  const handleSpeak = async () => {
    if (!speakText.trim()) return;
    setSpeaking(true);
    try {
      await api.speakVoice(speakText, speakLang);
      setStatus((prev: any) => ({ ...prev, speakerState: 'PLAYING' }));
      setTimeout(() => {
        setStatus((prev: any) => ({ ...prev, speakerState: 'IDLE' }));
        setSpeaking(false);
      }, 1500);
    } catch (err) {
      console.error('Speak error', err);
      setSpeaking(false);
    }
  };

  const handleObserve = async () => {
    setObserving(true);
    try {
      const keywords = expectedKwInput ? expectedKwInput.split(',').map((k) => k.trim()) : undefined;
      const res = await api.observeMultimodal({
        targetApp: targetAppInput || undefined,
        expectedKeywords: keywords,
      });
      if (res.success && res.observation) {
        setObservation(res.observation);
      }
    } catch (err) {
      console.error('Observe error', err);
    } finally {
      setObserving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            Multimodal Perception & Voice Fabric
          </h2>
          <p className="text-sm text-slate-400">
            Unified human-interaction layer: Hear, Understand, See, Reason, Act, Observe, Speak, Verify, and Remember.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Perception
        </button>
      </div>

      {/* Top Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Microphone / STT State */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Voice Ingestion (STT)</p>
            <p className="text-lg font-bold text-white mt-1">{status.microphoneState || 'IDLE'}</p>
            <p className="text-xs text-slate-500 mt-1">VAD & Multilingual Listening</p>
          </div>
          <button
            onClick={handleToggleMic}
            className={`p-3 rounded-full ${
              status.microphoneState === 'LISTENING'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status.microphoneState === 'LISTENING' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Speaker / TTS State */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Voice Synthesis (TTS)</p>
            <p className="text-lg font-bold text-white mt-1">{status.speakerState || 'IDLE'}</p>
            <p className="text-xs text-slate-500 mt-1">Barge-in / Interruption Enabled</p>
          </div>
          <div
            className={`p-3 rounded-full ${
              status.speakerState === 'PLAYING'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {status.speakerState === 'PLAYING' ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </div>
        </div>

        {/* Camera State */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Camera Device</p>
            <p className="text-lg font-bold text-white mt-1">{status.cameraState || 'OFF'}</p>
            <p className="text-xs text-slate-500 mt-1">Explicit User Activation Only</p>
          </div>
          <button
            onClick={handleToggleCamera}
            className={`p-3 rounded-full ${
              status.cameraState === 'ACTIVE'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {status.cameraState === 'ACTIVE' ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Privacy & UIA Routing */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Perception Policy</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">UIA-First</p>
            <p className="text-xs text-slate-500 mt-1">Zero Credential Harvesting</p>
          </div>
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Vision Inspector & Voice Playgrounds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Vision & Screen Observation */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              Desktop & Application Vision Observation
            </h3>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Confidence: {observation ? (observation.confidence * 100).toFixed(0) : '100'}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Target Application</label>
              <input
                type="text"
                placeholder="e.g. Notepad, Chrome"
                value={targetAppInput}
                onChange={(e) => setTargetAppInput(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Expected Keywords</label>
              <input
                type="text"
                placeholder="e.g. File, Save, Dashboard"
                value={expectedKwInput}
                onChange={(e) => setExpectedKwInput(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <button
            onClick={handleObserve}
            disabled={observing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
          >
            <Scan className={`w-4 h-4 ${observing ? 'animate-spin' : ''}`} />
            {observing ? 'Inspecting Desktop Screen...' : 'Trigger Vision & OCR Observation'}
          </button>

          {/* Observation Details */}
          {observation && (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Source: <span className="text-white font-medium">{observation.sourceType}</span></span>
                <span className="text-slate-400">Verification: <span className="text-emerald-400 font-semibold">{observation.verificationStatus}</span></span>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Extracted OCR Summary:</p>
                <p className="mt-1 p-2 rounded bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed">
                  {observation.ocrTextSummary || 'No text detected.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-slate-400 pt-1">
                <span>Visual Elements: <span className="text-white">{observation.visualElementsCount}</span></span>
                <span>Challenges Detected: <span className="text-amber-400">{observation.detectedChallenges?.join(', ') || 'None'}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Voice & Speech Synthesis */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Voice Speech Synthesis & Interactive Turn-Taking
            </h3>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Streaming TTS
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400">Spoken Response Text</label>
            <textarea
              rows={3}
              value={speakText}
              onChange={(e) => setSpeakText(e.target.value)}
              className="w-full mt-1 p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Language Code</label>
              <select
                value={speakLang}
                onChange={(e) => setSpeakLang(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="en">English (en)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="mr">Marathi (mr)</option>
                <option value="sa">Sanskrit (sa)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSpeak}
                disabled={speaking}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {speaking ? 'Speaking...' : 'Synthesize & Speak'}
              </button>
            </div>
          </div>

          {/* Real-time Streaming Transcript box */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Live Microphone Transcript (VAD)</span>
              <span className="text-indigo-400 text-[11px]">{status.microphoneState}</span>
            </div>
            <p className="p-2 rounded bg-slate-900 text-slate-300 font-mono text-[11px]">
              {partialTranscript || 'Speak into microphone to observe streaming transcript...'}
            </p>
          </div>
        </div>
      </div>

      {/* Multimodal Sessions History */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          Active Multimodal Sessions
        </h3>

        {sessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No recent multimodal sessions recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Session ID</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Active Modalities</th>
                  <th className="p-2.5">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-2.5 font-mono text-indigo-400">{sess.id.substring(0, 12)}...</td>
                    <td className="p-2.5">{sess.sessionType}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {sess.status}
                      </span>
                    </td>
                    <td className="p-2.5">{sess.activeModalities?.join(', ') || 'ALL'}</td>
                    <td className="p-2.5 text-slate-400">{new Date(sess.startedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

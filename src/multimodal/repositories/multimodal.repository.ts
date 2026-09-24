/**
 * HṚṢĪKEŚA (हृषीकेश) — Multimodal Persistence Repository
 *
 * Phase 24: SQLite storage for multimodal sessions, interactions, vision observations,
 * bounded voice metrics, and multimodal preferences.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  MultimodalSessionRecord,
  MultimodalInteractionRecord,
  VisionObservation,
  VoiceInteraction,
  MultimodalPreferenceRecord,
  MultimodalSessionType,
  MultimodalSessionStatus,
  ModalityType,
  CameraState,
  MicrophoneState,
  SpeakerState,
  MultimodalInputType,
  PrivacyTier,
  ChallengeType,
  VisualComparisonState,
} from '../interfaces/multimodal.types.js';

export class MultimodalRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = db instanceof DatabaseManager || 'getRawDb' in db ? (db as any).getRawDb() : db;
  }

  // =========================================================================
  // Multimodal Sessions
  // =========================================================================

  public createSession(data: {
    id?: string;
    sessionType?: MultimodalSessionType;
    userId?: string;
    activeModalities?: ModalityType[];
    name?: string;
    currentApp?: string;
    currentWindow?: string;
    cameraState?: CameraState;
    microphoneState?: MicrophoneState;
    speakerState?: SpeakerState;
    metadata?: Record<string, any>;
  }): MultimodalSessionRecord {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const activeModalities = JSON.stringify(data.activeModalities || ['TEXT', 'VISION', 'VOICE']);
    const metadata = JSON.stringify({ ...data.metadata, name: data.name });

    const stmt = this.db.prepare(`
      INSERT INTO multimodal_sessions (
        id, session_type, status, user_id, active_modalities,
        current_app, current_window, camera_state, microphone_state, speaker_state,
        started_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.sessionType || 'INTERACTIVE',
      'ACTIVE',
      data.userId || 'Rushikesh Pattiwar',
      activeModalities,
      data.currentApp || null,
      data.currentWindow || null,
      data.cameraState || 'OFF',
      data.microphoneState || 'IDLE',
      data.speakerState || 'IDLE',
      now,
      metadata
    );

    const row = this.db.prepare(`SELECT * FROM multimodal_sessions WHERE id = ?`).get(id) as any;
    return this.mapSession(row);
  }

  public getSession(id: string): MultimodalSessionRecord | null {
    const row = this.db.prepare(`SELECT * FROM multimodal_sessions WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapSession(row);
  }

  public updateSession(id: string, updates: Partial<{
    status: MultimodalSessionStatus;
    currentApp: string;
    currentWindow: string;
    cameraState: CameraState;
    microphoneState: MicrophoneState;
    speakerState: SpeakerState;
    endedAt: string;
    metadata: Record<string, any>;
  }>): MultimodalSessionRecord | null {
    const session = this.getSession(id);
    if (!session) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.currentApp !== undefined) {
      fields.push('current_app = ?');
      values.push(updates.currentApp);
    }
    if (updates.currentWindow !== undefined) {
      fields.push('current_window = ?');
      values.push(updates.currentWindow);
    }
    if (updates.cameraState !== undefined) {
      fields.push('camera_state = ?');
      values.push(updates.cameraState);
    }
    if (updates.microphoneState !== undefined) {
      fields.push('microphone_state = ?');
      values.push(updates.microphoneState);
    }
    if (updates.speakerState !== undefined) {
      fields.push('speaker_state = ?');
      values.push(updates.speakerState);
    }
    if (updates.endedAt !== undefined) {
      fields.push('ended_at = ?');
      values.push(updates.endedAt);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE multimodal_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getSession(id);
  }

  public listSessions(limit = 20): MultimodalSessionRecord[] {
    const rows = this.db.prepare(`SELECT * FROM multimodal_sessions ORDER BY started_at DESC LIMIT ?`).all(limit) as any[];
    return rows.map((r) => this.mapSession(r));
  }

  public endSession(id: string): boolean {
    const now = new Date().toISOString();
    const info = this.db.prepare(`UPDATE multimodal_sessions SET status = 'ENDED', ended_at = ? WHERE id = ?`).run(now, id);
    return info.changes > 0;
  }

  // =========================================================================
  // Multimodal Interactions
  // =========================================================================

  public recordInteraction(data: {
    id?: string;
    sessionId: string;
    inputType: MultimodalInputType;
    rawText?: string;
    transcriptConfidence?: number;
    language?: string;
    audioDurationMs?: number;
    imageDimensions?: string;
    privacyTier?: PrivacyTier;
    responseText?: string;
    responseAudioDurationMs?: number;
    modelId?: string;
    latencyMs?: number;
  }): MultimodalInteractionRecord {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // Ensure session exists
    const sessionExists = this.db.prepare(`SELECT 1 FROM multimodal_sessions WHERE id = ?`).get(data.sessionId);
    if (!sessionExists) {
      this.createSession({ id: data.sessionId, name: `Auto-created session ${data.sessionId}` });
    }

    const stmt = this.db.prepare(`
      INSERT INTO multimodal_interactions (
        id, session_id, input_type, raw_text, transcript_confidence,
        language, audio_duration_ms, image_dimensions, privacy_tier,
        response_text, response_audio_duration_ms, model_id, latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.sessionId,
      data.inputType || (data as any).modality || 'TEXT',
      data.rawText || (data as any).content || null,
      data.transcriptConfidence !== undefined ? data.transcriptConfidence : (data as any).confidence || null,
      data.language || 'en',
      data.audioDurationMs || null,
      data.imageDimensions || null,
      data.privacyTier || 'PRIVATE',
      data.responseText || null,
      data.responseAudioDurationMs || null,
      data.modelId || null,
      data.latencyMs || null,
      now
    );

    const row = this.db.prepare(`SELECT * FROM multimodal_interactions WHERE id = ?`).get(id) as any;
    return this.mapInteraction(row);
  }

  public updateSessionStatus(sessionId: string, status: MultimodalSessionStatus): void {
    this.db.prepare(`UPDATE multimodal_sessions SET status = ? WHERE id = ?`).run(status, sessionId);
  }

  public listInteractions(sessionId?: string, limit = 50): MultimodalInteractionRecord[] {
    let sql = `SELECT * FROM multimodal_interactions`;
    const params: any[] = [];
    if (sessionId) {
      sql += ` WHERE session_id = ?`;
      params.push(sessionId);
    }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapInteraction(r));
  }

  public getInteractions(sessionId?: string, limit = 50): MultimodalInteractionRecord[] {
    return this.listInteractions(sessionId, limit);
  }

  // =========================================================================
  // Vision Observations
  // =========================================================================

  public recordVisionObservation(data: {
    id?: string;
    interactionId?: string;
    sessionId?: string;
    sourceType?: string;
    source?: string;
    targetApp?: string;
    targetWindow?: string;
    activeWindow?: string;
    ocrTextSummary?: string;
    ocrSummary?: string;
    ocrBoxes?: any[];
    uiaElementsCount?: number;
    visualElementsCount?: number;
    confidence?: number;
    detectedChallenges?: ChallengeType[];
    comparisonState?: VisualComparisonState;
    classifiedState?: string;
    verificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED' | 'SKIPPED';
    verificationEvidence?: string;
    privacyTier?: PrivacyTier;
  }): VisionObservation {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    let validInteractionId: string | null = null;
    if (data.interactionId) {
      const exists = this.db.prepare(`SELECT 1 FROM multimodal_interactions WHERE id = ?`).get(data.interactionId);
      if (exists) {
        validInteractionId = data.interactionId;
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO vision_observations (
        id, interaction_id, source_type, target_app, target_window,
        ocr_text_summary, uia_elements_count, visual_elements_count,
        confidence, detected_challenges, comparison_state, verification_status,
        verification_evidence, captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      validInteractionId,
      data.sourceType || data.source || 'SCREENSHOT',
      data.targetApp || null,
      data.targetWindow || data.activeWindow || null,
      data.ocrTextSummary || data.ocrSummary || null,
      data.uiaElementsCount || 0,
      data.visualElementsCount || 0,
      data.confidence !== undefined ? data.confidence : 1.0,
      JSON.stringify(data.detectedChallenges || ['NONE']),
      data.comparisonState || 'UNCHANGED',
      data.verificationStatus || 'PENDING',
      data.verificationEvidence || null,
      now
    );

    const row = this.db.prepare(`SELECT * FROM vision_observations WHERE id = ?`).get(id) as any;
    return this.mapObservation(row);
  }

  public getLatestObservation(): VisionObservation | null {
    const row = this.db.prepare(`SELECT * FROM vision_observations ORDER BY captured_at DESC LIMIT 1`).get() as any;
    if (!row) return null;
    return this.mapObservation(row);
  }

  public listObservations(limit = 20): VisionObservation[] {
    const rows = this.db.prepare(`SELECT * FROM vision_observations ORDER BY captured_at DESC LIMIT ?`).all(limit) as any[];
    return rows.map((r) => this.mapObservation(r));
  }

  public getVisionObservations(sessionId?: string, limit = 50): VisionObservation[] {
    let sql = `SELECT * FROM vision_observations`;
    const params: any[] = [];
    if (sessionId) {
      sql += ` WHERE interaction_id = ? OR id = ?`;
      params.push(sessionId, sessionId);
    }
    sql += ` ORDER BY captured_at DESC LIMIT ?`;
    params.push(limit);
    let rows = this.db.prepare(sql).all(...params) as any[];
    if (rows.length === 0 && sessionId) {
      rows = this.db.prepare(`SELECT * FROM vision_observations ORDER BY captured_at DESC LIMIT ?`).all(limit) as any[];
    }
    return rows.map((r) => this.mapObservation(r));
  }

  // =========================================================================
  // Voice Interactions
  // =========================================================================

  public recordVoiceInteraction(data: {
    id?: string;
    sessionId: string;
    vadTriggered?: boolean;
    partialTranscriptsCount?: number;
    finalTranscript?: string;
    sttConfidence?: number;
    languageDetected?: string;
    audioDurationMs?: number;
    ttsDurationMs?: number;
    interruptedByBargeIn?: boolean;
  }): VoiceInteraction {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // Ensure session exists
    const sessionExists = this.db.prepare(`SELECT 1 FROM multimodal_sessions WHERE id = ?`).get(data.sessionId);
    if (!sessionExists) {
      this.createSession({ id: data.sessionId, name: `Auto-created session ${data.sessionId}` });
    }

    const stmt = this.db.prepare(`
      INSERT INTO voice_interactions (
        id, session_id, vad_triggered, partial_transcripts_count,
        final_transcript, stt_confidence, language_detected,
        audio_duration_ms, tts_duration_ms, interrupted_by_barge_in, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.sessionId,
      data.vadTriggered ? 1 : 0,
      data.partialTranscriptsCount || 0,
      data.finalTranscript || null,
      data.sttConfidence !== undefined ? data.sttConfidence : 1.0,
      data.languageDetected || 'en',
      data.audioDurationMs || null,
      data.ttsDurationMs || null,
      data.interruptedByBargeIn ? 1 : 0,
      now
    );

    const row = this.db.prepare(`SELECT * FROM voice_interactions WHERE id = ?`).get(id) as any;
    return this.mapVoiceInteraction(row);
  }

  public listVoiceInteractions(sessionId?: string, limit = 50): VoiceInteraction[] {
    let sql = `SELECT * FROM voice_interactions`;
    const params: any[] = [];
    if (sessionId) {
      sql += ` WHERE session_id = ?`;
      params.push(sessionId);
    }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapVoiceInteraction(r));
  }

  // =========================================================================
  // Multimodal Preferences
  // =========================================================================

  public setPreference(key: string, value: string): void {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO multimodal_preferences (id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(id, key, value, now);
  }

  public getPreference(key: string): string | null {
    const row = this.db.prepare(`SELECT value FROM multimodal_preferences WHERE key = ?`).get(key) as any;
    return row ? row.value : null;
  }

  public listPreferences(): MultimodalPreferenceRecord[] {
    const rows = this.db.prepare(`SELECT * FROM multimodal_preferences ORDER BY key ASC`).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      value: r.value,
      updatedAt: r.updated_at,
    }));
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapSession(row: any): MultimodalSessionRecord {
    let activeModalities: ModalityType[] = ['TEXT', 'VISION', 'VOICE'];
    try {
      activeModalities = JSON.parse(row.active_modalities);
    } catch {}

    let metadata: Record<string, any> = {};
    try {
      metadata = row.metadata ? JSON.parse(row.metadata) : {};
    } catch {}

    return {
      id: row.id,
      sessionType: row.session_type,
      status: row.status,
      userId: row.user_id,
      activeModalities,
      currentApp: row.current_app || undefined,
      currentWindow: row.current_window || undefined,
      cameraState: row.camera_state,
      microphoneState: row.microphone_state,
      speakerState: row.speaker_state,
      startedAt: row.started_at,
      endedAt: row.ended_at || undefined,
      metadata,
    };
  }

  private mapInteraction(row: any): MultimodalInteractionRecord {
    const res: any = {
      id: row.id,
      sessionId: row.session_id,
      inputType: row.input_type,
      modality: row.input_type,
      rawText: row.raw_text || undefined,
      content: row.raw_text || undefined,
      transcriptConfidence: row.transcript_confidence !== null ? row.transcript_confidence : undefined,
      language: row.language || undefined,
      audioDurationMs: row.audio_duration_ms !== null ? row.audio_duration_ms : undefined,
      imageDimensions: row.image_dimensions || undefined,
      privacyTier: row.privacy_tier,
      responseText: row.response_text || undefined,
      responseAudioDurationMs: row.response_audio_duration_ms !== null ? row.response_audio_duration_ms : undefined,
      modelId: row.model_id || undefined,
      latencyMs: row.latency_ms !== null ? row.latency_ms : undefined,
      createdAt: row.created_at,
    };
    return res;
  }

  private mapObservation(row: any): VisionObservation {
    let detectedChallenges: ChallengeType[] = ['NONE'];
    try {
      detectedChallenges = row.detected_challenges ? JSON.parse(row.detected_challenges) : ['NONE'];
    } catch {}

    return {
      id: row.id,
      interactionId: row.interaction_id || undefined,
      sourceType: row.source_type,
      targetApp: row.target_app || undefined,
      targetWindow: row.target_window || undefined,
      activeWindow: row.target_window || undefined,
      ocrTextSummary: row.ocr_text_summary || undefined,
      uiaElementsCount: row.uia_elements_count || 0,
      visualElementsCount: row.visual_elements_count || 0,
      confidence: row.confidence,
      detectedChallenges,
      comparisonState: row.comparison_state || 'UNCHANGED',
      verificationStatus: row.verification_status || 'PENDING',
      verificationEvidence: row.verification_evidence || undefined,
      capturedAt: row.captured_at,
    } as any;
  }

  private mapVoiceInteraction(row: any): VoiceInteraction {
    return {
      id: row.id,
      sessionId: row.session_id,
      vadTriggered: Boolean(row.vad_triggered),
      partialTranscripts: [],
      finalTranscript: row.final_transcript || undefined,
      sttConfidence: row.stt_confidence,
      languageDetected: row.language_detected,
      audioDurationMs: row.audio_duration_ms,
      ttsDurationMs: row.tts_duration_ms,
      interruptedByBargeIn: Boolean(row.interrupted_by_barge_in),
      createdAt: row.created_at,
    };
  }
}

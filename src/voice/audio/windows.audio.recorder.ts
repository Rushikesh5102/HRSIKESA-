/**
 * HṚṢĪKEŚA (हृषीकेश) — Windows Audio Recorder (MCI winmm.dll)
 */

import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { IAudioRecorder, AudioRecordingResult } from '../interfaces/voice.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface WindowsAudioRecorderOptions {
  readonly artifactDir?: string;
  readonly sampleRate?: number;
}

export class WindowsAudioRecorder implements IAudioRecorder {
  private readonly logger?: ILogger;
  private readonly artifactDir: string;
  private readonly sampleRate: number;
  private recordingProcess?: ChildProcess;
  private currentOutputFile?: string;
  private recordingStartTime = 0;
  private _isRecording = false;

  constructor(options: WindowsAudioRecorderOptions = {}, logger?: ILogger) {
    this.logger = logger?.child('WindowsAudioRecorder');
    this.artifactDir = options.artifactDir || 'data/audio';
    this.sampleRate = options.sampleRate || 16000;
  }

  public get isRecording(): boolean {
    return this._isRecording;
  }

  public async startRecording(outputPath?: string): Promise<void> {
    if (this._isRecording) {
      throw new Error('Audio recording is already in progress.');
    }

    if (!fs.existsSync(this.artifactDir)) {
      fs.mkdirSync(this.artifactDir, { recursive: true });
    }

    this.currentOutputFile = path.resolve(
      outputPath ||
      path.join(this.artifactDir, `mic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`)
    );

    this.recordingStartTime = Date.now();
    this._isRecording = true;

    // PowerShell script that opens MCI waveaudio, records, and awaits stdin stop signal
    const escapedPath = this.currentOutputFile.replace(/\\/g, '\\\\');
    const psScript = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class WinMM {
          [DllImport("winmm.dll", EntryPoint = "mciSendStringA", CharSet = CharSet.Ansi)]
          public static extern int mciSendString(string command, System.Text.StringBuilder buffer, int bufferSize, IntPtr hwndCallback);
        }
"@
      [WinMM]::mciSendString("open new type waveaudio alias recsound", $null, 0, [IntPtr]::Zero)
      [WinMM]::mciSendString("set recsound alignment 2 bitspersample 16 samplespersec ${this.sampleRate} channels 1", $null, 0, [IntPtr]::Zero)
      [WinMM]::mciSendString("record recsound", $null, 0, [IntPtr]::Zero)
      
      # Read a line from stdin as stop trigger
      [Console]::ReadLine() | Out-Null
      
      [WinMM]::mciSendString("save recsound ${escapedPath}", $null, 0, [IntPtr]::Zero)
      [WinMM]::mciSendString("close recsound", $null, 0, [IntPtr]::Zero)
    `;

    this.recordingProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.logger?.info('Microphone recording started', { file: this.currentOutputFile });
  }

  public async stopRecording(): Promise<AudioRecordingResult> {
    if (!this._isRecording || !this.currentOutputFile) {
      throw new Error('No audio recording is currently active.');
    }

    const recordedFile = this.currentOutputFile;
    const durationMs = Date.now() - this.recordingStartTime;

    if (this.recordingProcess) {
      try {
        if (this.recordingProcess.stdin) {
          this.recordingProcess.stdin.write('STOP\n');
          this.recordingProcess.stdin.end();
        }

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            try { this.recordingProcess?.kill(); } catch {}
            resolve();
          }, 4000);

          this.recordingProcess?.on('close', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (err) {
        this.logger?.error('Error stopping recording process', { err });
      } finally {
        this.recordingProcess = undefined;
      }
    }

    this._isRecording = false;
    this.currentOutputFile = undefined;

    this.logger?.info('Microphone recording completed', { file: recordedFile, durationMs });

    return {
      audioFilePath: recordedFile,
      durationMs,
      sampleRate: this.sampleRate
    };
  }
}

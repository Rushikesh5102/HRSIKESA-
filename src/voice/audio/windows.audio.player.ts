/**
 * HṚṢĪKEŚA (हृषीकेश) — Windows Audio Player (SoundPlayer)
 */

import { execFile, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { IAudioPlayer } from '../interfaces/voice.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class WindowsAudioPlayer implements IAudioPlayer {
  private readonly logger?: ILogger;
  private currentProcess?: ChildProcess;
  private _isPlaying = false;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('WindowsAudioPlayer');
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public async play(audioFilePath: string): Promise<void> {
    const resolvedPath = path.resolve(audioFilePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Audio playback file not found: ${resolvedPath}`);
    }

    if (this._isPlaying) {
      await this.stop();
    }

    this._isPlaying = true;
    const escapedPath = resolvedPath.replace(/\\/g, '\\\\');

    const psScript = `
      $player = New-Object System.Media.SoundPlayer("${escapedPath}")
      $player.PlaySync()
      $player.Dispose()
    `;

    return new Promise<void>((resolve, reject) => {
      this.currentProcess = execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 60000 },
        (error) => {
          this._isPlaying = false;
          this.currentProcess = undefined;
          if (error && !error.killed) {
            this.logger?.error('Audio playback error', { error });
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async stop(): Promise<void> {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill();
      } catch {}
      this.currentProcess = undefined;
    }
    this._isPlaying = false;
  }
}

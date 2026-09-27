/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Personal AI Operating System
 * Phase 7: Application Launch Allowlist & Sandboxing
 */

export interface AllowedAppDefinition {
  id: string;
  name: string;
  executable: string;
  defaultArgs?: string[];
  description: string;
}

export class ApplicationAllowlist {
  private static readonly ALLOWED_APPS = new Map<string, AllowedAppDefinition>([
    [
      'notepad',
      {
        id: 'notepad',
        name: 'Notepad',
        executable: 'notepad.exe',
        description: 'Windows text editor'
      }
    ],
    [
      'calculator',
      {
        id: 'calculator',
        name: 'Calculator',
        executable: 'calc.exe',
        description: 'Windows Calculator'
      }
    ],
    [
      'calc',
      {
        id: 'calculator',
        name: 'Calculator',
        executable: 'calc.exe',
        description: 'Windows Calculator'
      }
    ],
    [
      'paint',
      {
        id: 'paint',
        name: 'Paint',
        executable: 'mspaint.exe',
        description: 'Windows Paint graphics editor'
      }
    ],
    [
      'browser',
      {
        id: 'browser',
        name: 'Web Browser',
        executable: 'msedge.exe',
        description: 'Microsoft Edge / Google Chrome'
      }
    ],
    [
      'android-studio',
      {
        id: 'android-studio',
        name: 'Android Studio',
        executable: 'studio64.exe',
        description: 'Android Studio IDE'
      }
    ],
    [
      'blender',
      {
        id: 'blender',
        name: 'Blender',
        executable: 'blender.exe',
        description: 'Blender 3D Suite'
      }
    ]
  ]);

  /**
   * Resolve an app alias or identifier to its allowed application configuration.
   * Returns undefined if the application is not allowlisted.
   */
  public static resolveApp(target: string): AllowedAppDefinition | undefined {
    if (!target || typeof target !== 'string') {
      return undefined;
    }

    const normalized = target.trim().toLowerCase().replace(/\.exe$/i, '');
    return this.ALLOWED_APPS.get(normalized);
  }

  /**
   * Check whether an application target is allowlisted.
   */
  public static isAllowed(target: string): boolean {
    return this.resolveApp(target) !== undefined;
  }

  /**
   * List all currently allowlisted applications.
   */
  public static listAllowedApps(): AllowedAppDefinition[] {
    return Array.from(this.ALLOWED_APPS.values());
  }
}

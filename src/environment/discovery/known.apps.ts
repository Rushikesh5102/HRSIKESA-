/**
 * HṚṢĪKEŚA (हृषीकेश) — Known Application Catalog (Phase 10)
 *
 * Defines curated metadata, standard executable locations, and winget package IDs
 * for common development, productivity, and desktop applications.
 */

export interface KnownAppDefinition {
  id: string;
  name: string;
  aliases: string[];
  publisher?: string;
  defaultExecutableNames: string[];
  standardPaths: string[];
  wingetPackageId?: string;
  capabilities: string[];
  defaultArgs?: string[];
}

export class KnownAppCatalog {
  private static readonly CATALOG: KnownAppDefinition[] = [
    {
      id: 'notepad',
      name: 'Notepad',
      aliases: ['notepad', 'text editor', 'notepad.exe'],
      publisher: 'Microsoft Corporation',
      defaultExecutableNames: ['notepad.exe'],
      standardPaths: [
        'C:\\Windows\\System32\\notepad.exe',
        'C:\\Windows\\notepad.exe'
      ],
      wingetPackageId: 'Microsoft.WindowsNotepad',
      capabilities: ['gui', 'text-editor']
    },
    {
      id: 'calculator',
      name: 'Calculator',
      aliases: ['calculator', 'calc', 'calc.exe'],
      publisher: 'Microsoft Corporation',
      defaultExecutableNames: ['calc.exe', 'CalculatorApp.exe'],
      standardPaths: [
        'C:\\Windows\\System32\\calc.exe'
      ],
      wingetPackageId: 'Microsoft.WindowsCalculator',
      capabilities: ['gui', 'utility']
    },
    {
      id: 'paint',
      name: 'Paint',
      aliases: ['paint', 'mspaint', 'mspaint.exe'],
      publisher: 'Microsoft Corporation',
      defaultExecutableNames: ['mspaint.exe'],
      standardPaths: [
        'C:\\Windows\\System32\\mspaint.exe'
      ],
      wingetPackageId: 'Microsoft.Paint',
      capabilities: ['gui', 'graphics']
    },
    {
      id: 'blender',
      name: 'Blender',
      aliases: ['blender', 'blender 3d', 'blender.exe'],
      publisher: 'Blender Foundation',
      defaultExecutableNames: ['blender.exe'],
      standardPaths: [
        'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe'
      ],
      wingetPackageId: 'BlenderFoundation.Blender',
      capabilities: ['gui', 'cli', '3d', 'graphics', 'rendering']
    },
    {
      id: 'vscode',
      name: 'Visual Studio Code',
      aliases: ['vscode', 'code', 'visual studio code', 'code.exe'],
      publisher: 'Microsoft Corporation',
      defaultExecutableNames: ['Code.exe', 'code.cmd'],
      standardPaths: [
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Programs\\Microsoft VS Code\\Code.exe`,
        'C:\\Program Files\\Microsoft VS Code\\Code.exe',
        'C:\\Program Files (x86)\\Microsoft VS Code\\Code.exe'
      ],
      wingetPackageId: 'Microsoft.VisualStudioCode',
      capabilities: ['gui', 'cli', 'code-editor', 'development']
    },
    {
      id: 'git',
      name: 'Git',
      aliases: ['git', 'git-scm', 'git.exe'],
      publisher: 'Software Freedom Conservancy',
      defaultExecutableNames: ['git.exe'],
      standardPaths: [
        'C:\\Program Files\\Git\\cmd\\git.exe',
        'C:\\Program Files\\Git\\bin\\git.exe',
        'C:\\Program Files (x86)\\Git\\cmd\\git.exe'
      ],
      wingetPackageId: 'Git.Git',
      capabilities: ['cli', 'version-control', 'development']
    },
    {
      id: 'nodejs',
      name: 'Node.js',
      aliases: ['node', 'nodejs', 'node.exe'],
      publisher: 'OpenJS Foundation',
      defaultExecutableNames: ['node.exe'],
      standardPaths: [
        'C:\\Program Files\\nodejs\\node.exe',
        'C:\\Program Files (x86)\\nodejs\\node.exe'
      ],
      wingetPackageId: 'OpenJS.NodeJS',
      capabilities: ['cli', 'runtime', 'javascript', 'development']
    },
    {
      id: 'python',
      name: 'Python',
      aliases: ['python', 'python3', 'python.exe', 'py.exe'],
      publisher: 'Python Software Foundation',
      defaultExecutableNames: ['python.exe', 'py.exe'],
      standardPaths: [
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Programs\\Python\\Python314\\python.exe`,
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Programs\\Python\\Python312\\python.exe`,
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Programs\\Python\\Python311\\python.exe`,
        'C:\\Windows\\py.exe',
        'C:\\Program Files\\Python312\\python.exe'
      ],
      wingetPackageId: 'Python.Python.3.12',
      capabilities: ['cli', 'runtime', 'python', 'development']
    },
    {
      id: 'ollama',
      name: 'Ollama',
      aliases: ['ollama', 'ollama.exe'],
      publisher: 'Ollama Inc.',
      defaultExecutableNames: ['ollama.exe', 'ollama app.exe'],
      standardPaths: [
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Programs\\Ollama\\ollama.exe`,
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Programs\\Ollama\\ollama app.exe`,
        'C:\\Program Files\\Ollama\\ollama.exe'
      ],
      wingetPackageId: 'Ollama.Ollama',
      capabilities: ['cli', 'ai-runtime', 'llm-engine']
    },
    {
      id: 'chrome',
      name: 'Google Chrome',
      aliases: ['chrome', 'google chrome', 'chrome.exe'],
      publisher: 'Google LLC',
      defaultExecutableNames: ['chrome.exe'],
      standardPaths: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Google\\Chrome\\Application\\chrome.exe`
      ],
      wingetPackageId: 'Google.Chrome',
      capabilities: ['gui', 'browser', 'web']
    },
    {
      id: 'edge',
      name: 'Microsoft Edge',
      aliases: ['edge', 'msedge', 'microsoft edge', 'msedge.exe'],
      publisher: 'Microsoft Corporation',
      defaultExecutableNames: ['msedge.exe'],
      standardPaths: [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ],
      wingetPackageId: 'Microsoft.Edge',
      capabilities: ['gui', 'browser', 'web']
    },
    {
      id: 'android-studio',
      name: 'Android Studio',
      aliases: ['android studio', 'studio', 'studio64.exe'],
      publisher: 'Google LLC',
      defaultExecutableNames: ['studio64.exe', 'studio.exe'],
      standardPaths: [
        'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe',
        `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\Programs\\Android Studio\\bin\\studio64.exe`
      ],
      wingetPackageId: 'Google.AndroidStudio',
      capabilities: ['gui', 'ide', 'android', 'development']
    }
  ];

  public static getAllKnownApps(): KnownAppDefinition[] {
    return [...this.CATALOG];
  }

  public static findInCatalog(query: string): KnownAppDefinition | null {
    const q = query.toLowerCase().trim();
    for (const app of this.CATALOG) {
      if (app.id.toLowerCase() === q || app.name.toLowerCase() === q) {
        return app;
      }
      if (app.aliases.some(alias => alias.toLowerCase() === q)) {
        return app;
      }
      if (app.defaultExecutableNames.some(exe => exe.toLowerCase() === q)) {
        return app;
      }
    }
    return null;
  }
}

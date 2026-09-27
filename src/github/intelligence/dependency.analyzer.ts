/**
 * HṚṢĪKEŚA (हृषीकेश) — Dependency Intelligence Analyzer
 *
 * Statically parses package manifests without executing install scripts,
 * detects lockfile presence, inspects lifecycle hooks, and evaluates supply-chain risks.
 */

import { DependencyRecord } from '../types/github.types.js';

export interface DependencyAnalysisResult {
  readonly runtime: 'nodejs' | 'python' | 'rust' | 'go' | 'unknown';
  readonly manifestsFound: string[];
  readonly manifests: string[];
  readonly hasLockfile: boolean;
  readonly lockfilePresent: boolean;
  readonly dependencies: DependencyRecord[];
  readonly totalProdDependencies: number;
  readonly totalDevDependencies: number;
  readonly suspiciousScripts: Array<{ scriptName: string; command: string; reason: string }>;
  readonly overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly riskSummary: string[];
  readonly riskReasons?: string[];
}

export class DependencyAnalyzer {
  /**
   * Analyzes repository file list and manifest contents.
   */
  public static analyzeDependencies(
    repositoryId: string,
    fileMap: Map<string, string> // filename -> raw text content
  ): DependencyAnalysisResult {
    const manifestsFound: string[] = [];
    const dependencies: DependencyRecord[] = [];
    const suspiciousScripts: Array<{ scriptName: string; command: string; reason: string }> = [];
    const riskSummary: string[] = [];
    let hasLockfile = false;
    let runtime: 'nodejs' | 'python' | 'rust' | 'go' | 'unknown' = 'unknown';

    // 1. Inspect Node.js Ecosystem
    if (fileMap.has('package.json')) {
      manifestsFound.push('package.json');
      runtime = 'nodejs';
      const rawPkg = fileMap.get('package.json') || '{}';
      try {
        const pkg = JSON.parse(rawPkg);

        // Check lockfiles
        if (fileMap.has('package-lock.json') || fileMap.has('yarn.lock') || fileMap.has('pnpm-lock.yaml')) {
          hasLockfile = true;
        } else {
          riskSummary.push('Missing lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml).');
        }

        // Inspect scripts for suspicious hooks
        const scripts = pkg.scripts || {};
        const dangerousHooks = ['preinstall', 'install', 'postinstall', 'prepare'];
        for (const hook of dangerousHooks) {
          if (scripts[hook]) {
            const cmd = String(scripts[hook]);
            const lowerCmd = cmd.toLowerCase();
            if (
              lowerCmd.includes('curl ') ||
              lowerCmd.includes('wget ') ||
              lowerCmd.includes('http://') ||
              lowerCmd.includes('https://') ||
              lowerCmd.includes('| bash') ||
              lowerCmd.includes('| sh') ||
              lowerCmd.includes('powershell')
            ) {
              suspiciousScripts.push({
                scriptName: hook,
                command: cmd,
                reason: 'Install-time hook executes network download or arbitrary shell pipe (curl/wget shell piping).',
              });
              riskSummary.push(`Suspicious lifecycle hook '${hook}': ${cmd} (curl/wget shell piping)`);
            }
          }
        }

        // Extract dependencies
        const prod = pkg.dependencies || {};
        for (const [name, ver] of Object.entries(prod)) {
          dependencies.push({
            id: `dep_${repositoryId}_${name}`,
            repositoryId,
            manifestFile: 'package.json',
            name,
            versionSpec: String(ver),
            dependencyType: 'PROD',
            runtime: 'nodejs',
            riskLevel: 'LOW',
            riskReasons: [],
          });
        }

        const dev = pkg.devDependencies || {};
        for (const [name, ver] of Object.entries(dev)) {
          dependencies.push({
            id: `dep_${repositoryId}_${name}`,
            repositoryId,
            manifestFile: 'package.json',
            name,
            versionSpec: String(ver),
            dependencyType: 'DEV',
            runtime: 'nodejs',
            riskLevel: 'LOW',
            riskReasons: [],
          });
        }
      } catch {
        riskSummary.push('Malformed package.json manifest.');
      }
    }

    // 2. Inspect Python Ecosystem
    if (fileMap.has('requirements.txt') || fileMap.has('pyproject.toml') || fileMap.has('Pipfile')) {
      if (runtime === 'unknown') runtime = 'python';
      if (fileMap.has('requirements.txt')) {
        manifestsFound.push('requirements.txt');
        const lines = (fileMap.get('requirements.txt') || '').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split(/[=><~]/);
            const depName = parts[0].trim();
            const spec = trimmed.slice(depName.length).trim();
            if (depName) {
              dependencies.push({
                id: `dep_${repositoryId}_${depName}`,
                repositoryId,
                manifestFile: 'requirements.txt',
                name: depName,
                versionSpec: spec,
                dependencyType: 'PROD',
                runtime: 'python',
                riskLevel: 'LOW',
                riskReasons: [],
              });
            }
          }
        }
      }

      if (fileMap.has('poetry.lock') || fileMap.has('Pipfile.lock')) {
        hasLockfile = true;
      }
    }

    // 3. Inspect Rust Ecosystem
    if (fileMap.has('Cargo.toml')) {
      manifestsFound.push('Cargo.toml');
      if (runtime === 'unknown') runtime = 'rust';
      const tomlContent = fileMap.get('Cargo.toml') || '';
      let inDeps = false;
      for (const line of tomlContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[dependencies]')) {
          inDeps = true;
          continue;
        } else if (trimmed.startsWith('[') && inDeps) {
          inDeps = false;
        }
        if (inDeps && trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            const depName = parts[0].trim();
            const spec = parts.slice(1).join('=').trim().replace(/['"]/g, '');
            dependencies.push({
              id: `dep_${repositoryId}_${depName}`,
              repositoryId,
              manifestFile: 'Cargo.toml',
              name: depName,
              versionSpec: spec,
              dependencyType: 'PROD',
              runtime: 'rust',
              riskLevel: 'LOW',
              riskReasons: [],
            });
          }
        }
      }
      if (fileMap.has('Cargo.lock')) {
        hasLockfile = true;
      }
    }

    // 4. Inspect Go Ecosystem
    if (fileMap.has('go.mod')) {
      manifestsFound.push('go.mod');
      if (runtime === 'unknown') runtime = 'go';
      const goMod = fileMap.get('go.mod') || '';
      for (const line of goMod.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('require ') || (!trimmed.startsWith('module') && !trimmed.startsWith('go ') && trimmed.includes(' '))) {
          const clean = trimmed.replace(/^require\s+/, '');
          const parts = clean.split(/\s+/);
          if (parts.length >= 2 && parts[0] && parts[1]) {
            dependencies.push({
              id: `dep_${repositoryId}_${parts[0]}`,
              repositoryId,
              manifestFile: 'go.mod',
              name: parts[0],
              versionSpec: parts[1],
              dependencyType: 'PROD',
              runtime: 'go',
              riskLevel: 'LOW',
              riskReasons: [],
            });
          }
        }
      }
      if (fileMap.has('go.sum')) {
        hasLockfile = true;
      }
    }

    // Compute metrics
    const totalProd = dependencies.filter((d) => d.dependencyType === 'PROD').length;
    const totalDev = dependencies.filter((d) => d.dependencyType === 'DEV').length;

    if (totalProd > 120) {
      riskSummary.push(`Excessive production dependency count (${totalProd} > 120).`);
    }

    // Determine overall risk
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (suspiciousScripts.length > 0) {
      overallRisk = 'CRITICAL';
    } else if (riskSummary.length >= 2 || totalProd > 150) {
      overallRisk = 'HIGH';
    } else if (riskSummary.length >= 1 || !hasLockfile) {
      overallRisk = 'MEDIUM';
    }

    return {
      runtime,
      manifestsFound,
      manifests: manifestsFound,
      hasLockfile,
      lockfilePresent: hasLockfile,
      dependencies,
      totalProdDependencies: totalProd,
      totalDevDependencies: totalDev,
      suspiciousScripts,
      overallRisk,
      riskLevel: overallRisk,
      riskSummary,
      riskReasons: riskSummary,
    };
  }
}

/**
 * HṚṢĪKEŚA (हृषीकेश) — Failure Normalization & Diagnostics Engine
 *
 * FP-10: Parses raw compiler, linter, runtime, and test outputs into
 * structured diagnostics with root-cause hypotheses and convergence fingerprints.
 */

import crypto from 'node:crypto';
import {
  StructuredDiagnostic,
  DiagnosticCategory,
} from '../types/engineering.types.js';

export class DiagnosisEngine {
  /**
   * Normalizes raw failure output into a StructuredDiagnostic object.
   */
  public normalizeFailure(taskId: string, rawOutput: string): StructuredDiagnostic {
    return this.normalize(taskId, rawOutput);
  }

  public normalize(taskId: string, rawOutput: string): StructuredDiagnostic {
    const id = `diag_${crypto.randomUUID().slice(0, 10)}`;
    const category = this.detectCategory(rawOutput);
    const parsed = this.parseErrorDetails(rawOutput, category);

    // Compute deterministic fingerprint to detect repeated failure cycles
    const fpSource = `${category}:${parsed.file || 'unknown'}:${parsed.line || 0}:${parsed.message.slice(0, 100)}`;
    const fingerprint = crypto.createHash('sha256').update(fpSource).digest('hex').slice(0, 16);

    const hypotheses = this.generateHypotheses(category, parsed);

    return {
      id,
      taskId,
      category,
      confidence: parsed.file && parsed.line ? 'HIGH' : 'MEDIUM',
      fingerprint,
      file: parsed.file,
      line: parsed.line,
      column: parsed.column,
      code: parsed.code,
      expected: parsed.expected,
      received: parsed.received,
      message: parsed.message,
      rawOutput,
      hypotheses,
      proposedFix: parsed.proposedFix,
      createdAt: new Date().toISOString(),
    };
  }

  private detectCategory(output: string): DiagnosticCategory {
    if (/\b(?:AssertionError|expected|strictly equal|assert\.)\b/i.test(output)) {
      return 'TEST_FAILURE';
    }
    if (/\b(?:TS\d{4}|error TS|Cannot find name|Type '.*' is not assignable)\b/i.test(output)) {
      return 'TYPE_ERROR';
    }
    if (/\b(?:eslint|prettier|lint error|SyntaxError)\b/i.test(output)) {
      return 'LINT_ERROR';
    }
    if (/\b(?:build failed|Compilation error|ELIFECYCLE|failed to compile)\b/i.test(output)) {
      return 'BUILD_FAILURE';
    }
    if (/\b(?:Cannot find module|MODULE_NOT_FOUND|package not found)\b/i.test(output)) {
      return 'DEPENDENCY_ERROR';
    }
    if (/\b(?:ETIMEDOUT|ECONNREFUSED|ENOTFOUND|network error)\b/i.test(output)) {
      return 'NETWORK_ERROR';
    }
    if (/\b(?:timed out|timeout exceeded)\b/i.test(output)) {
      return 'TIMEOUT';
    }
    if (/\b(?:ReferenceError|TypeError|RangeError)\b/i.test(output)) {
      return 'RUNTIME_ERROR';
    }
    if (/\b(?:EACCES|EPERM|permission denied|access denied)\b/i.test(output)) {
      return 'PERMISSION_ERROR';
    }
    return 'UNKNOWN';
  }

  private parseErrorDetails(output: string, category: DiagnosticCategory): {
    file?: string;
    line?: number;
    column?: number;
    code?: string;
    expected?: string;
    received?: string;
    message: string;
    proposedFix?: string;
  } {
    let file: string | undefined;
    let line: number | undefined;
    let column: number | undefined;
    let expected: string | undefined;
    let received: string | undefined;
    let message = '';

    // File:line regex match (e.g. src/auth.ts:42:15 or tests/sample.test.ts:18:5)
    const fileLineMatch = output.match(/([A-Za-z0-9_\-./\\]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?/);
    if (fileLineMatch) {
      file = fileLineMatch[1].replace(/\\/g, '/');
      line = parseInt(fileLineMatch[2], 10);
      if (fileLineMatch[3]) column = parseInt(fileLineMatch[3], 10);
    }

    // Expected vs received extraction
    const nodeDiffMatch = output.match(/\+\s*actual\s*-\s*expected[\s\S]*?\+\s*([^\r\n]+)[\s\S]*?-\s*([^\r\n]+)/i);
    if (nodeDiffMatch) {
      received = nodeDiffMatch[1].trim();
      expected = nodeDiffMatch[2].trim();
    } else {
      const expMatch = output.match(/(?:expected|Expected):\s*(.+)/i);
      const recMatch = output.match(/(?:received|actual|Actual):\s*(.+)/i);
      if (expMatch) expected = expMatch[1].trim();
      if (recMatch) received = recMatch[1].trim();
    }

    // Error message line extraction
    const lines = output.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    for (const l of lines) {
      if (l.includes('Error:') || l.includes('AssertionError') || l.startsWith('✖') || l.includes('FAIL')) {
        message = l;
        break;
      }
    }
    if (!message) {
      message = lines[0] || 'Unknown error occurred during verification';
    }

    let proposedFix: string | undefined;
    if (category === 'TEST_FAILURE' && expected && received) {
      proposedFix = `Adjust logic producing [${received}] to return expected value [${expected}].`;
    } else if (category === 'TYPE_ERROR') {
      proposedFix = 'Correct variable type definition or function signature to satisfy TypeScript compiler.';
    } else if (category === 'DEPENDENCY_ERROR') {
      proposedFix = 'Verify import path and install or export the missing module dependency.';
    }

    return { file, line, column, expected, received, message, proposedFix };
  }

  private generateHypotheses(category: DiagnosticCategory, details: { file?: string; line?: number; expected?: string; received?: string }): string[] {
    const list: string[] = [];

    if (category === 'TEST_FAILURE') {
      list.push('Implementation logic returned unexpected value or side effect.');
      if (details.expected && details.received) {
        list.push(`Return value mismatch: produced ${details.received} instead of ${details.expected}.`);
      }
      list.push('Test assertion condition was not met due to calculation or conditional branch error.');
    } else if (category === 'TYPE_ERROR') {
      list.push('Mismatched parameter types or missing interface property.');
      list.push('Nullable or optional value accessed without null-check guard.');
    } else if (category === 'DEPENDENCY_ERROR') {
      list.push('Missing import or invalid module specifier path.');
      list.push('Exported symbol name does not match imported symbol name.');
    } else if (category === 'RUNTIME_ERROR') {
      list.push('Undefined variable or unhandled exception during execution.');
    } else {
      list.push('Unexpected error in build or execution environment.');
    }

    return list;
  }
}

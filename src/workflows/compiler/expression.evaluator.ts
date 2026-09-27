/**
 * HṚṢĪKEŚA (हृषीकेश) — Deterministic Safe Expression Evaluator
 *
 * FP-11: Zero-eval, strictly-bounded, sandboxed expression evaluator for workflow conditions.
 * Prevents arbitrary JavaScript execution, prototype pollution, code injection, and infinite recursion.
 */

export class SafeExpressionEvaluator {
  private static readonly MAX_EXPRESSION_LENGTH = 1000;
  private static readonly MAX_DEPTH = 32;

  /**
   * Evaluates an expression string or template against the given context variables.
   * If expression is enclosed in {{ ... }}, strips the delimiters.
   */
  public static evaluate(expr: string, context: Record<string, any>): any {
    if (!expr || typeof expr !== 'string') return expr;

    const trimmed = expr.trim();
    if (trimmed.length > this.MAX_EXPRESSION_LENGTH) {
      throw new Error(`Expression length exceeds limit (${this.MAX_EXPRESSION_LENGTH})`);
    }

    // Check if it's a template containing multiple {{ ... }} interpolations
    if (trimmed.includes('{{') && trimmed.includes('}}')) {
      // If it's a single expression like "{{ a == b }}", evaluate directly as value/boolean
      const singleMatch = trimmed.match(/^\{\{\s*(.*?)\s*\}\}$/s);
      if (singleMatch) {
        return this.evaluateInner(singleMatch[1], context, 0);
      }

      // If it's an interpolated string like "Hello {{user.name}}!"
      return trimmed.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, inner) => {
        const val = this.evaluateInner(inner, context, 0);
        return val === undefined || val === null ? '' : String(val);
      });
    }

    // Bare expression without {{ }}
    return this.evaluateInner(trimmed, context, 0);
  }

  /**
   * Deterministically evaluates condition to boolean.
   */
  public static evaluateCondition(expr: string | undefined, context: Record<string, any>): boolean {
    if (!expr || expr.trim() === '') return true;
    try {
      const result = this.evaluate(expr, context);
      return Boolean(result);
    } catch {
      return false;
    }
  }

  private static evaluateInner(expr: string, context: Record<string, any>, depth: number): any {
    if (depth > this.MAX_DEPTH) {
      throw new Error('Expression recursion depth limit exceeded');
    }

    const trimmed = expr.trim();
    if (!trimmed) return undefined;

    // Disallow dangerous keywords
    const lower = trimmed.toLowerCase();
    const forbidden = [
      'function', 'constructor', 'prototype', '__proto__', 'eval', 'import',
      'require', 'process', 'global', 'window', 'document', 'settimeout',
      'setinterval', 'exec', 'spawn', 'fetch', 'xmlhttprequest'
    ];
    for (const word of forbidden) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(lower)) {
        throw new Error(`Forbidden keyword '${word}' detected in expression.`);
      }
    }

    // 1. Handle logical OR (||)
    const orParts = this.splitTopLevel(trimmed, '||');
    if (orParts.length > 1) {
      for (const part of orParts) {
        if (this.evaluateInner(part, context, depth + 1)) {
          return true;
        }
      }
      return false;
    }

    // 2. Handle logical AND (&&)
    const andParts = this.splitTopLevel(trimmed, '&&');
    if (andParts.length > 1) {
      for (const part of andParts) {
        if (!this.evaluateInner(part, context, depth + 1)) {
          return false;
        }
      }
      return true;
    }

    // 3. Handle Logical NOT (!)
    if (trimmed.startsWith('!')) {
      return !this.evaluateInner(trimmed.slice(1), context, depth + 1);
    }

    // 4. Handle Parentheses ( ... )
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const inner = trimmed.slice(1, -1).trim();
      return this.evaluateInner(inner, context, depth + 1);
    }

    // 5. Comparison operators: ==, !=, >=, <=, >, <
    const operators = ['==', '!=', '>=', '<=', '>', '<'];
    for (const op of operators) {
      const parts = this.splitTopLevel(trimmed, op);
      if (parts.length === 2) {
        const left = this.evaluateInner(parts[0], context, depth + 1);
        const right = this.evaluateInner(parts[1], context, depth + 1);
        switch (op) {
          case '==': return left === right;
          case '!=': return left !== right;
          case '>': return Number(left) > Number(right);
          case '<': return Number(left) < Number(right);
          case '>=': return Number(left) >= Number(right);
          case '<=': return Number(left) <= Number(right);
        }
      }
    }

    // 6. Simple Arithmetic: +, -
    const plusParts = this.splitTopLevel(trimmed, '+');
    if (plusParts.length > 1) {
      let sum: any = this.evaluateInner(plusParts[0], context, depth + 1);
      for (let i = 1; i < plusParts.length; i++) {
        const next = this.evaluateInner(plusParts[i], context, depth + 1);
        sum = (typeof sum === 'string' || typeof next === 'string') ? String(sum) + String(next) : Number(sum) + Number(next);
      }
      return sum;
    }

    const minusParts = this.splitTopLevel(trimmed, '-');
    if (minusParts.length === 2) {
      const left = this.evaluateInner(minusParts[0], context, depth + 1);
      const right = this.evaluateInner(minusParts[1], context, depth + 1);
      return Number(left) - Number(right);
    }

    // 7. Literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;

    // String literals: "string" or 'string'
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Number literals
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }

    // 8. Method calls on identifiers: array.includes(x) or string.includes(x)
    const methodMatch = trimmed.match(/^([a-zA-Z0-9_$.]+)\.includes\((.*?)\)$/);
    if (methodMatch) {
      const target = this.resolvePath(methodMatch[1], context);
      const arg = this.evaluateInner(methodMatch[2], context, depth + 1);
      if (Array.isArray(target)) return target.includes(arg);
      if (typeof target === 'string') return target.includes(String(arg));
      return false;
    }

    // 9. Identifier / Property lookup (e.g. ticket.status, build.failed, items.length)
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$.[\]]*$/.test(trimmed)) {
      return trimmed;
    }
    return this.resolvePath(trimmed, context);
  }

  /**
   * Splits an expression string by delimiter at top level (ignoring quotes and parentheses).
   */
  private static splitTopLevel(str: string, delimiter: string): string[] {
    const results: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
        continue;
      }
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
        continue;
      }
      if (inSingleQuote || inDoubleQuote) {
        current += char;
        continue;
      }

      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;

      if (parenDepth === 0 && str.startsWith(delimiter, i)) {
        // Ensure we don't accidentally split '==' when delimiter is '=' or '<=' on '<'
        const isExactMatch = 
          (delimiter === '==' && str.startsWith('===', i)) ? false :
          (delimiter === '>' && str.startsWith('>=', i)) ? false :
          (delimiter === '<' && str.startsWith('<=', i)) ? false :
          (delimiter === '!' && str.startsWith('!=', i)) ? false : true;

        if (isExactMatch) {
          results.push(current.trim());
          current = '';
          i += delimiter.length - 1;
          continue;
        }
      }

      current += char;
    }

    results.push(current.trim());
    return results.filter(p => p.length > 0);
  }

  /**
   * Resolves a dot/bracket path against context safely.
   */
  private static resolvePath(pathStr: string, context: Record<string, any>): any {
    const cleaned = pathStr.replace(/\[(\d+)\]/g, '.$1');
    const segments = cleaned.split('.').map(s => s.trim()).filter(Boolean);

    let current: any = context;
    for (const seg of segments) {
      if (current === null || current === undefined) return undefined;
      if (seg === '__proto__' || seg === 'prototype' || seg === 'constructor') {
        return undefined;
      }
      current = current[seg];
    }
    return current;
  }
}

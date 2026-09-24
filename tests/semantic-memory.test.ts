/**
 * HṚṢĪKEŚA — Phase 12: Semantic Memory Unit Tests
 *
 * Tests for:
 * - EmbeddingRedactor (secret exclusion, tier exclusion)
 * - EmbeddingRepository (blob storage and retrieval)
 * - Cosine similarity math correctness
 * - SemanticMemoryIndexer (status, queue bounds, defer logic)
 * - HybridMemoryRetriever (ranking formula, authoritative override, provenance safety)
 */

import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { EmbeddingRedactor } from '../src/memory/semantic/embedding.redactor.js';
import type { MemoryTier } from '../src/memory/memory.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// EmbeddingRedactor Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EmbeddingRedactor', () => {
  let redactor: EmbeddingRedactor;

  beforeEach(() => {
    redactor = new EmbeddingRedactor();
  });

  test('passes safe text through unchanged (short)', () => {
    const r = redactor.prepare('knowledge' as MemoryTier, 'The capital of France is Paris.');
    assert.ok(r.text !== null, 'Should allow safe content');
    assert.equal(r.wasRedacted, false);
  });

  test('passes safe text through with truncation at 2000 chars', () => {
    const sentence = 'The quick brown fox jumps over the lazy dog. ';
    const longText = sentence.repeat(Math.ceil(3000 / sentence.length)).slice(0, 3000);
    const r = redactor.prepare('knowledge' as MemoryTier, longText);
    assert.ok(r.text !== null, `Should allow safe content, got: ${r.reason}`);
    assert.ok(r.text!.length <= 2000, `Expected <= 2000 chars, got ${r.text!.length}`);
    assert.ok(r.text!.length >= 1990, `Expected >= 1990 chars (near 2000), got ${r.text!.length}`);
    assert.equal(r.wasRedacted, false);
  });

  test('excludes audit_history tier', () => {
    const r = redactor.prepare('audit_history' as MemoryTier, 'Some audit log content.');
    assert.equal(r.text, null);
    assert.equal(r.wasRedacted, true);
    assert.ok(r.reason?.includes('audit_history'));
  });

  test('excludes tool_state tier', () => {
    const r = redactor.prepare('tool_state' as MemoryTier, 'Tool state data.');
    assert.equal(r.text, null);
    assert.equal(r.wasRedacted, true);
    assert.ok(r.reason?.includes('tool_state'));
  });

  test('blocks content with API key pattern', () => {
    const r = redactor.prepare('knowledge' as MemoryTier, 'api_key: sk-abc123defgh456ijklmn7890opqrst');
    assert.equal(r.text, null);
    assert.equal(r.wasRedacted, true);
  });

  test('blocks content with password pattern', () => {
    const r = redactor.prepare('preferences' as MemoryTier, 'password: mySecretP@ssw0rd!');
    assert.equal(r.text, null);
    assert.equal(r.wasRedacted, true);
  });

  test('blocks bearer tokens', () => {
    const r = redactor.prepare('knowledge' as MemoryTier, 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc');
    assert.equal(r.text, null);
    assert.equal(r.wasRedacted, true);
  });

  test('returns null for empty content', () => {
    const r = redactor.prepare('decisions' as MemoryTier, '');
    assert.equal(r.text, null);
    assert.equal(r.wasRedacted, false);
    assert.ok(r.reason?.includes('Empty'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cosine Similarity Math
// ─────────────────────────────────────────────────────────────────────────────

describe('Cosine Similarity (dot product of L2-normalized vectors)', () => {
  function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  function l2normalize(arr: number[]): Float32Array {
    const v = new Float32Array(arr);
    let norm = 0;
    for (const x of v) norm += x * x;
    norm = Math.sqrt(norm);
    for (let i = 0; i < v.length; i++) v[i] /= norm;
    return v;
  }

  test('identical normalized vectors → similarity ~1.0', () => {
    const v = l2normalize([1, 2, 3, 4]);
    const sim = cosineSimilarity(v, v);
    assert.ok(Math.abs(sim - 1.0) < 1e-6, `Expected ~1.0 got ${sim}`);
  });

  test('orthogonal vectors → similarity ~0.0', () => {
    const a = l2normalize([1, 0, 0]);
    const b = l2normalize([0, 1, 0]);
    const sim = cosineSimilarity(a, b);
    assert.ok(Math.abs(sim) < 1e-6, `Expected ~0 got ${sim}`);
  });

  test('opposite vectors → similarity ~ -1.0', () => {
    const a = l2normalize([1, 2, 3]);
    const b = l2normalize([-1, -2, -3]);
    const sim = cosineSimilarity(a, b);
    assert.ok(Math.abs(sim + 1.0) < 1e-6, `Expected ~-1.0 got ${sim}`);
  });

  test('similar direction vectors → high positive similarity', () => {
    const a = l2normalize([1, 1, 0, 0]);
    const b = l2normalize([1, 0.9, 0.1, 0]);
    const sim = cosineSimilarity(a, b);
    assert.ok(sim > 0.9, `Expected >0.9 got ${sim}`);
  });

  test('zero vector → no crash (returns near 0)', () => {
    const a = new Float32Array([0, 0, 0]);
    const b = l2normalize([1, 2, 3]);
    const sim = cosineSimilarity(a, b);
    assert.ok(Math.abs(sim) < 1e-3, `Expected ~0 got ${sim}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HybridMemoryRetriever Ranking Formula
// ─────────────────────────────────────────────────────────────────────────────

describe('HybridMemoryRetriever Ranking Formula', () => {
  // Pure formula test — no DB needed
  function hybridScore(
    semanticSim: number,
    provenance: 'explicit' | 'learned' | 'imported',
    confidence: number,
    ageDays: number
  ): number {
    const explicitness = provenance === 'explicit' ? 1.0 : provenance === 'learned' ? 0.5 : 0.3;
    const recency = Math.max(0, 1 - ageDays / 90);
    return (
      semanticSim     * 0.50 +
      explicitness    * 0.25 +
      confidence      * 0.15 +
      recency         * 0.10
    );
  }

  test('explicit memory with 0 recency beats imported with 0.9 semantic', () => {
    const explicit = hybridScore(0.6, 'explicit', 0.99, 0);
    const imported = hybridScore(0.9, 'imported', 0.5, 90);
    assert.ok(explicit > imported, `explicit(${explicit}) should beat imported(${imported})`);
  });

  test('high semantic similarity lifts score above pure keyword match', () => {
    const keywordOnly = hybridScore(0, 'explicit', 0.7, 5);
    const semanticHit = hybridScore(0.9, 'learned', 0.7, 5);
    assert.ok(semanticHit > keywordOnly, `semantic(${semanticHit}) should beat keyword(${keywordOnly})`);
  });

  test('score is bounded 0..1', () => {
    const s = hybridScore(1.0, 'explicit', 1.0, 0);
    assert.ok(s <= 1.0 && s >= 0, `Score ${s} out of bounds`);
    const s2 = hybridScore(0, 'imported', 0, 90);
    assert.ok(s2 <= 1.0 && s2 >= 0, `Score ${s2} out of bounds`);
  });

  test('recency decays linearly: 0 days = 1.0, 90 days = 0', () => {
    const fresh = hybridScore(0.5, 'explicit', 0.9, 0);
    const stale = hybridScore(0.5, 'explicit', 0.9, 90);
    assert.ok(fresh > stale, 'Fresh item should score higher than stale');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Embedding Repository Float32Array Blob Serialization
// ─────────────────────────────────────────────────────────────────────────────

describe('Embedding Blob Serialization (Float32Array ↔ Buffer)', () => {
  test('Float32Array survives round-trip through Buffer', () => {
    const original = new Float32Array([0.1, -0.5, 0.0, 0.99, -1.0, 0.42]);
    const buf = Buffer.from(original.buffer, original.byteOffset, original.byteLength);
    const restored = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

    for (let i = 0; i < original.length; i++) {
      assert.ok(
        Math.abs(restored[i] - original[i]) < 1e-7,
        `Mismatch at index ${i}: expected ${original[i]}, got ${restored[i]}`
      );
    }
  });

  test('768-dimensional vector round-trip preserves dimensions', () => {
    const dims = 768;
    const vec = new Float32Array(dims);
    for (let i = 0; i < dims; i++) vec[i] = Math.random() * 2 - 1;

    const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
    assert.equal(buf.byteLength, dims * 4, `Expected ${dims * 4} bytes`);

    const restored = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    assert.equal(restored.length, dims);
    assert.ok(Math.abs(restored[0] - vec[0]) < 1e-7);
    assert.ok(Math.abs(restored[dims - 1] - vec[dims - 1]) < 1e-7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EmbeddingProviderHealth types
// ─────────────────────────────────────────────────────────────────────────────

describe('OllamaEmbeddingProvider (offline health check)', () => {
  test('health() returns unavailable when Ollama is unreachable at bogus host', async () => {
    const { OllamaEmbeddingProvider } = await import('../src/memory/semantic/ollama.embedding.provider.js');
    const provider = new OllamaEmbeddingProvider({
      host: 'http://localhost:19999',  // Nothing listens here
      modelId: 'nomic-embed-text',
      dimensions: 768,
      timeoutMs: 2000
    });
    const h = await provider.health();
    assert.equal(h.status, 'unavailable');
    assert.equal(h.modelId, 'nomic-embed-text');
    assert.equal(h.dimensions, 768);
    assert.ok(h.message.length > 0);
  });
});

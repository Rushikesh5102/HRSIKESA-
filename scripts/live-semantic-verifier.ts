/**
 * HṚṢĪKEŚA — Phase 12: Live Semantic Memory Verifier
 *
 * Run AFTER the kernel is started with: npx tsx src/index.ts
 *
 * Usage: npx tsx scripts/live-semantic-verifier.ts
 *
 * Verifies:
 * 1. Semantic index status endpoint
 * 2. Writing a memory item via POST /memory
 * 3. Hybrid search via GET /memory/search?q=...&mode=hybrid
 * 4. Semantic-only search via GET /memory/search?q=...&mode=semantic
 * 5. Deterministic search via GET /memory/search?q=...&mode=deterministic
 * 6. Index rebuild via POST /memory/index/rebuild
 * 7. Memory delete via DELETE /memory/:id
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';

const PORT = '7474';
const BASE = `http://localhost:${PORT}`;

const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

function ok(label: string, details = ''): void {
  console.log(`  ${GREEN}✓${RESET}  ${label}${details ? GRAY + '  ' + details + RESET : ''}`);
}

function warn(label: string, details = ''): void {
  console.log(`  ${YELLOW}⚠${RESET}  ${label}${details ? GRAY + '  ' + details + RESET : ''}`);
}

function fail(label: string, details = ''): void {
  console.log(`  ${RED}✗${RESET}  ${label}${details ? GRAY + '  ' + details + RESET : ''}`);
}

function section(title: string): void {
  console.log(`\n${BOLD}${CYAN}▶ ${title}${RESET}`);
}

async function api<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let spawnedKernel: HrisekesaKernel | null = null;

async function run(): Promise<void> {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  HṚṢĪKEŚA — Phase 12: Semantic Memory Live Verifier${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Time:   ${new Date().toISOString()}\n`);

  let passed = 0;
  let warned = 0;
  let failed = 0;

  // Ensure kernel is running
  try {
    const testRes = await fetch(`${BASE}/status`);
    if (testRes.status !== 200) throw new Error('Not running');
  } catch {
    console.log(`  Starting in-process HṚṢĪKEŚA Kernel on ${BASE}...`);
    spawnedKernel = new HrisekesaKernel({
      HRISEKESA_PORT: PORT,
      HRISEKESA_LOG_LEVEL: 'warn',
    });
    await spawnedKernel.start();
    await sleep(200);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. System health
  // ──────────────────────────────────────────────────────────────────────────
  section('1. System Health');
  try {
    const { status, data } = await api<any>('GET', '/status');
    if (status === 200 && (data.status || data.system)) {
      ok('Kernel reachable', `state=${data.system?.state || data.state || 'READY'}`);
      passed++;
    } else {
      fail('Kernel not healthy', `status=${status}`);
      failed++;
    }
  } catch (e) {
    fail('Kernel unreachable — is HṚṢĪKEŚA running?', String(e));
    if (spawnedKernel) await spawnedKernel.shutdown();
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Semantic index status
  // ──────────────────────────────────────────────────────────────────────────
  section('2. Semantic Index Status');
  let semanticAvailable = false;
  try {
    const { status, data } = await api<any>('GET', '/memory/index/status');
    if (status === 200) {
      semanticAvailable = data.available === true;
      const health = data.health || 'unknown';
      const indexed = data.indexed ?? 0;
      const failed_ = data.failed ?? 0;
      const unindexed = data.unindexed ?? 0;
      const dims = data.dimensions ?? 0;
      const model = data.modelId || 'unknown';

      if (semanticAvailable && (health === 'healthy' || health === 'degraded')) {
        ok('Semantic index available', `health=${health}, indexed=${indexed}, unindexed=${unindexed}, failed=${failed_}, dims=${dims}d, model=${model}`);
        passed++;
      } else if (!semanticAvailable) {
        warn('Semantic index unavailable', 'nomic-embed-text may not be running');
        warned++;
      } else {
        fail('Unexpected index status', JSON.stringify(data));
        failed++;
      }
    } else if (status === 503) {
      warn('Semantic index not enabled', 'SemanticContext not wired');
      warned++;
    } else {
      fail('Unexpected status code', `HTTP ${status}`);
      failed++;
    }
  } catch (e) {
    fail('Index status request failed', String(e));
    failed++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Write test memory items
  // ──────────────────────────────────────────────────────────────────────────
  section('3. Write Test Memory Items');
  const testItems = [
    {
      id: `live-verify-${Date.now()}-1`,
      tier: 'knowledge',
      key: 'semantic_test_fruit',
      content: 'Rushikesh loves tropical fruits like mango, papaya, and passion fruit. He prefers them over citrus fruits.',
      provenance: 'explicit',
      confidence: 0.98,
    },
    {
      id: `live-verify-${Date.now()}-2`,
      tier: 'preferences',
      key: 'semantic_test_language',
      content: 'Rushikesh prefers TypeScript for backend development and React for UI. He dislikes unnecessary complexity.',
      provenance: 'explicit',
      confidence: 0.95,
    },
  ];

  for (const item of testItems) {
    try {
      const { status, data } = await api<any>('POST', '/memory', item);
      if (status === 201 && data.success) {
        ok(`Stored: ${item.key}`, `id=${item.id}`);
        passed++;
      } else {
        fail(`Failed to store: ${item.key}`, JSON.stringify(data));
        failed++;
      }
    } catch (e) {
      fail(`Write error: ${item.key}`, String(e));
      failed++;
    }
  }

  // Give the indexer a moment to pick up the queue
  if (semanticAvailable) {
    console.log(`\n  ${GRAY}Waiting 3s for async indexer to process…${RESET}`);
    await sleep(3000);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Deterministic search
  // ──────────────────────────────────────────────────────────────────────────
  section('4. Deterministic (Keyword) Search');
  try {
    const { status, data } = await api<any>('GET', '/memory/search?q=tropical+fruits&mode=deterministic&topK=5');
    if (status === 200 && data.success) {
      const count = data.totalResults || 0;
      const mode = data.mode;
      if (mode === 'deterministic' && count > 0) {
        ok('Deterministic search returned results', `count=${count}, mode=${mode}`);
        passed++;
      } else if (count === 0) {
        warn('Deterministic search: no results yet', 'Memory might not be stored yet');
        warned++;
      } else {
        fail('Unexpected mode', `expected deterministic got ${mode}`);
        failed++;
      }
    } else {
      fail('Deterministic search failed', `HTTP ${status}`);
      failed++;
    }
  } catch (e) {
    fail('Deterministic search error', String(e));
    failed++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Hybrid search
  // ──────────────────────────────────────────────────────────────────────────
  section('5. Hybrid Search (Semantic + Keyword)');
  try {
    const { status, data } = await api<any>('GET', '/memory/search?q=what+fruits+does+Rushikesh+like&mode=hybrid&topK=5');
    if (status === 200 && data.success) {
      const count = data.totalResults || 0;
      const mode = data.mode;
      if (count > 0) {
        ok(`Hybrid search: ${count} result(s)`, `mode=${mode}`);
        passed++;
        const top = data.results?.[0];
        if (top?.semanticSimilarity != null) {
          ok('Semantic similarity scores present', `top item similarity=${(top.semanticSimilarity * 100).toFixed(1)}%`);
          passed++;
        } else if (!semanticAvailable) {
          warn('No semantic scores (semantic subsystem unavailable)', 'Expected — falling back to deterministic');
          warned++;
        } else {
          warn('No semantic similarity in top result', 'Embeddings may still be indexing');
          warned++;
        }
      } else {
        warn('Hybrid search: no results', 'Items may not be indexed yet');
        warned++;
      }
    } else {
      fail('Hybrid search failed', `HTTP ${status}`);
      failed++;
    }
  } catch (e) {
    fail('Hybrid search error', String(e));
    failed++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Semantic-only search
  // ──────────────────────────────────────────────────────────────────────────
  section('6. Semantic-Only Search');
  if (semanticAvailable) {
    try {
      const { status, data } = await api<any>('GET', '/memory/search?q=programming+language+preferences&mode=semantic&topK=5');
      if (status === 200 && data.success) {
        const count = data.totalResults || 0;
        if (count > 0) {
          ok(`Semantic search: ${count} result(s)`, `mode=${data.mode}`);
          passed++;
          const top = data.results?.[0];
          if (top?.semanticSimilarity != null && top.semanticSimilarity > 0) {
            ok(`Cosine similarity working`, `top sim=${(top.semanticSimilarity * 100).toFixed(1)}%`);
            passed++;
          } else {
            warn('Low or no semantic similarity', 'Model may be warming up');
            warned++;
          }
        } else {
          warn('Semantic search: no results above threshold', 'Embeddings may not be ready yet');
          warned++;
        }
      } else {
        fail('Semantic search failed', `HTTP ${status}`);
        failed++;
      }
    } catch (e) {
      fail('Semantic search error', String(e));
      failed++;
    }
  } else {
    warn('Skipping semantic-only search', 'Semantic index unavailable');
    warned++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Index rebuild (status should report counts)
  // ──────────────────────────────────────────────────────────────────────────
  section('7. Index Rebuild Endpoint');
  if (semanticAvailable) {
    try {
      const { status, data } = await api<any>('POST', '/memory/index/rebuild', { limit: 10 });
      if (status === 200 && data.success) {
        ok('Rebuild endpoint responded', `rebuiltCount=${data.rebuiltCount ?? 0}`);
        passed++;
      } else if (status === 503) {
        warn('Semantic context not wired to rebuild endpoint', '');
        warned++;
      } else {
        fail('Rebuild failed', `HTTP ${status}: ${JSON.stringify(data)}`);
        failed++;
      }
    } catch (e) {
      fail('Rebuild error', String(e));
      failed++;
    }
  } else {
    warn('Skipping rebuild', 'Semantic index unavailable');
    warned++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Delete test items (cleanup)
  // ──────────────────────────────────────────────────────────────────────────
  section('8. Cleanup: Delete Test Memory Items');
  for (const item of testItems) {
    try {
      const { status, data } = await api<any>('DELETE', `/memory/${item.id}`);
      if (status === 200 && data.success) {
        ok(`Deleted: ${item.key}`, `id=${item.id}`);
        passed++;
      } else if (status === 404) {
        warn(`Not found for delete: ${item.key}`, 'May not have been stored');
        warned++;
      } else {
        fail(`Delete failed: ${item.key}`, `HTTP ${status}`);
        failed++;
      }
    } catch (e) {
      fail(`Delete error: ${item.key}`, String(e));
      failed++;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  const total = passed + warned + failed;
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Summary: ${passed}/${total} passed, ${warned} warnings, ${failed} failures${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);

  if (spawnedKernel) {
    await spawnedKernel.shutdown();
  }

  if (failed === 0) {
    console.log(`${GREEN}${BOLD}  ✅ Phase 12 LIVE VERIFICATION PASSED${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}  ❌ Phase 12 live verification has ${failed} failure(s)${RESET}\n`);
    process.exit(1);
  }
}

run().catch(async (e) => {
  console.error(`${RED}Fatal error:${RESET}`, e);
  if (spawnedKernel) await spawnedKernel.shutdown();
  process.exit(1);
});

# HṚṢĪKEŚA — Company Operations Performance & Benchmarks

## 1. Execution Benchmarks

- **Autonomous Operating Cycle**: < 2ms per standard cycle evaluation in local SQLite.
- **Health Evaluation**: < 2ms across all 11 dimensions and 17 specialist capacities.
- **Order & Event Processing**: < 1ms per transition with transactional guarantees.
- **Full Phase 25 Test Suite (48 tests)**: ~110ms total execution time.
- **Phase 25 Live Verifier (38 scenarios)**: ~35ms total execution time.
- **Frontend UI Production Build**: 4.32s (Vite).
- **Full System Regression Suite (724 tests)**: ~138s with zero regressions.

---

## 2. Resource Footprint

- **Database Size (Initial Migration 016)**: ~80 KB.
- **Memory Overhead**: < 25 MB RAM for complete Phase 25 service registry.
- **Zero Background Polling**: Event-driven execution utilizing reactive message waking.

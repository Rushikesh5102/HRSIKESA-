# HṚṢĪKEŚA (हृषीकेश) — Self-Improvement Benchmarking & Outcome Classification

## 1. Benchmarking Engine

The `ImprovementBenchmarkService` executes reproducible measurement scenarios comparing pre-change (`beforeValue`) and post-change (`afterValue`) metrics.

### Supported Metrics:
- Latency (`ms`, lower is better)
- Throughput (`ops/sec`, `req/sec`, higher is better)
- Heap Memory Footprint (`MB`, lower is better)
- CPU Utilization (`%`, lower is better)
- Cache Hit Ratio (`%`, higher is better)
- Error Rate (`%`, lower is better)

### Deterministic Outcome Classification:
- **`IMPROVED`**: Metric improvement exceeds the significant delta threshold ($\ge 5\%$).
- **`REGRESSED`**: Metric degradation exceeds the tolerance threshold ($\ge 5\%$).
- **`UNCHANGED`**: Metric delta is within normal noise tolerance ($< 5\%$).
- **`INCONCLUSIVE`**: High measurement variance or unstable environment conditions.

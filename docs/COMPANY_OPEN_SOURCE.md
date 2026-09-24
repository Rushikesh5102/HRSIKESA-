# HṚṢĪKEŚA — Company Open Source & Local Deployment Architecture

## 1. Local-First Design

HṚṢĪKEŚA operates 100% locally on standard hardware:
- **Persistence**: Embedded SQLite in WAL mode (`better-sqlite3`).
- **Workforce**: Fully offline capable with local Ollama or fallback heuristic planning.
- **Micro-Kernel**: Lightweight Node.js / TypeScript runtime without external daemon dependencies.
- **Frontend UI**: Single-Page Application (React + Vite + Vanilla CSS tokens).

---

## 2. Zero Vendor Lock-In

- Compatible with any local or cloud LLM provider via typed adapter interfaces.
- Standard SQL schemas with zero proprietary DB extensions.
- Auditable file artifacts stored directly on the host operating system.

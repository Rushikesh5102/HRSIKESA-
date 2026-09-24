# Vision Privacy & Desktop Frame Management

## Overview

Desktop screenshots and webcam feeds often contain confidential documents, private messages, and personal credentials. The Vision Privacy policy enforces bounded capture, local execution by default, and strict retention limits.

---

## 1. Privacy Tiers

| Tier | Policy | Allowed Models |
|------|--------|----------------|
| `PUBLIC` | Open web pages, generic public UI | Local & Authorized Cloud |
| `PRIVATE` | Active desktop, code editor, documents | Local by default; Cloud only with explicit user authorization |
| `HIGHLY_PRIVATE` | Password managers, banking, sensitive config | Strict local models only |
| `RESTRICTED` | Sovereign secrets, encrypted credentials | Strict local models only; Zero persistence |

---

## 2. Opt-in Camera Lifecycle

Webcam capture is strictly user-controlled:
- **Default State:** `OFF`
- **Transitions:** `OFF` $\rightarrow$ `READY` $\rightarrow$ `ACTIVE` $\rightarrow$ `OFF`
- Continuous streaming is disabled by default.

---

## 3. Ephemeral Image Retention

Temporary screenshots and processed frames are released immediately after OCR and inference inspection. Only structured metadata (bounding boxes, element counts, verification outcomes) are persisted in SQLite.

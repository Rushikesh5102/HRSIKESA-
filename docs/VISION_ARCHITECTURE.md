# Vision Architecture & UIA-First Perception

## Overview

The HṚṢĪKEŚA Vision Architecture balances low-latency deterministic UI Automation with OCR and visual multimodal reasoning.

---

## 1. UIA-First Perception Hierarchy

For Windows desktop operations, native accessibility APIs provide instantaneous, deterministic information without incurring heavy GPU or model reasoning costs.

```
       USER INQUIRY / ACTION TARGET
                    ↓
   Stage 1: Windows UI Automation (UIA)
   [Accessible Name, AutomationId, Role, Coordinates]
                    ↓ (If not found or canvas UI)
   Stage 2: Learned UI Patterns
   [Cached element selectors, application signatures]
                    ↓ (If dynamic/unlabeled)
   Stage 3: Local OCR Text & Bounding Box
   [Text pattern match, pixel bounding coordinates]
                    ↓ (If complex visual understanding needed)
   Stage 4: Vision Reasoning Model (VLM)
   [Spatial layout, color, visual relationship analysis]
                    ↓ (If all previous fail)
   Stage 5: Coordinate Fallback (Requires confirmation)
```

---

## 2. Visual Target Grounding

A Vision model is treated strictly as an **advisory component**. It proposes targets; the `ComputerOperator` independently validates target bounds before dispatching mouse or keyboard actions:

1. Target coordinates must lie strictly within valid application window bounds.
2. Coordinates within disallowed sensitive zones (e.g. ad banners, close window buttons) are blocked.
3. Target must have verified accessibility or OCR confirmation before physical actuation.

---

## 3. Visual State Progression & Comparison

Observations before and after actions are compared using `compareObservations`:

- `UNCHANGED`: No detected visual or OCR change.
- `CHANGED`: Screen content changed, but expected post-condition was not specified.
- `EXPECTED_CHANGE`: All expected keywords and state assertions satisfied.
- `UNEXPECTED_CHANGE`: Changes detected, but expected confirmation keywords are missing.

---

## 4. Security Challenge & Error Detection

The Vision Engine scans OCR summaries and UIA element names to automatically detect and flag security gates:
- **`CAPTCHA`**: reCAPTCHA, hCaptcha, Cloudflare turnstile.
- **`MFA`**: 2FA prompt, OTP input, Authenticator challenge.
- **`LOGIN_PROMPT`**: User credential input, master password dialog.
- **`CRASH`**: Fatal crash, Unhandled exception, Windows error reporting.

All security challenges trigger sovereign pause (`NEEDS_USER`) and never attempt automatic bypass.

# HṚṢĪKEŚA — Pronunciation Engine Specification

## 1. The Core Problem: HṚṢĪKEŚA Pronunciation

### Root Cause Analysis
The canonical brand name is:

**HṚṢĪKEŚA** (Devanagari: **हृषीकेश**)

Previous voice implementations failed for two key reasons:
1. **Unicode Diacritics**: Standard English TTS engines (Piper via `espeak-ng` and Windows SAPI) encounter characters with diacritical marks (`Ṛ`, `Ṣ`, `Ī`, `Ś`) and all-caps formatting.
2. **Letter-by-Letter Spelling**: SAPI treats all-caps tokens with unknown glyphs as an acronym, reading them aloud as:
   *"H R S I K E S A"* instead of the sacred Sanskrit title *"hṛ-ṣī-ke-śa"*.
3. **Disjointed Glottal Sounds**: `espeak-ng` misparses individual combining characters into abrupt glottal stops.

---

## 2. The Solution: Visual Integrity vs Acoustic Normalization

### Golden Rule: Never Alter Visible Text
The user interface and database records must **NEVER** replace `HṚṢĪKEŚA` with `Hrishikesha`. The sacred brand spelling remains canonical in all text views.

### Engine-Specific Acoustic Abstraction
Transformation occurs strictly in memory at the moment of audio synthesis:

```
Canonical Text (UI):
"HṚṢĪKEŚA is ready."
        ↓
PronunciationNormalizer (Unicode Word-Boundary Regex)
        ↓
For Piper Engine (phonetic respelling):
"Hrishikesha is ready."

For Windows SAPI (SSML alias substitution):
"<sub alias=\"Hrishikesha\">HṚṢĪKEŚA</sub> is ready."
        ↓
Acoustic Output: Continuous, natural, Sanskrit-aligned "hṛ-ṣī-ke-śa"
```

---

## 3. Provider-Independent Pronunciation Representation

```typescript
export interface PronunciationEntry {
  readonly canonical: string;
  readonly aliases: readonly string[];
  readonly language?: string;
  readonly phoneticVariants: {
    sanskrit?: string;
    hindi?: string;
    marathi?: string;
    english?: string;
    ipa?: string;
    sapiPhoneme?: string;
    piperPhonetic?: string;
    plainPhonetic?: string;
  };
  readonly priority: 'PROTECTED' | 'CUSTOM' | 'USER_OVERRIDE';
  readonly category: 'BRAND' | 'AGENT' | 'SANSKRIT' | 'TECHNICAL' | 'USER_DEFINED';
  readonly syllableBreakdown?: string;
  readonly description?: string;
}
```

---

## 4. Protected Vocabulary

The persistent repository (`data/pronunciations.json`) seeds and protects core tokens against deletion or unintended overwriting:

| Canonical | Category | Phonetic Variant (Piper) | SAPI SSML Substitution |
| :--- | :--- | :--- | :--- |
| **HṚṢĪKEŚA** | BRAND | `Hrishikesha` | `<sub alias="Hrishikesha">HṚṢĪKEŚA</sub>` |
| **SAHIKARA** | BRAND | `Saa-hee-kaa-ruh` | `<sub alias="Sahikara">SAHIKARA</sub>` |
| **Gāṇḍīva** | AGENT | `Gaan-dee-vuh` | `<sub alias="Gandiva">Gāṇḍīva</sub>` |
| **KĀLA** | AGENT | `Kaa-luh` | `<sub alias="Kaala">KĀLA</sub>` |
| **Mṛtyu** | AGENT | `Mrit-yoo` | `<sub alias="Mrityu">Mṛtyu</sub>` |
| **Rāhu** | AGENT | `Raa-hoo` | `<sub alias="Rahu">Rāhu</sub>` |
| **Ṛtvan** | AGENT | `Rit-vun` | `<sub alias="Ritvan">Ṛtvan</sub>` |
| **Spooṭa** | AGENT | `Spoo-tuh` | `<sub alias="Spoota">Spooṭa</sub>` |
| **Vighna** | AGENT | `Vig-nuh` | `<sub alias="Vighna">Vighna</sub>` |

---

## 5. User-Taught Pronunciations

Users can teach HṚṢĪKEŚA custom terms via voice or Settings UI:
- *"Pronounce Kevala like Kay-vuh-luh"*
- API: `POST /voice/pronunciations`
- Saved persistently to `data/pronunciations.json` with `USER_DEFINED` category.

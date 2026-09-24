# HṚṢĪKEŚA — Multilingual & Code-Switching Architecture

## 1. Supported Languages & Architectural Coverage

HṚṢĪKEŚA architects first-class support for 12 languages, prioritizing the Indic cultural continuum:

1. **English (`en`)**: Sovereign primary interface language.
2. **Hindi (`hi`)**: Devanagari script, Indic national lingua franca.
3. **Marathi (`mr`)**: Devanagari script, regional state language of Maharashtra.
4. **Sanskrit (`sa`)**: Sacred root terminology, agent names, and canonical identity.
5. **Bengali (`bn`)**: Eastern Indic script.
6. **Gujarati (`gu`)**: Western Indic script.
7. **Tamil (`ta`)**: Dravidian script.
8. **Telugu (`te`)**: Dravidian script.
9. **Kannada (`kn`)**: Dravidian script.
10. **Malayalam (`ml`)**: Dravidian script.
11. **Punjabi (`pa`)**: Gurmukhi script.
12. **Urdu (`ur`)**: Perso-Arabic script.

---

## 2. Sub-Millisecond Automatic Language Identification

Language detection must not block speech turnarounds. `LanguageDetector` avoids heavyweight machine learning dependencies for script classification by utilizing a sub-millisecond Unicode character block distribution counter:

- **Latin** (`U+0000` - `U+007F`, `U+0080` - `U+024F`) $\rightarrow$ English
- **Devanagari** (`U+0900` - `U+097F`) $\rightarrow$ Disambiguated into Marathi / Hindi / Sanskrit
- **Bengali** (`U+0980` - `U+09FF`) $\rightarrow$ Bengali
- **Gurmukhi** (`U+0A00` - `U+0A7F`) $\rightarrow$ Punjabi
- **Gujarati** (`U+0A80` - `U+0AFF`) $\rightarrow$ Gujarati
- **Tamil** (`U+0B80` - `U+0BFF`) $\rightarrow$ Tamil
- **Telugu** (`U+0C00` - `U+0C7F`) $\rightarrow$ Telugu
- **Kannada** (`U+0C80` - `U+0CFF`) $\rightarrow$ Kannada
- **Malayalam** (`U+0D00` - `U+0D7F`) $\rightarrow$ Malayalam
- **Arabic / Urdu** (`U+0600` - `U+06FF`) $\rightarrow$ Urdu

---

## 3. Devanagari Disambiguation (Marathi vs Hindi vs Sanskrit)

Because Marathi, Hindi, and Sanskrit share the Devanagari script, `LanguageDetector` performs morpheme scoring:

- **Marathi Morphemes**: `आहे`, `नाही`, `काय`, `कसे`, `आहोत`, `केले`, `होते`, `तुम्ही`, `आपण`, `करूया`, `पाहिजे`.
- **Hindi Morphemes**: `है`, `नहीं`, `क्या`, `कैसे`, `हैं`, `किया`, `था`, `आप`, `हम`, `करेंगे`, `चाहिए`.
- **Sanskrit Morphemes**: `अस्ति`, `नास्ति`, `भवति`, `नमः`, `वदतु`, `कुरु`, `शान्तिः`, `सत्यम्`, `धर्मः`.

---

## 4. Indian Code-Switching Handling

Indian conversational speech frequently combines Indic phrasing with English terminology:
- *"Rishi, आज आपण SAHIKARA project वर काम करूया."*
- *"हृषीकेश, search the latest information and summarise कर."*

The engine:
1. Calculates character and word ratios across scripts (`primaryProportion`).
2. If Latin script constitutes $\ge 15\%$ of an Indic utterance, flags `isCodeSwitched = true` with `secondaryLanguage = 'en'`.
3. Preserves original words verbatim without forcing unintended machine translation.
4. Normalizes technical and brand terms while allowing the TTS voice to pronounce both languages smoothly.

---

## 5. Spoken Voice Commands

Users can override language and voice behavior via natural speech:
- *"Speak in Marathi"* / *"मराठीत बोला"* $\rightarrow$ switches default profile to Marathi.
- *"Switch to Hindi"* / *"हिंदी में बोलो"* $\rightarrow$ switches default profile to Hindi.
- *"Speak slower"* / *"हळू बोला"* $\rightarrow$ decreases speaking rate by 0.2x.
- *"Speak faster"* / *"जलद बोला"* $\rightarrow$ increases speaking rate by 0.2x.
- *"Stop"* / *"थांब"* $\rightarrow$ immediate barge-in interruption.

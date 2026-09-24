# HṚṢĪKEŚA Source & Evidence Provenance Model
## Classification, Credibility Tiering, and Citation Architecture

---

### 1. Source Classification Hierarchy

HṚṢĪKEŚA classifies all acquired materials into structured Source Types:

| Source Type | Description | Default Credibility Tier |
|---|---|---|
| `OFFICIAL_DOCUMENTATION` | Official framework / platform documentation | `AUTHORITATIVE` |
| `OFFICIAL_REPOSITORY` | Official GitHub / GitLab / Git repositories | `AUTHORITATIVE` |
| `ACADEMIC_PAPER` | Peer-reviewed papers, arXiv pre-prints, university publications | `AUTHORITATIVE` |
| `GOVERNMENT` | Regulatory bodies, standards organizations, `.gov` domains | `AUTHORITATIVE` |
| `COMPANY` | Primary corporate / author landing pages | `PRIMARY` |
| `NEWS` | Technical journalism, industry news publications | `SECONDARY` |
| `BLOG` | Technical articles, developer tutorials | `SECONDARY` |
| `FORUM` | Community forums, Reddit, StackOverflow, discussions | `COMMUNITY` |
| `SEARCH_RESULT` | Uncategorized public web pages | `UNVERIFIED` |
| `USER_PROVIDED` | Documents or seed files provided directly by Master Rushikesh | `PRIMARY` |

---

### 2. Source Freshness Standards

Temporal validity is computed automatically from publication metadata:
- **`CURRENT`**: Published within the last 30 days.
- **`RECENT`**: Published within the last 180 days.
- **`DATED`**: Published between 180 days and 2 years ago.
- **`HISTORICAL`**: Published more than 2 years ago.
- **`UNKNOWN`**: Publication date could not be established from meta tags or HTTP headers.

---

### 3. Claim Classification Typology

Atomic evidence items are categorized into four epistemic types:

1. **`FACT`**: Verifiable empirical statements containing specific metrics, versions, licenses, benchmarks, or explicit documentation assertions.
   - *Example:* "Repository is licensed under Apache-2.0 and has 12,000 stars."
2. **`CLAIM`**: Subjective or uncorroborated assertions made by an author.
   - *Example:* "Framework X offers lower configuration overhead."
3. **`INFERENCE`**: Probabilistic conclusions or deduced patterns.
   - *Example:* "Active commit frequency suggests ongoing maintenance."
4. **`OPINION`**: Expressive commentary or preference.
   - *Example:* "The author considers this interface the most intuitive."

---

### 4. Verification & Contradiction Resolution

Findings are assigned deterministic statuses based on cross-source consensus:

```
[Single Source]                       --> UNVERIFIED
[>= 2 Independent Domains]            --> CORROBORATED
[>= 2 Independent + Authoritative]    --> CONFIRMED
[Contradictory Statements Found]       --> CONFLICTING
[Insufficient Data]                   --> INSUFFICIENT_EVIDENCE
```

When conflicting evidence is detected (e.g. Version 1.2 vs Version 2.0; Windows Supported vs Unsupported), HṚṢĪKEŚA reports the discrepancy explicitly in the report's **Conflicts and Discrepancies** section without guessing.

---

### 5. Citation Schema

Every substantive finding references its underlying sources via 1-indexed citation tags (`[1]`, `[2]`). Each citation resolves to:
- Source Index Number
- Source Title & Domain
- Canonical URL
- Retrieval Timestamp
- Credibility Tier
- Freshness Status

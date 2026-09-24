# HṚṢĪKEŚA — Model & Provider Registry Specification

## 1. Provider Registry Schema

```typescript
export interface ProviderRecord {
  readonly provider: IModelProvider;
  health: ProviderHealth;
  models: ModelMetadata[];
  enabled: boolean;
  lastRefreshedAt: string;
}

export interface ProviderHealth {
  readonly status: 'healthy' | 'degraded' | 'unreachable' | 'unconfigured' | 'disabled';
  readonly message: string;
  readonly latencyMs?: number;
  readonly checkedAt: string;
}
```

### Supported Providers:
1. **Ollama Local Engine (`ollama`)**:
   - `isLocal: true`
   - Default Endpoint: `http://127.0.0.1:11434`
   - Zero-cost, 100% offline sovereign privacy.
2. **OpenAI Cloud Gateway (`openai`)**:
   - `isLocal: false`
   - Models: `gpt-4o`, `gpt-4o-mini`, `o1-preview`, `o3-mini`.
3. **Anthropic Claude Gateway (`anthropic`)**:
   - `isLocal: false`
   - Models: `claude-3-5-sonnet`, `claude-3-5-haiku`, `claude-3-opus`.
4. **Google Gemini Gateway (`gemini`)**:
   - `isLocal: false`
   - Models: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`.

---

## 2. Model Metadata Schema

```typescript
export interface ModelMetadata {
  readonly id: string;
  readonly providerId: string;
  readonly displayName: string;
  readonly isLocal: boolean;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly capabilities: readonly ModelCapability[];
  readonly costClassification: 'free-local' | 'pay-per-token';
  readonly pricing?: {
    readonly promptPerMillionUsd: number;
    readonly completionPerMillionUsd: number;
  };
  readonly latencyClass?: 'FAST' | 'MODERATE' | 'SLOW';
  readonly costClass?: 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
  readonly privacyClass?: 'LOCAL_PRIVATE' | 'CLOUD_AUTHORIZED';
  readonly availability: boolean;
  readonly statusText: string;
  readonly priority: number;
  readonly supportsTools?: boolean;
  readonly supportsStructuredOutput?: boolean;
  readonly supportsVision?: boolean;
  readonly supportsReasoning?: boolean;
}
```

---

## 3. HTTP REST API Endpoints

- `GET /models` — Returns all registered providers and full enriched model catalog.
- `GET /models/health` — Returns real-time health diagnostics for all providers and models.
- `GET /models/:id` — Lookup specific model by ID or name.
- `GET /providers` — List all registered providers.
- `GET /providers/:id` — Details for specific provider.
- `GET /routing/policy` — Returns active routing policy, weights, and cost threshold.
- `POST /routing/policy` — Updates active routing policy and weight configuration.
- `POST /routing/preview` — Simulates routing decision without executing model inference.
- `GET /routing/usage` — Returns aggregated token and cost telemetry + recent audit records.
- `POST /models/refresh` — Triggers an immediate re-poll of all providers.

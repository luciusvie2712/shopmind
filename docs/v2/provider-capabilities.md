# AI provider capability matrix

| Capability | Gemini primary | Secondary |
|---|---:|---:|
| Structured generation | yes | BLOCKED_EXTERNAL_PROVIDER_SELECTION |
| Tool calling | yes | BLOCKED_EXTERNAL_PROVIDER_SELECTION |
| Review summarization | yes | BLOCKED_EXTERNAL_PROVIDER_SELECTION |
| Text embeddings | yes, separate abstraction | not selected |
| Streaming | provider path pending Phase 16.6 | not selected |
| Multimodal embeddings | pending Phase 16.7 validation | not selected |

The router falls back once only for timeout or provider-unavailable errors and retains the total `AI_FALLBACK_TOTAL_TIMEOUT_MS` budget. Invalid ShopMind input/output, authorization, business-rule, grounding, and tool-validation errors never trigger fallback.

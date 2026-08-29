# ADR 004: AI provider fallback

Status: Accepted

Decision type: DERIVED; concrete secondary vendor remains externally selectable.

A provider-neutral router wraps the existing `AiProvider`. Capabilities are declared per operation. Fallback is attempted once only for timeout, transient availability, or configured quota/rate failures, within a total timeout budget. It is not attempted for ShopMind auth/business errors or invalid application input. Every provider output passes the same schemas, tool authorization, candidate grounding, and read-only checks. Embeddings have a separate capability policy.

Consequences: Gemini remains primary; deterministic non-LLM fallbacks remain the final degradation path. Provider/model/fallback reason are observable without prompts or secrets.

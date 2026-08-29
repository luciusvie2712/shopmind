# ADR 008: SSE protocol and reconnect behavior

Status: Accepted

Decision type: DERIVED.

The existing authenticated non-streaming assistant remains available. The streaming endpoint emits only `message.start`, `message.delta`, bounded `tool.start`/`tool.complete`, `message.done`, `error`, and heartbeat events. It never exposes prompts, raw tool payloads, secrets, or hidden reasoning. A client request ID identifies one turn; only a completed final assistant message is persisted. Disconnect aborts work where possible. Retrying an incomplete turn uses the same request identity and must not create duplicate final messages.

Consequences: the frontend can fall back to non-streaming and production topology must be smoke-tested before PASS.

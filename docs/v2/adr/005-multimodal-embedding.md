# ADR 005: Multimodal embedding and indexing

Status: Accepted

Decision type: DERIVED.

The first release accepts transient JPEG or PNG uploads up to 5 MiB and verifies content signatures rather than filenames. It stores no user upload. On 2026-08-29, official Gemini Embedding 2 documentation confirms that text and image inputs share one embedding space and support configured 768-dimensional output. Query-image embeddings are therefore compared with existing canonical product text embeddings for the first release; a separate asset table is deferred until evaluation proves image-derived catalog embeddings materially improve relevance.

Consequences: multimodal failure cannot break text search; vector SQL remains parameterized in a dedicated repository.

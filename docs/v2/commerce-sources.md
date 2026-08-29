# Commerce product sources

Ingestion now depends on `ProductSourceProvider`, not DummyJSON's response shape. A source adapter owns authentication, paging/cursor semantics, payload validation, normalization, timeouts, and provider errors. Canonical persistence continues to use `(source, external_id)`, `content_hash`, `source_status`, cache invalidation, and deterministic embedding jobs.

DummyJSON remains the selected local/demo provider through `PRODUCT_SOURCE_PROVIDER=dummyjson`. No real vendor/account exists in the repository, so a non-DummyJSON adapter and production smoke remain `BLOCKED_EXTERNAL_PROVIDER_SELECTION`. Selecting a provider must define its base URL, credential secret, pagination contract, rate policy, and fixture without leaking vendor types into public contracts.

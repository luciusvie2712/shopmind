# Event taxonomy and privacy

Only these behavior events are accepted in v2.1:

| Event | Required product | When recorded |
|---|---:|---|
| `PRODUCT_VIEW` | yes | Product detail mounts once per browser session/product. |
| `SEARCH_RESULT_CLICK` | yes | A product link is followed from a catalog query. |
| `ADD_TO_CART` | yes | The authoritative cart mutation succeeds. |
| `RECOMMENDATION_IMPRESSION` | yes | A personalized recommendation becomes part of the rendered section, once per response/product. |
| `RECOMMENDATION_CLICK` | yes | A product is opened from the personalized recommendation section. |

Metadata is allowlisted to `surface`, numeric `position`, and a SHA-256 `queryHash`. Raw search text, prompts, email, user IDs, credentials, tokens, and payment data are prohibited. Authentication is optional for public discovery events; when present, identity comes exclusively from the verified access token. A client UUID is the idempotency key.

Telemetry is best-effort and must never block navigation or commerce. Redis rate limiting fails open so an infrastructure outage does not break core UX; persistence failures are swallowed only by the browser telemetry boundary and remain observable in API logs.

Raw event retention is 180 days. Cleanup must run as a bounded maintenance operation; aggregate reporting should prefer the minimum useful window.

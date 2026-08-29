# v2 testing

Each release wave runs targeted feature tests followed by the complete MVP regression and production builds. Integration tests use real PostgreSQL/pgvector and Redis through the repository-provided runners. Production-only checks are never marked PASS from local mocks.

Required release evidence includes lint, typecheck, unit, integration, browser E2E, AI evaluation, builds, migration validation, and the final production smoke checklist.

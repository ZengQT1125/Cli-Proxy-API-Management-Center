# OpenAI Cache Write Pricing Design

## Root cause

The backend usage parsers already capture cache creation/write tokens in
`usage.Detail.CacheCreationTokens`. The fork-specific persistence and monitor
layers discard that value, so the frontend cannot calculate cache write cost.
Separately, the frontend OpenAI price table is hand-maintained and resolves
aliases before exact model prices, which makes some exact definitions dead.

## Scope

- Synchronize every priced model under `openai.models` from
  `https://models.dev/api.json` into a generated TypeScript snapshot.
- Support input, output, cache read, cache write, and context-tier prices.
- Persist cache write tokens in SQLite and PostgreSQL usage records.
- Propagate cache write tokens through imports, exports, monitor queries, and
  management monitor responses wherever cached tokens are already exposed.
- Calculate request and aggregate costs without charging cache read/write
  tokens again as ordinary input.

## Backend design

`usage.Detail.CacheCreationTokens` remains the canonical upstream value. At
the persistence boundary it maps to `UsageRecord.CacheWriteTokens`, stored in
the `cache_write_tokens` column. Existing databases add the column with a
default of zero; historical records therefore remain valid without inventing
data that was never stored.

The existing `cached_tokens` field continues to mean cache reads. The Claude
usage parser must stop copying cache creation tokens into `CachedTokens` when
there are no cache reads. Every monitor structure and SQL aggregation that
currently carries `cached_tokens` also carries `cache_write_tokens`.

No translator changes are required: executor usage helpers already parse
`cache_write_tokens`, `cache_creation_tokens`, and Claude
`cache_creation_input_tokens`.

## Frontend design

A Node script fetches and validates `models.dev/api.json`, then writes a
deterministically sorted generated TypeScript module. The application never
fetches pricing at runtime. The generated model entries carry their own tier
thresholds instead of relying on hard-coded model-name checks.

`calculateModelCost` accepts total input, output, cache read, and cache write
counts. It subtracts both cache classes from total input, clamps the ordinary
input count at zero, and charges each class exactly once. Exact model lookup
runs before aliases and fuzzy prefixes.

Experimental service tiers are outside scope because monitor records do not
currently identify the pricing mode reliably. Missing cache write prices fall
back to the ordinary input price, which preserves a complete accounting path
without treating cache writes as free.

## Data contract

The monitor API adds `cache_write_tokens` next to `cached_tokens`. Missing
fields from older servers normalize to zero in the frontend. Request logs,
channel/model aggregates, KPI data, hourly token data, and request details use
the same field name.

## Verification

- Backend parser regression proves cache creation is not reported as cache
  read.
- Backend store tests prove schema migration and persistence round trips.
- Backend monitor query/handler tests prove aggregation and JSON output.
- Frontend contract tests prove normalization and GPT-5.6 cache write pricing,
  including the 272k context tier.
- Run frontend monitor tests, typecheck/build/lint, backend focused tests, full
  `go test ./...`, and the required server build.

# OpenAI Cache Write Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize OpenAI pricing from models.dev and carry cache write tokens from upstream usage parsing through backend persistence and monitor APIs into frontend cost calculation.

**Architecture:** The Go backend keeps `usage.Detail.CacheCreationTokens` as the provider-neutral source value and maps it to `cache_write_tokens` at persistence/API boundaries. The React frontend consumes a generated, deterministic pricing snapshot and calculates ordinary input, cache read, and cache write charges exactly once.

**Tech Stack:** Go 1.26, SQLite, PostgreSQL, Gin, React 19, TypeScript 5.9, Node.js test runner, Vite.

## Global Constraints

- Do not modify `internal/translator/`; executor usage helpers already expose cache creation tokens.
- Keep runtime pricing independent of `models.dev` availability.
- Reuse existing backend and frontend test files.
- Test public data contracts and calculations, not source layout or helper delegation.
- Existing persisted records get `cache_write_tokens = 0`; do not fabricate historical usage.

---

### Task 1: Preserve cache write tokens in backend usage records

**Files:**
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/runtime/executor/helps/usage_helpers.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/runtime/executor/helps/usage_helpers_test.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/logger_plugin.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/logger_plugin_test.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/database_plugin.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/database_plugin_test.go`

**Interfaces:**
- Consumes: `usage.Detail.CacheCreationTokens int64`.
- Produces: `TokenStats.CacheWriteTokens int64` and `UsageRecord.CacheWriteTokens int64`.

- [ ] **Step 1: Add failing parser and plugin tests**

Assert that Claude usage with only `cache_creation_input_tokens` leaves `CachedTokens == 0` and sets `CacheCreationTokens`, and that logger/database records retain the write count as `CacheWriteTokens`.

- [ ] **Step 2: Run focused tests and verify RED**

Run `go test ./internal/runtime/executor/helps ./internal/usage`.
Expected: failures showing cache creation copied into cached reads and missing cache write fields in persisted/plugin records.

- [ ] **Step 3: Implement the minimal mappings**

Remove the Claude fallback that assigns `CacheCreationTokens` to `CachedTokens`. Add `CacheWriteTokens int64` to internal logger/persistence structures and map:

```go
CacheWriteTokens: record.Detail.CacheCreationTokens,
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run `go test ./internal/runtime/executor/helps ./internal/usage` and expect PASS.

### Task 2: Migrate SQLite/PostgreSQL persistence

**Files:**
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/store.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/store_test.go`

**Interfaces:**
- Consumes: `UsageRecord.CacheWriteTokens`.
- Produces: `cache_write_tokens BIGINT/INTEGER NOT NULL DEFAULT 0` in both stores.

- [ ] **Step 1: Add failing persistence and migration tests**

Extend existing SQLite store tests to insert a record with cache write tokens, read it back, and verify an old schema gains the column with historical rows at zero.

- [ ] **Step 2: Run store tests and verify RED**

Run `go test ./internal/usage -run 'TestSQLiteUsageStore'` and expect missing field/column failures.

- [ ] **Step 3: Add schema, insert, batch, mirror, and read support**

Add the column to new schemas and idempotent migrations:

```sql
ALTER TABLE usage_records ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0
```

Update every `INSERT`, `SELECT`, and `Scan` tuple that carries token fields so the field ordering remains identical between PostgreSQL and SQLite.

- [ ] **Step 4: Run store tests and verify GREEN**

Run `go test ./internal/usage -run 'TestSQLiteUsageStore'` and expect PASS.

### Task 3: Expose cache write tokens from monitor APIs

**Files:**
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/monitor_queries.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/usage/monitor_queries_test.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/api/handlers/management/monitor.go`
- Modify: `/Users/caidaoli/Source/go/CLIProxyAPI/internal/api/handlers/management/monitor_test.go`

**Interfaces:**
- Consumes: persisted `cache_write_tokens`.
- Produces: JSON field `cache_write_tokens` beside `cached_tokens` in request, channel/model, KPI, hourly, and detail responses.

- [ ] **Step 1: Add failing query and handler contract tests**

Insert successful records with non-zero `CacheWriteTokens`; assert request-log, channel/model, KPI, hourly-token, model-distribution, and request-detail values. Parse handler JSON and assert numeric structure.

- [ ] **Step 2: Run monitor tests and verify RED**

Run `go test ./internal/usage ./internal/api/handlers/management -run 'Monitor'`.
Expected: missing cache write aggregates/JSON fields.

- [ ] **Step 3: Implement SQL aggregation and response mappings**

For every query that currently selects or sums `cached_tokens`, add the parallel expression:

```sql
COALESCE(SUM(CASE WHEN failed=0 THEN cache_write_tokens ELSE 0 END), 0)
```

Add `CacheWriteTokens int64` with JSON name `cache_write_tokens` to response types and copy the value through in-memory fallback aggregation.

- [ ] **Step 4: Run monitor tests and verify GREEN**

Run the focused command above and expect PASS.

### Task 4: Generate the OpenAI pricing snapshot

**Files:**
- Create: `scripts/update-openai-pricing.mjs`
- Create: `src/data/openaiPricing.generated.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `https://models.dev/api.json` at `openai.models`.
- Produces: `openAIModelPricing: Record<string, ModelPricing>` with input, output, cache read/write, and optional context tier fields.

- [ ] **Step 1: Implement the deterministic generator**

Generated files are an allowed TDD exception. The script rejects missing provider/model/cost objects and non-finite or negative numeric prices, sorts model IDs, and serializes the first context-size tier from `cost.tiers`.

- [ ] **Step 2: Add the package command and generate the snapshot**

Add `"pricing:update:openai": "node scripts/update-openai-pricing.mjs"` to `package.json`. Run it twice; expect 52 entries and no generated-file diff on the second run.

### Task 5: Calculate cache write cost in the frontend

**Files:**
- Modify: `src/utils/costCalculator.ts`
- Modify: `src/utils/monitor.ts`
- Modify: `tests/monitorKpiContract.test.ts`

**Interfaces:**
- Consumes: generated pricing and total input/output/cache read/cache write.
- Produces: `calculateModelCost(model, input, output, cacheRead, cacheWrite, options)`.

- [ ] **Step 1: Add failing public calculation tests**

Add assertions for GPT-5.6 base price and >272k tier, an o-series model, an embedding model, exact-model precedence, and input clamping when cache counts exceed total input.

- [ ] **Step 2: Run frontend contract tests and verify RED**

Run `node --test tests/monitorKpiContract.test.ts`; expect missing parameter, model, or wrong-cost failures.

- [ ] **Step 3: Implement generated pricing merge and formula**

Extend `ModelPricing` with `cacheWritePrice`, `cacheWritePriceHigh`, and `tierThreshold`. Resolve exact prices before aliases. Calculate:

```ts
const ordinaryInput = Math.max(input - cacheRead - cacheWrite, 0);
return (
  ordinaryInput * inputPrice +
  output * outputPrice +
  cacheRead * cacheReadPrice +
  cacheWrite * cacheWritePrice
) / 1_000_000;
```

Use explicit cache prices when present; cache read retains its existing model fallback and cache write falls back to the active input price.

- [ ] **Step 4: Run contract tests and verify GREEN**

Run `node --test tests/monitorKpiContract.test.ts`; expect PASS.

### Task 6: Carry the monitor API field through the frontend

**Files:**
- Modify: `src/services/api/monitor.ts`
- Modify: `src/utils/monitor.ts`
- Modify: `src/components/monitor/ChannelStats.tsx`
- Modify: `src/components/monitor/RequestLogs.tsx`
- Modify: `tests/monitorKpiContract.test.ts`

**Interfaces:**
- Consumes: optional backend JSON `cache_write_tokens`.
- Produces: zero-normalized frontend model and correct request/aggregate costs.

- [ ] **Step 1: Add failing normalization and aggregation tests**

Extend existing fixtures with cache write counts and assert filtered channel, model-distribution, request, and aggregate costs. Also assert missing fields normalize to zero.

- [ ] **Step 2: Run tests and verify RED**

Run `node --test tests/monitorKpiContract.test.ts`; expect missing field/cost failures.

- [ ] **Step 3: Add the field and pass it to cost calculation**

Add `cache_write_tokens` beside every existing `cached_tokens` API property. Normalize arrays/numbers to zero and pass cache write counts from request logs and channel/model aggregates into `calculateModelCost`.

- [ ] **Step 4: Run tests and verify GREEN**

Run `node --test tests/monitorKpiContract.test.ts`; expect PASS.

### Task 7: Full verification

**Files:**
- Verify all modified files in both repositories.

- [ ] **Step 1: Format and inspect diffs**

Run `gofmt -w` on modified Go files and Prettier on modified frontend source, then inspect `git diff --check` and both repository diffs.

- [ ] **Step 2: Verify frontend**

Run:

```bash
node --test tests/monitorKpiContract.test.ts
npm run type-check
npm run lint
npm run build
```

- [ ] **Step 3: Verify backend**

Run:

```bash
go test ./internal/runtime/executor/helps ./internal/usage ./internal/api/handlers/management
go test ./...
go build -o test-output ./cmd/server && rm test-output
```

- [ ] **Step 4: Re-run the pricing generator stability check**

Run `npm run pricing:update:openai` twice and confirm the second run leaves no generated-file diff.

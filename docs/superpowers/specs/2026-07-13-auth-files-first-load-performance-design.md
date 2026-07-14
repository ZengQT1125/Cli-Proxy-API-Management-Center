# Auth Files First-Load Performance Design

## Root cause

The authentication file page currently requests every credential from
`GET /v0/management/auth-files`, even though it renders only one page of cards.
With 1,037 credentials, the current response contains 20 recent-request buckets
per credential. The measured payload is 1,796,528 bytes before gzip and 78,394
bytes after gzip. Removing those buckets reduces the payload to 821,747 bytes
before gzip and 67,928 bytes after gzip, while avoiding the creation and JSON
encoding of 20,740 bucket objects.

The backend already removed per-file `os.Stat` calls and enabled compression for
`/v0` responses. The remaining structural problem is that the list endpoint
still constructs and serializes all credentials for a UI that initially needs
12. The page also starts an unfiltered key-stat aggregation for every
credential during entry.

The measured fixed network and reverse-proxy latency is about 238 ms. A 100 ms
end-to-end target is therefore impossible. The optimization target is to make
server work and transfer size small enough that first content is normally
limited by that fixed latency.

## Goals

- Render the first 12 authentication files without constructing or returning
  all 1,037 full entries.
- Keep the current type, problem, disabled, enabled, wildcard search, sort, and
  pagination behavior.
- Preserve cross-page selection and the existing filtered-delete semantics.
- Load request statistics only for credentials on the current page.
- Keep `success` and `failed` totals in the general authentication-file list.
- Remove `recent_requests` from the general list response.
- Achieve a local paginated-handler P95 of at most 50 ms with 1,037 credentials.
- Keep the default 12-row paginated response below 50 KB uncompressed and 15 KB
  gzip-compressed under the representative workload.
- Target roughly 250-350 ms to first content when fixed chain latency remains
  about 238 ms.

## Non-goals

- Do not add client-side persistent caching as a substitute for first-load
  performance.
- Do not add another single-credential history endpoint. The management UI
  already obtains historical usage through monitor APIs, and no current Web UI
  or TUI consumer reads `recent_requests` from the authentication-file list.
- Do not virtualize the card list. Only one page is rendered, so virtualization
  does not address the bottleneck.
- Do not change credential file contents or authentication runtime behavior.

## Backend list contract

`GET /v0/management/auth-files` remains the list endpoint. Requests without
pagination parameters continue to return the complete lightweight list for
existing internal consumers such as the dashboard, monitor resolver, quota
page, and TUI. Every list response omits `recent_requests` and retains
`success` and `failed`.

When `page` or `page_size` is present, the endpoint uses paginated mode and
accepts these parameters:

- `page`: one-based positive integer; defaults to 1 when only `page_size` is
  supplied.
- `page_size`: integer from 3 through 40; defaults to 12 when only `page` is
  supplied. Values outside this range are invalid rather than silently
  clamped.
- `type`: exact provider/type filter; omitted means all types.
- `problem_only`: include only entries with a non-empty `status_message`.
- `disabled_only`: include only disabled entries.
- `enabled_only`: include only non-disabled entries.
- `search`: case-insensitive wildcard search across name, type, and provider;
  `*` has the same semantics as the current frontend search.
- `sort`: `default`, `az`, or `priority`. `default` and `priority` preserve the
  current priority-descending, then name-ascending order; `az` sorts by name.

The paginated response is:

```json
{
  "files": [],
  "total": 1037,
  "page": 1,
  "page_size": 12,
  "types": ["codex", "claude"],
  "type_counts": { "all": 1037, "codex": 900, "claude": 137 },
  "enabled_type_counts": { "codex": 850, "claude": 120 }
}
```

`total` is the count after all active list filters, including search and type.
`types` contains all types in the unfiltered credential set.
`type_counts` is calculated after the problem/disabled/enabled filters but
before type and search filters, matching the existing filter-tag counts.
`enabled_type_counts` is global and allows actions such as Codex cleanup to
retain their current visibility without loading every file.

The handler projects lightweight sortable/filterable fields for all manager
entries, applies filters and counts, sorts the projection, slices the requested
page, and builds full response entries only for that slice. It performs no
per-entry filesystem I/O. Pagination does not change the disk fallback path
used when the authentication manager is unavailable; that path applies the
same response contract after its existing directory scan.

## Filtered deletion

The current destructive action ignores free-text search and deletes according
to type/problem/disabled/enabled filters. That behavior remains explicit.

`DELETE /v0/management/auth-files?all=true` accepts the same `type`,
`problem_only`, `disabled_only`, and `enabled_only` parameters as the paginated
list. The backend resolves the matching physical files and deletes them using
the existing safe deletion path. Search is intentionally not accepted by this
operation because it is not part of the current deletion contract.

The response reports successful and failed counts so the frontend can retain
its existing success, partial-success, and failure notifications. Unfiltered
`all=true` keeps its existing delete-all behavior.

## Page-scoped key statistics

The page must not start an unfiltered `/custom/monitor/key-stats` request.
After a paginated file response arrives, the frontend sends the current page's
normalized authentication indexes in one request. The monitor endpoint accepts
repeated `auth_index` parameters and returns the existing response shape,
restricted to those indexes.

SQLite and PostgreSQL add an index covering normalized `auth_index` followed by
`requested_at`. The monitor query uses the same normalization expression as the
index and an `IN` predicate. A missing or empty index list retains the existing
unfiltered behavior for monitor consumers outside this page.

File cards render immediately with empty statistics, then update when the
page-scoped stats request completes. Stats failure remains non-blocking and
silent, matching current behavior. The four-minute refresh reloads statistics
only for the current page.

## Frontend state and data flow

The API layer adds a typed paginated-list query and response. The authentication
file data hook owns server pagination state: current files, total count, type
metadata, loading, error, and the active request. Page, page size, type, status
filters, and sort changes request data immediately. Search uses a short debounce
and each new request aborts the previous one so stale responses cannot replace
newer state.

The page removes local full-array filtering and sorting. Existing persisted UI
state remains the source of the initial query. If the stored page exceeds the
new total page count, the hook requests the last valid page.

Selection becomes a map of selected credential snapshots keyed by name rather
than a set derived from the currently loaded array. This preserves selections
across page navigation and provides the previous disabled state required for
optimistic batch-status rollback. Visible cards read selection state by name;
successful deletion removes affected names from the selection map.

After uploads, deletion, status changes, editor saves, cleanup, or header
refresh, the page reloads the active page and its page-scoped stats. Counts and
action visibility therefore come from the server response instead of stale
local derivations.

## Error handling

- Invalid pagination or filter parameters return HTTP 400 with a specific
  message; the backend does not silently reinterpret malformed input.
- A page request canceled by navigation or a newer query does not surface an
  error notification.
- If a mutation leaves the current page empty, the frontend requests the
  previous valid page.
- Partial filtered deletion returns both counts and per-file failure names for
  diagnostics without exposing credential contents.
- The full-list mode and TUI remain usable if the Web UI never sends pagination
  parameters.

## Verification

Backend public-contract tests cover:

- list responses omit `recent_requests` and retain `success`/`failed`;
- pagination boundaries and total counts;
- type, status, wildcard search, and sort behavior;
- `types`, `type_counts`, and `enabled_type_counts` semantics;
- filtered deletion and partial failure reporting;
- multi-auth-index key-stat filtering;
- SQLite and PostgreSQL query/index behavior where existing store tests apply.

Frontend tests cover API query serialization and response normalization,
request cancellation/stale-response protection, persisted initial pagination,
cross-page selection, mutation-driven reloads, and current-page stats queries.
Tests assert state and wire contracts, not CSS or implementation details.

Performance verification uses the same 1,037-entry workload before and after
the change and reports raw/gzip response bytes, handler wall time, allocations,
and JSON object counts. Run focused backend tests, the required server build,
frontend tests, typecheck, lint, and production build.

## Rollout order

1. Remove `recent_requests` from the full list and update its public contract
   test.
2. Add backend pagination/filter/count behavior and its tests.
3. Add filtered deletion and page-scoped key-stat support, including indexes.
4. Switch the Web authentication-file page to server pagination.
5. Re-run the 1,037-entry benchmark and compare against the recorded baseline.

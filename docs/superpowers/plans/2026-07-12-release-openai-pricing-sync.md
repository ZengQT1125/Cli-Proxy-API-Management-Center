# Release OpenAI Pricing Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every `v*` Tag release refresh OpenAI pricing from `models.dev` before building the release asset.

**Architecture:** Keep the existing single GitHub Actions job. Insert the existing `pricing:update:openai` command after dependency installation and before the build so the generated snapshot is local to the runner and automatically consumed by `costCalculator.ts` during compilation.

**Tech Stack:** GitHub Actions YAML, Node.js 24, npm, Vite, TypeScript

## Global Constraints

- Any network, HTTP, schema, price validation, or empty-result failure must stop the release.
- Do not fall back to the committed pricing snapshot after synchronization starts.
- Do not commit generated files from GitHub Actions or rewrite the release Tag.
- Do not add retries, caching, new jobs, dependencies, or implementation-detail tests.
- Preserve all unrelated working-tree changes.

---

### Task 1: Refresh pricing before release build

**Files:**
- Modify: `.github/workflows/release.yml:25-27`
- Verify: `package.json:12`
- Verify: `scripts/update-openai-pricing.mjs:5-17`

**Interfaces:**
- Consumes: npm script `pricing:update:openai`, which executes `node scripts/update-openai-pricing.mjs` and writes `src/data/openaiPricing.generated.ts`.
- Produces: a release workflow where `npm run build` only starts after a successful pricing refresh.

- [ ] **Step 1: Verify the existing synchronization command succeeds**

Run:

```bash
npm run pricing:update:openai
```

Expected: exit code `0` and output matching `Generated <count> OpenAI prices at .../src/data/openaiPricing.generated.ts`. Any fetch or validation failure is a real failure and must not be bypassed.

- [ ] **Step 2: Insert the synchronization step before the build**

Change `.github/workflows/release.yml` so this exact sequence follows `npm ci`:

```yaml
      - name: Update OpenAI pricing
        run: npm run pricing:update:openai

      - name: Build all-in-one HTML
        run: npm run build
        env:
          VERSION: ${{ github.ref_name }}
```

Do not add `continue-on-error`, fallback shell branches, generated-file commits, or a second job.

- [ ] **Step 3: Verify YAML syntax and step ordering**

Run:

```bash
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/release.yml'); puts 'release workflow YAML OK'"
```

Expected:

```text
release workflow YAML OK
```

Then run:

```bash
sed -n '18,38p' .github/workflows/release.yml
```

Expected: `Install dependencies` is followed by `Update OpenAI pricing`, which is followed by `Build all-in-one HTML`.

- [ ] **Step 4: Verify the refreshed snapshot builds**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite finish successfully and produce `dist/index.html`.

- [ ] **Step 5: Check the patch is clean and scoped**

Run:

```bash
git diff --check -- .github/workflows/release.yml
git diff -- .github/workflows/release.yml
```

Expected: no whitespace errors; the workflow diff contains only the new two-line pricing synchronization step plus its name.

- [ ] **Step 6: Commit only the release workflow change**

```bash
git add .github/workflows/release.yml
git commit -m "ci: refresh OpenAI pricing before release"
```

Expected: the commit contains only `.github/workflows/release.yml`; existing pricing implementation and other working-tree changes remain untouched.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canRunQuotaResetAction } from '../src/components/quota/quotaActions.ts';
import type { CodexQuotaState } from '../src/types/quota.ts';

const readProjectFile = (path: string): string =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const codexQuota = (credits: number): CodexQuotaState => ({
  status: 'success',
  windows: [],
  rateLimitResetCreditsAvailableCount: credits,
});

test('Codex 手动重置次数为 0 时不允许执行重置动作', () => {
  assert.equal(
    canRunQuotaResetAction({
      fileDisabled: false,
      sectionDisabled: false,
      quota: codexQuota(0),
      resetting: false,
      canResetQuota: (quota) => (quota.rateLimitResetCreditsAvailableCount ?? 0) > 0,
    }),
    false
  );
});

test('Codex 手动重置次数大于 0 时允许执行重置动作', () => {
  assert.equal(
    canRunQuotaResetAction({
      fileDisabled: false,
      sectionDisabled: false,
      quota: codexQuota(1),
      resetting: false,
      canResetQuota: (quota) => (quota.rateLimitResetCreditsAvailableCount ?? 0) > 0,
    }),
    true
  );
});

test('认证文件卡片重置入口也使用同一套可执行规则', () => {
  const source = readProjectFile('src/features/authFiles/components/AuthFileQuotaSection.tsx');

  assert.match(source, /canRunQuotaResetAction/);
  assert.match(source, /canResetQuota: config\.canResetQuota/);
  assert.doesNotMatch(
    source,
    /const canResetQuota = canRefreshQuota && quotaStatus !== 'loading';/
  );
});

test('Codex 重置按钮跟随手动重置次数同行渲染', () => {
  const source = readProjectFile('src/components/quota/quotaConfigs.ts');
  const renderCodexItems = source.match(
    /const renderCodexItems = \([\s\S]*?\nconst renderGeminiCliItems = /
  )?.[0] ?? '';

  assert.match(renderCodexItems, /key: 'reset-credits-value'[\s\S]*resetQuotaAction/);
  assert.doesNotMatch(renderCodexItems, /styleMap\.quotaInlineActions/);
});

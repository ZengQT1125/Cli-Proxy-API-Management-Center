import test from 'node:test';
import assert from 'node:assert/strict';
import { canRunQuotaResetAction } from '../src/components/quota/quotaActions.ts';
import type { CodexQuotaState } from '../src/types/quota.ts';

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

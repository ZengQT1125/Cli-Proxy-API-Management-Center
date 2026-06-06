import test from 'node:test';
import assert from 'node:assert/strict';
import { getProviderDisplayParts } from '../src/utils/monitor.ts';

test('请求日志优先使用后端返回的明确渠道名，避免相同 API Key 误识别', () => {
  const apiKey = 'zqt1234567890';
  const providerMap = {
    [apiKey]: 'generalcompute2api,scnet',
  };
  const providerModels = {
    generalcompute2api: new Set(['minimax-m2.7']),
    scnet: new Set(['minimax-m2.7']),
  };

  const guessed = getProviderDisplayParts(apiKey, providerMap, 'minimax-m2.7', providerModels);
  assert.equal(guessed.provider, 'generalcompute2api');

  const explicit = getProviderDisplayParts(apiKey, providerMap, 'minimax-m2.7', providerModels, 'scnet');
  assert.equal(explicit.provider, 'scnet');
});

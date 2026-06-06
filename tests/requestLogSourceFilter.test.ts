import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRequestLogSourceFilterParams,
  filterRequestLogEntriesByChannel,
  parseRequestLogSourceFilterValue,
} from '../src/components/monitor/requestLogFilters.ts';

test('请求日志普通来源选项按 source 过滤', () => {
  assert.deepEqual(parseRequestLogSourceFilterValue('key-1'), {
    source: 'key-1',
    channel: '',
  });
  assert.deepEqual(buildRequestLogSourceFilterParams('key-1'), {
    source: 'key-1',
  });
});

test('请求日志拆分渠道选项按 source 拉取，再由前端按明确 channel 过滤', () => {
  assert.deepEqual(parseRequestLogSourceFilterValue('same-key@@@scnet'), {
    source: 'same-key',
    channel: 'scnet',
  });
  assert.deepEqual(buildRequestLogSourceFilterParams('same-key'), {
    source: 'same-key',
  });

  const entries = [
    { actionSource: 'scnet', model: 'deepseek-v4-flash' },
    { actionSource: 'generalcompute2api', model: 'deepseek-v4-flash' },
  ];
  assert.deepEqual(filterRequestLogEntriesByChannel(entries, 'scnet'), [
    { actionSource: 'scnet', model: 'deepseek-v4-flash' },
  ]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRequestLogSourceFilterParams,
  filterRequestLogEntriesByChannel,
  paginateRequestLogEntries,
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
    { actionSource: 'same-key', providerName: 'scnet', model: 'deepseek-v4-flash' },
    { actionSource: 'same-key', providerName: 'generalcompute2api', model: 'deepseek-v4-flash' },
  ];
  assert.deepEqual(filterRequestLogEntriesByChannel(entries, 'scnet'), [
    { actionSource: 'same-key', providerName: 'scnet', model: 'deepseek-v4-flash' },
  ]);
});

test('请求日志拆分渠道筛选后再按过滤后的完整结果分页', () => {
  const entries = ['a', 'b', 'c', 'd', 'e'];

  assert.deepEqual(paginateRequestLogEntries(entries, 1, 2), ['a', 'b']);
  assert.deepEqual(paginateRequestLogEntries(entries, 2, 2), ['c', 'd']);
  assert.deepEqual(paginateRequestLogEntries(entries, 3, 2), ['e']);
});

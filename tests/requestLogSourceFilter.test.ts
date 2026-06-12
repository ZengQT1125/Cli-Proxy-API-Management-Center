import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRequestLogSourceFilterParams,
  filterRequestLogEntriesByChannel,
  parseRequestLogSourceFilterValue,
  resolveRequestLogChannel,
} from '../src/components/monitor/requestLogFilters.ts';

test('请求日志普通来源选项按 source 过滤', () => {
  assert.deepEqual(parseRequestLogSourceFilterValue('key-1'), {
    source: 'key-1',
    channel: '',
  });
  assert.deepEqual(buildRequestLogSourceFilterParams('key-1'), {
    source: 'key-1',
    channel: undefined,
  });
});

test('请求日志拆分渠道选项按 source 拉取，再由前端按明确 channel 过滤', () => {
  assert.deepEqual(parseRequestLogSourceFilterValue('same-key@@@scnet'), {
    source: 'same-key',
    channel: 'scnet',
  });
  assert.deepEqual(buildRequestLogSourceFilterParams('same-key'), {
    source: 'same-key',
    channel: undefined,
  });
  assert.deepEqual(buildRequestLogSourceFilterParams('same-key', 'scnet'), {
    source: 'same-key',
    channel: 'scnet',
  });

  const entries = [
    { actionSource: 'same-key', providerName: 'scnet', model: 'deepseek-v4-flash' },
    { actionSource: 'same-key', providerName: 'generalcompute2api', model: 'deepseek-v4-flash' },
  ];
  assert.deepEqual(filterRequestLogEntriesByChannel(entries, 'scnet'), [
    { actionSource: 'same-key', providerName: 'scnet', model: 'deepseek-v4-flash' },
  ]);
});

test('请求日志从后端 api 字段识别同 key 同模型的明确渠道', () => {
  const source = 'zqt1125';
  const providerMap = {
    [source]: 'scnet,ds2api',
  };

  assert.equal(
    resolveRequestLogChannel(
      {
        source,
        api_key: source,
        api: 'ds2api',
        model: 'deepseek-v4-flash',
      },
      source,
      providerMap
    ),
    'ds2api'
  );
});

test('请求日志从后端渠道别名字段识别明确渠道', () => {
  const source = 'zqt1125';
  const providerMap = {
    [source]: 'scnet,ds2api',
  };

  assert.equal(
    resolveRequestLogChannel(
      {
        source,
        api_key: source,
        api_name: 'ds2api',
        model: 'deepseek-v4-flash',
      },
      source,
      providerMap
    ),
    'ds2api'
  );
});

test('请求日志从原始请求模型前缀识别路由渠道', () => {
  const source = 'zqt1125';
  const providerMap = {
    [source]: 'scnet,ds2api',
    scnet: 'scnet',
    ds: 'ds2api',
  };

  assert.equal(
    resolveRequestLogChannel(
      {
        source,
        api_key: source,
        request_model: 'scnet/deepseek-v4-flash',
        model: 'deepseek-v4-flash',
      },
      source,
      providerMap
    ),
    'scnet'
  );

  assert.equal(
    resolveRequestLogChannel(
      {
        source,
        api_key: source,
        request_model: 'ds/deepseek-v4-flash',
        model: 'deepseek-v4-flash',
      },
      source,
      providerMap
    ),
    'ds2api'
  );
});

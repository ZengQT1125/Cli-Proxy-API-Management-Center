import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUEST_LOG_FILTER_KEYS,
  REQUEST_LOG_TABLE_COLUMN_KEYS,
  REQUEST_LOG_TABLE_COLUMN_WIDTHS,
  REQUEST_LOG_TABLE_MIN_WIDTH,
} from '../src/components/monitor/requestLogColumns.ts';

test('监控请求日志表格不展示请求 API 和请求类型列', () => {
  assert.deepEqual(REQUEST_LOG_TABLE_COLUMN_KEYS, [
    'auth',
    'model',
    'source',
    'status',
    'recent',
    'rate',
    'count',
    'timing',
    'toks',
    'input',
    'output',
    'cache',
    'time',
    'actions',
  ]);

  assert.equal(REQUEST_LOG_TABLE_COLUMN_KEYS.includes('api'), false);
  assert.equal(REQUEST_LOG_TABLE_COLUMN_KEYS.includes('requestType'), false);
});

test('监控请求日志表格列宽与列定义保持同步', () => {
  assert.deepEqual(Object.keys(REQUEST_LOG_TABLE_COLUMN_WIDTHS), REQUEST_LOG_TABLE_COLUMN_KEYS);

  const widthSum = Object.values(REQUEST_LOG_TABLE_COLUMN_WIDTHS).reduce(
    (sum, width) => sum + width,
    0
  );

  assert.equal(REQUEST_LOG_TABLE_MIN_WIDTH, widthSum);
  assert.equal(REQUEST_LOG_TABLE_COLUMN_WIDTHS.source, 96);
  assert.equal(REQUEST_LOG_TABLE_COLUMN_WIDTHS.actions, 96);
  assert.equal(REQUEST_LOG_TABLE_COLUMN_WIDTHS.output, 88);
  assert.equal(REQUEST_LOG_TABLE_COLUMN_WIDTHS.time, 180);
  assert.ok(REQUEST_LOG_TABLE_COLUMN_WIDTHS.actions > REQUEST_LOG_TABLE_COLUMN_WIDTHS.output);
  assert.ok(REQUEST_LOG_TABLE_COLUMN_WIDTHS.time > REQUEST_LOG_TABLE_COLUMN_WIDTHS.output);
});

test('监控请求日志筛选条件不展示请求 API 和请求类型', () => {
  assert.deepEqual(REQUEST_LOG_FILTER_KEYS, ['model', 'source', 'status']);

  assert.equal(REQUEST_LOG_FILTER_KEYS.includes('api'), false);
  assert.equal(REQUEST_LOG_FILTER_KEYS.includes('requestType'), false);
});

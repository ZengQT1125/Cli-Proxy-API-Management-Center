import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogLine } from '../src/pages/hooks/logParsing.ts';

test('日志解析支持管道段中的命名 request id', () => {
  const parsed = parseLogLine(
    '2026-06-05 10:20:30 | request_id=req_abc-123 | 200 | 12ms | GET /v1/models'
  );

  assert.equal(parsed.requestId, 'req_abc-123');
  assert.equal(parsed.statusCode, 200);
  assert.equal(parsed.method, 'GET');
  assert.equal(parsed.path, '/v1/models');
});

test('日志解析支持普通文本中的命名 request id', () => {
  const parsed = parseLogLine(
    '2026-06-05 10:20:30 info request-id=req.def:456 handled POST /api-call 500 in 1.5s'
  );

  assert.equal(parsed.requestId, 'req.def:456');
  assert.equal(parsed.statusCode, 500);
  assert.equal(parsed.method, 'POST');
  assert.equal(parsed.path, '/api-call');
});

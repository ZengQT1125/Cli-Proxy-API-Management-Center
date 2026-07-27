import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuthFileErrorMessage } from '../src/features/authFiles/constants.ts';
import type { AuthFileItem } from '../src/types/authFile.ts';

test('认证文件优先展示最近请求错误', () => {
  const file: AuthFileItem = {
    name: 'xai-user.json',
    status_message: 'quota exhausted',
    last_request_error: {
      message: 'upstream rejected request',
      status_code: 400,
      timestamp: '2026-07-27T02:30:00Z',
    },
  };

  assert.equal(getAuthFileErrorMessage(file), 'upstream rejected request');
});

test('没有最近请求错误时回退到凭证健康信息', () => {
  const file: AuthFileItem = {
    name: 'xai-user.json',
    status_message: 'quota exhausted',
  };

  assert.equal(getAuthFileErrorMessage(file), 'quota exhausted');
});

test('忽略缺少有效 message 的最近请求错误', () => {
  const file: AuthFileItem = {
    name: 'xai-user.json',
    statusMessage: 'unauthorized',
    last_request_error: { message: '   ' },
  };

  assert.equal(getAuthFileErrorMessage(file), 'unauthorized');
});

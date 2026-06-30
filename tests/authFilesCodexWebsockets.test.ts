import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAuthFileWebsockets,
  readAuthFileWebsockets,
  supportsAuthFileWebsockets,
} from '../src/features/authFiles/websockets.ts';

test('Codex 认证文件读取同时兼容 websocket 旧字段和 websockets 新字段', () => {
  assert.equal(readAuthFileWebsockets({ websocket: true }), true);
  assert.equal(readAuthFileWebsockets({ websocket: 'false' }), false);
  assert.equal(readAuthFileWebsockets({ websockets: 'true', websocket: false }), true);
  assert.equal(readAuthFileWebsockets({}), false);
});

test('保存 Codex 认证文件时移除 websocket 旧字段，只写 websockets', () => {
  const next = applyAuthFileWebsockets(
    {
      websocket: true,
      websockets: false,
      untouched: 'value',
    },
    true
  );

  assert.deepEqual(next, {
    websockets: true,
    untouched: 'value',
  });
  assert.equal('websocket' in next, false);
});

test('仅为需要 Responses API websocket 的认证文件显示开关', () => {
  assert.equal(supportsAuthFileWebsockets('codex'), true);
  assert.equal(supportsAuthFileWebsockets('xai'), true);
  assert.equal(supportsAuthFileWebsockets('XAI'), true);
  assert.equal(supportsAuthFileWebsockets('claude'), false);
});

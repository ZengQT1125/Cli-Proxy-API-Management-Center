import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCodexAuthFileWebsockets,
  readCodexAuthFileWebsockets,
} from '../src/features/authFiles/websockets.ts';

test('Codex 认证文件读取同时兼容 websocket 旧字段和 websockets 新字段', () => {
  assert.equal(readCodexAuthFileWebsockets({ websocket: true }), true);
  assert.equal(readCodexAuthFileWebsockets({ websocket: 'false' }), false);
  assert.equal(readCodexAuthFileWebsockets({ websockets: 'true', websocket: false }), true);
  assert.equal(readCodexAuthFileWebsockets({}), false);
});

test('保存 Codex 认证文件时移除 websocket 旧字段，只写 websockets', () => {
  const next = applyCodexAuthFileWebsockets(
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

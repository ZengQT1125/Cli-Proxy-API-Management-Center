import test from 'node:test';
import assert from 'node:assert/strict';
import { computeApiUrl, normalizeApiBase } from '../src/utils/connection.ts';
import { MANAGEMENT_API_PREFIX } from '../src/utils/constants.ts';

test('本地 Vite 5173 页面自动探测后端管理端口 8317', () => {
  assert.equal(normalizeApiBase('http://localhost:5173'), 'http://localhost:8317');
  assert.equal(normalizeApiBase('http://127.0.0.1:5173/'), 'http://127.0.0.1:8317');
  assert.equal(
    computeApiUrl('http://localhost:5173'),
    `http://localhost:8317${MANAGEMENT_API_PREFIX}`
  );
});

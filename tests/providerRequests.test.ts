import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProviderConnectivityRequest,
  buildProviderModelDiscoveryRequest,
} from '../src/components/providers/providerRequests.ts';

test('OpenAI 连通性测试可用 authIndex 代替明文 API Key', () => {
  const result = buildProviderConnectivityRequest({
    brand: 'openai',
    baseUrl: 'https://example.test/v1',
    headers: [],
    models: [{ name: 'gpt-5', alias: '' }],
    testModel: '',
    apiKeyEntry: { apiKey: '', authIndex: 'auth-7' },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.request.authIndex, 'auth-7');
  assert.equal(result.request.url, 'https://example.test/v1/chat/completions');
  assert.equal(result.request.header?.Authorization, 'Bearer $TOKEN$');
  assert.match(String(result.request.data), /"model":"gpt-5"/);
});

test('Gemini 连通性测试接受自定义 x-goog-api-key 请求头', () => {
  const result = buildProviderConnectivityRequest({
    brand: 'gemini',
    baseUrl: '',
    headers: [{ key: 'x-goog-api-key', value: 'custom-key' }],
    models: [{ name: 'gemini-3.1-pro-preview', alias: '' }],
    testModel: '',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent');
  assert.equal(result.request.header?.['x-goog-api-key'], 'custom-key');
});

test('Claude 连通性测试从 Authorization Bearer 派生 x-api-key', () => {
  const result = buildProviderConnectivityRequest({
    brand: 'claude',
    baseUrl: '',
    headers: [{ key: 'Authorization', value: 'Bearer claude-key' }],
    models: [{ name: 'claude-sonnet-4-5', alias: '' }],
    testModel: '',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.request.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(result.request.header?.['x-api-key'], 'claude-key');
  assert.equal(result.request.header?.['anthropic-version'], '2023-06-01');
});

test('OpenAI 模型发现优先使用 authIndex 并标记允许无鉴权重试', () => {
  const result = buildProviderModelDiscoveryRequest({
    brand: 'openai',
    baseUrl: 'https://openai-compatible.test',
    headers: [],
    apiKeyEntries: [
      { apiKey: '', proxyUrl: '' },
      { apiKey: '', authIndex: 'auth-9' },
    ],
  });

  assert.equal(result.endpoint, 'https://openai-compatible.test/models');
  assert.equal(result.apiKey, undefined);
  assert.equal(result.authIndex, 'auth-9');
  assert.equal(result.retryWithoutAuth, true);
});

test('Codex 模型发现不会重复拼接 v1 路径', () => {
  const result = buildProviderModelDiscoveryRequest({
    brand: 'codex',
    baseUrl: 'https://codex-compatible.test/v1',
    headers: [],
    apiKey: 'codex-key',
  });

  assert.equal(result.endpoint, 'https://codex-compatible.test/v1/models');
});

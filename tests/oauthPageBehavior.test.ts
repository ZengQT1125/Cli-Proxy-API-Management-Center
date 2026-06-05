import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeGeminiCliProjectId } from '../src/pages/oauthProject.ts';

const oauthPageSource = readFileSync(
  new URL('../src/pages/OAuthPage.tsx', import.meta.url),
  'utf8'
);

test('Gemini CLI OAuth 项目 ID 归一化保留 ALL 语义', () => {
  assert.equal(normalizeGeminiCliProjectId(undefined), undefined);
  assert.equal(normalizeGeminiCliProjectId(''), undefined);
  assert.equal(normalizeGeminiCliProjectId('   '), undefined);
  assert.equal(normalizeGeminiCliProjectId(' all '), 'ALL');
  assert.equal(normalizeGeminiCliProjectId(' Project-123 '), 'Project-123');
});

test('OAuth 成功态提供重新登录和查看认证文件入口', () => {
  assert.match(oauthPageSource, /useNavigate\(/);
  assert.match(oauthPageSource, /state\.status === 'success'\s*\?\s*t\('auth_login\.login_another_account'\)/);
  assert.match(oauthPageSource, /state\.status === 'success' && \(/);
  assert.match(oauthPageSource, /navigate\('\/auth-files'\)/);
  assert.match(oauthPageSource, /t\('auth_login\.view_auth_files'\)/);
});

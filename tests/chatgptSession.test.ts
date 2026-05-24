import test from 'node:test';
import assert from 'node:assert/strict';
import { convertChatGptSessionToCpaFile } from '../src/features/authFiles/chatgptSession.ts';

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
};

test('ChatGPT session converts to a CPA codex auth file', () => {
  const now = new Date('2026-05-24T10:20:30.000Z');

  const result = convertChatGptSessionToCpaFile(
    JSON.stringify({
      user: {
        id: 'user-test',
        email: 'mark@example.com',
      },
      expires: '2026-08-06T14:29:36.155Z',
      account: {
        id: '00000000-0000-4000-9000-000000000000',
        planType: 'plus',
      },
      accessToken: 'access-token',
      sessionToken: 'session-token',
    }),
    { now }
  );

  assert.equal(result.fileName, 'chatgpt-session-mark-example-com.json');

  const cpa = JSON.parse(result.content) as Record<string, unknown>;
  assert.equal(cpa.type, 'codex');
  assert.equal(cpa.account_id, '00000000-0000-4000-9000-000000000000');
  assert.equal(cpa.chatgpt_account_id, '00000000-0000-4000-9000-000000000000');
  assert.equal(cpa.email, 'mark@example.com');
  assert.equal(cpa.name, 'mark@example.com');
  assert.equal(cpa.plan_type, 'plus');
  assert.equal(cpa.chatgpt_plan_type, 'plus');
  assert.equal(cpa.access_token, 'access-token');
  assert.equal(cpa.refresh_token, '');
  assert.equal(cpa.session_token, 'session-token');
  assert.equal(cpa.last_refresh, '2026-05-24T10:20:30.000Z');
  assert.equal(cpa.expired, '2026-08-06T14:29:36.155Z');
  assert.equal(cpa.id_token_synthetic, true);

  const idToken = String(cpa.id_token);
  assert.equal(idToken.split('.').length, 3);

  const payload = decodeJwtPayload(idToken);
  const auth = payload['https://api.openai.com/auth'] as Record<string, unknown>;
  assert.equal(payload.email, 'mark@example.com');
  assert.equal(payload.exp, 1786026576);
  assert.equal(auth.chatgpt_account_id, '00000000-0000-4000-9000-000000000000');
  assert.equal(auth.chatgpt_plan_type, 'plus');
  assert.equal(auth.chatgpt_user_id, 'user-test');
});

test('ChatGPT session conversion rejects JSON without accessToken', () => {
  assert.throws(
    () => convertChatGptSessionToCpaFile(JSON.stringify({ user: { email: 'mark@example.com' } })),
    /缺少 accessToken/
  );
});

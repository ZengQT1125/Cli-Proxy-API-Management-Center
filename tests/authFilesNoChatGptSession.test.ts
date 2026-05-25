import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const readProjectFile = (path: string): string =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('auth files page no longer exposes ChatGPT session import', () => {
  const pageSource = readProjectFile('src/pages/AuthFilesPage.tsx');

  assert.equal(pageSource.includes('chatgpt_session'), false);
  assert.equal(pageSource.includes('ChatGptSession'), false);
  assert.equal(pageSource.includes('chat.openai.com/api/auth/session'), false);
});

test('ChatGPT session import has no translation surface or converter module', () => {
  const localeFiles = [
    'src/i18n/locales/en.json',
    'src/i18n/locales/ru.json',
    'src/i18n/locales/zh-CN.json',
    'src/i18n/locales/zh-TW.json',
  ];

  for (const localeFile of localeFiles) {
    assert.equal(readProjectFile(localeFile).includes('chatgpt_session'), false, localeFile);
  }

  assert.equal(
    existsSync(new URL('../src/features/authFiles/chatgptSession.ts', import.meta.url)),
    false
  );
  assert.equal(existsSync(new URL('../tests/chatgptSession.test.ts', import.meta.url)), false);
});

import { describe, expect, spyOn, test } from 'bun:test';
import {
  applyAuthFileUsingApi,
  readAuthFileUsingApi,
  supportsAuthFileUsingApi,
} from '@/features/authFiles/constants';
import { authFilesApi } from '@/services/api/authFiles';
import { apiClient } from '@/services/api/client';

describe('xAI auth-file using_api', () => {
  test('is only exposed for xAI credentials', () => {
    expect(supportsAuthFileUsingApi('xai')).toBe(true);
    expect(supportsAuthFileUsingApi('grok')).toBe(true);
    expect(supportsAuthFileUsingApi('codex')).toBe(false);
  });

  test('reads boolean-compatible values and defaults to chat-proxy mode', () => {
    expect(readAuthFileUsingApi({ using_api: true })).toBe(true);
    expect(readAuthFileUsingApi({ using_api: 'true' })).toBe(true);
    expect(readAuthFileUsingApi({ using_api: false })).toBe(false);
    expect(readAuthFileUsingApi({})).toBe(false);
  });

  test('writes an explicit using_api boolean', () => {
    expect(applyAuthFileUsingApi({ type: 'xai' }, true)).toEqual({
      type: 'xai',
      using_api: true,
    });
    expect(applyAuthFileUsingApi({ type: 'xai', using_api: true }, false)).toEqual({
      type: 'xai',
      using_api: false,
    });
  });

  test('sends only changed metadata through the auth-file fields endpoint', async () => {
    const patchSpy = spyOn(apiClient, 'patch').mockResolvedValue(undefined);

    try {
      await authFilesApi.patchFields('grok.json', { using_api: true });

      expect(patchSpy).toHaveBeenCalledTimes(1);
      expect(patchSpy).toHaveBeenCalledWith('/auth-files/fields', {
        name: 'grok.json',
        using_api: true,
      });
    } finally {
      patchSpy.mockRestore();
    }
  });
});

import { describe, expect, spyOn, test } from 'bun:test';
import axios from 'axios';
import { buildAuthFilesListParams, type AuthFilesListQuery } from '@/features/authFiles/listQuery';
import { authFilesApi } from '@/services/api/authFiles';
import { apiClient } from '@/services/api/client';
import { monitorApi } from '@/services/api/monitor';

const query: AuthFilesListQuery = {
  page: 2,
  pageSize: 12,
  type: 'codex',
  problemOnly: true,
  disabledOnly: false,
  enabledOnly: true,
  search: 'team-*',
  sort: 'priority',
};

describe('auth-file list query contracts', () => {
  test('serializes paginated filters into the backend query contract', () => {
    expect(buildAuthFilesListParams(query)).toEqual({
      page: 2,
      page_size: 12,
      type: 'codex',
      problem_only: true,
      enabled_only: true,
      search: 'team-*',
      sort: 'priority',
    });
  });

  test('omits empty and disabled filters while retaining pagination and sort', () => {
    expect(
      buildAuthFilesListParams({
        page: 1,
        pageSize: 12,
        type: '',
        problemOnly: false,
        disabledOnly: false,
        enabledOnly: false,
        search: '',
        sort: 'default',
      })
    ).toEqual({ page: 1, page_size: 12, sort: 'default' });
  });

  test('lists one page with serialized parameters and its cancellation signal', async () => {
    const controller = new AbortController();
    const getSpy = spyOn(apiClient, 'get').mockResolvedValue(undefined);

    try {
      await authFilesApi.listPage(query, controller.signal);

      expect(getSpy).toHaveBeenCalledWith('/auth-files', {
        params: buildAuthFilesListParams(query),
        signal: controller.signal,
      });
    } finally {
      getSpy.mockRestore();
    }
  });

  test('deletes all matching files without forwarding client-only search or pagination', async () => {
    const deleteSpy = spyOn(apiClient, 'delete').mockResolvedValue(undefined);

    try {
      await authFilesApi.deleteFiltered(query);

      expect(deleteSpy).toHaveBeenCalledWith('/auth-files', {
        params: {
          all: true,
          type: 'codex',
          problem_only: true,
          enabled_only: true,
        },
      });
    } finally {
      deleteSpy.mockRestore();
    }
  });

  test('sends batch key-stat indexes as repeated auth_index parameters', async () => {
    const getSpy = spyOn(apiClient, 'get').mockResolvedValue(undefined);

    try {
      await monitorApi.getKeyStats(['auth-a', 'auth-b']);

      const [url, config] = getSpy.mock.calls[0] ?? [];
      expect(url).toBe('/custom/monitor/key-stats');

      const serializedUrl = axios.getUri({
        url,
        params: config?.params,
        paramsSerializer: config?.paramsSerializer,
      });
      const queryString = serializedUrl.split('?')[1] ?? '';

      expect(queryString).toBe('auth_index=auth-a&auth_index=auth-b');
      expect(queryString).not.toContain('auth_index%5B%5D');
      expect(queryString).not.toContain('auth_index[]');
    } finally {
      getSpy.mockRestore();
    }
  });

  test('adapts a single-key refresh to the batch key-stat contract', async () => {
    const response = {
      by_source: {},
      by_auth_index: {},
      block_config: { count: 0, duration_ms: 0, window_start_ms: 0 },
      filter: { auth_indexes: ['auth-a'] },
    };
    const getSpy = spyOn(apiClient, 'get').mockResolvedValue(response);

    try {
      const result = await monitorApi.getKeyStats({ auth_index: 'auth-a' });

      expect(getSpy).toHaveBeenCalledWith(
        '/custom/monitor/key-stats',
        expect.objectContaining({ params: { auth_index: ['auth-a'] } })
      );
      expect(result.filter).toEqual({ auth_indexes: ['auth-a'], auth_index: 'auth-a' });
    } finally {
      getSpy.mockRestore();
    }
  });
});

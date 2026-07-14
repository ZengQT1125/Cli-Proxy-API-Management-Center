import { describe, expect, test } from 'bun:test';
import { buildAuthFilesListParams } from '@/features/authFiles/listQuery';
import { buildQuotaAuthFilesListQuery } from '@/components/quota/quotaListQuery';
import { MIN_QUOTA_PAGE_SIZE, normalizeQuotaPageSize } from '@/components/quota/uiState';

describe('quota auth-files list query', () => {
  test('builds paginated enabled-only type filters for quota sections', () => {
    const query = buildQuotaAuthFilesListQuery('xai', 2, 12);

    expect(query).toEqual({
      page: 2,
      pageSize: 12,
      type: 'xai',
      problemOnly: false,
      disabledOnly: false,
      enabledOnly: true,
      search: '',
      sort: 'default',
    });

    expect(buildAuthFilesListParams(query)).toEqual({
      page: 2,
      page_size: 12,
      type: 'xai',
      enabled_only: true,
      sort: 'default',
    });
  });

  test('clamps quota page size into the auth-files contract range', () => {
    expect(MIN_QUOTA_PAGE_SIZE).toBe(3);
    expect(normalizeQuotaPageSize(1)).toBe(3);
    expect(normalizeQuotaPageSize(12)).toBe(12);
    expect(normalizeQuotaPageSize(99)).toBe(40);
  });
});

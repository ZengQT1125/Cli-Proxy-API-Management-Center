import type { AuthFilesListQuery } from '@/features/authFiles/listQuery';

export const buildQuotaAuthFilesListQuery = (
  type: string,
  page: number,
  pageSize: number
): AuthFilesListQuery => ({
  page,
  pageSize,
  type,
  problemOnly: false,
  disabledOnly: false,
  enabledOnly: true,
  search: '',
  sort: 'default',
});

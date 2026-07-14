import type { AuthFilesSortMode } from './uiState';

export type AuthFilesListQuery = {
  page: number;
  pageSize: number;
  type: string;
  problemOnly: boolean;
  disabledOnly: boolean;
  enabledOnly: boolean;
  search: string;
  sort: AuthFilesSortMode;
};

export type AuthFilesListParams = {
  page: number;
  page_size: number;
  sort: AuthFilesSortMode;
  type?: string;
  problem_only?: true;
  disabled_only?: true;
  enabled_only?: true;
  search?: string;
};

export const buildAuthFilesListParams = (query: AuthFilesListQuery): AuthFilesListParams => {
  const params: AuthFilesListParams = {
    page: query.page,
    page_size: query.pageSize,
    sort: query.sort,
  };

  if (query.type) params.type = query.type;
  if (query.problemOnly) params.problem_only = true;
  if (query.disabledOnly) params.disabled_only = true;
  if (query.enabledOnly) params.enabled_only = true;
  if (query.search) params.search = query.search;

  return params;
};

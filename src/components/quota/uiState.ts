export type QuotaUiState = {
  pageSize?: number;
};

// Align with /auth-files list contract: page_size must be 3..40.
export const MIN_QUOTA_PAGE_SIZE = 3;
export const DEFAULT_QUOTA_PAGE_SIZE = 12;
export const MAX_QUOTA_PAGE_SIZE = 40;

const QUOTA_UI_STATE_KEY = 'quotaPage.uiState';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const normalizeQuotaPageSize = (value: unknown): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_QUOTA_PAGE_SIZE;
  return Math.min(MAX_QUOTA_PAGE_SIZE, Math.max(MIN_QUOTA_PAGE_SIZE, Math.round(parsed)));
};

const normalizeQuotaUiState = (state: QuotaUiState): QuotaUiState => {
  const rawPageSize = (state as { pageSize?: unknown }).pageSize;
  if (typeof rawPageSize !== 'number' && typeof rawPageSize !== 'string') return {};
  return { pageSize: normalizeQuotaPageSize(rawPageSize) };
};

const readQuotaUiStateFromStorage = (
  storage: Pick<BrowserStorage, 'getItem'> | null | undefined
): QuotaUiState | null => {
  if (!storage) return null;
  const raw = storage.getItem(QUOTA_UI_STATE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as QuotaUiState;
  return parsed && typeof parsed === 'object' ? normalizeQuotaUiState(parsed) : null;
};

export const readQuotaUiState = (): QuotaUiState | null => {
  if (typeof window === 'undefined') return null;
  try {
    return (
      readQuotaUiStateFromStorage(window.localStorage) ??
      readQuotaUiStateFromStorage(window.sessionStorage)
    );
  } catch {
    return null;
  }
};

export const writeQuotaUiState = (state: QuotaUiState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUOTA_UI_STATE_KEY, JSON.stringify(normalizeQuotaUiState(state)));
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(QUOTA_UI_STATE_KEY);
  } catch {
    // ignore
  }
};

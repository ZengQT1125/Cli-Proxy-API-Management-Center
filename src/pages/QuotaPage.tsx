/**
 * Quota management page - coordinates the four quota sections.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useAuthStore } from '@/stores';
import {
  QuotaSection,
  ANTIGRAVITY_CONFIG,
  CLAUDE_CONFIG,
  CODEX_CONFIG,
  GEMINI_CLI_CONFIG,
  KIMI_CONFIG,
  XAI_CONFIG,
} from '@/components/quota';
import {
  DEFAULT_QUOTA_PAGE_SIZE,
  normalizeQuotaPageSize,
  readQuotaUiState,
  writeQuotaUiState,
} from '@/components/quota/uiState';
import styles from './QuotaPage.module.scss';

export function QuotaPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const persistedUiState = useMemo(() => readQuotaUiState(), []);

  const [pageSize, setPageSizeState] = useState(() =>
    normalizeQuotaPageSize(persistedUiState?.pageSize ?? DEFAULT_QUOTA_PAGE_SIZE)
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const disableControls = connectionStatus !== 'connected';

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(normalizeQuotaPageSize(size));
  }, []);

  const handleHeaderRefresh = useCallback(async () => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    writeQuotaUiState({ pageSize });
  }, [pageSize]);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('quota_management.title')}</h1>
        <p className={styles.description}>{t('quota_management.description')}</p>
      </div>

      <QuotaSection
        config={CLAUDE_CONFIG}
        disabled={disableControls}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refreshKey={refreshKey}
      />
      <QuotaSection
        config={ANTIGRAVITY_CONFIG}
        disabled={disableControls}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refreshKey={refreshKey}
      />
      <QuotaSection
        config={CODEX_CONFIG}
        disabled={disableControls}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refreshKey={refreshKey}
      />
      <QuotaSection
        config={XAI_CONFIG}
        disabled={disableControls}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refreshKey={refreshKey}
      />
      <QuotaSection
        config={GEMINI_CLI_CONFIG}
        disabled={disableControls}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refreshKey={refreshKey}
      />
      <QuotaSection
        config={KIMI_CONFIG}
        disabled={disableControls}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refreshKey={refreshKey}
      />
    </div>
  );
}

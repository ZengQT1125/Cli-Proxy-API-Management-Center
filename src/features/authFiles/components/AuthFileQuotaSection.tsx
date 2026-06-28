import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { canRunQuotaResetAction } from '@/components/quota/quotaActions';
import { useNotificationStore, useQuotaStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import {
  isRuntimeOnlyAuthFile,
  resolveQuotaErrorMessage,
  type QuotaProviderType,
} from '@/features/authFiles/constants';
import { getAuthFileQuotaConfig } from '@/features/authFiles/hooks/useAuthFileQuotaRefresh';
import { Button } from '@/components/ui/Button';
import { IconRefreshCw } from '@/components/ui/icons';
import { QuotaProgressBar } from '@/features/authFiles/components/QuotaProgressBar';
import styles from '@/pages/AuthFilesPage.module.scss';

type QuotaState = { status?: string; error?: string; errorStatus?: number } | undefined;
type ResolvedQuotaState = NonNullable<QuotaState>;

export type AuthFileQuotaSectionProps = {
  file: AuthFileItem;
  quotaType: QuotaProviderType;
  disableControls: boolean;
};

export function AuthFileQuotaSection(props: AuthFileQuotaSectionProps) {
  const { file, quotaType, disableControls } = props;
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);
  const [resettingQuota, setResettingQuota] = useState(false);

  const quota = useQuotaStore((state) => {
    if (quotaType === 'antigravity') return state.antigravityQuota[file.name] as QuotaState;
    if (quotaType === 'claude') return state.claudeQuota[file.name] as QuotaState;
    if (quotaType === 'codex') return state.codexQuota[file.name] as QuotaState;
    if (quotaType === 'kimi') return state.kimiQuota[file.name] as QuotaState;
    if (quotaType === 'xai') return state.xaiQuota[file.name] as QuotaState;
    return state.geminiCliQuota[file.name] as QuotaState;
  });

  const updateQuotaState = useQuotaStore((state) => {
    if (quotaType === 'antigravity')
      return state.setAntigravityQuota as unknown as (updater: unknown) => void;
    if (quotaType === 'claude')
      return state.setClaudeQuota as unknown as (updater: unknown) => void;
    if (quotaType === 'codex') return state.setCodexQuota as unknown as (updater: unknown) => void;
    if (quotaType === 'kimi') return state.setKimiQuota as unknown as (updater: unknown) => void;
    if (quotaType === 'xai') return state.setXaiQuota as unknown as (updater: unknown) => void;
    return state.setGeminiCliQuota as unknown as (updater: unknown) => void;
  });

  const resetQuotaForFile = useCallback(() => {
    if (isRuntimeOnlyAuthFile(file)) return;

    const config = getAuthFileQuotaConfig(quotaType) as unknown as {
      resetQuota?: (file: AuthFileItem, t: TFunction) => Promise<unknown>;
      canResetQuota?: (quota: ResolvedQuotaState) => boolean;
      buildSuccessState: (data: unknown) => unknown;
    };
    const resetQuota = config.resetQuota;
    if (!resetQuota) return;
    if (
      !canRunQuotaResetAction({
        sectionDisabled: disableControls,
        fileDisabled: file.disabled,
        quota,
        resetting: resettingQuota,
        canResetQuota: config.canResetQuota,
      })
    ) {
      return;
    }

    showConfirmation({
      title: t('codex_quota.reset_confirm_title'),
      message: t('codex_quota.reset_confirm_message', { name: file.name }),
      confirmText: t('codex_quota.reset_confirm_button'),
      variant: 'primary',
      onConfirm: async () => {
        setResettingQuota(true);
        try {
          const data = await resetQuota(file, t);
          updateQuotaState((prev: Record<string, unknown>) => ({
            ...prev,
            [file.name]: config.buildSuccessState(data),
          }));
          showNotification(t('codex_quota.reset_success', { name: file.name }), 'success');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : t('common.unknown_error');
          showNotification(t('codex_quota.reset_failed', { name: file.name, message }), 'error');
        } finally {
          setResettingQuota(false);
        }
      },
    });
  }, [
    disableControls,
    file,
    quota,
    quotaType,
    resettingQuota,
    showConfirmation,
    showNotification,
    t,
    updateQuotaState,
  ]);

  const config = getAuthFileQuotaConfig(quotaType) as unknown as {
    i18nPrefix: string;
    resetQuota?: (file: AuthFileItem, t: TFunction) => Promise<unknown>;
    canResetQuota?: (quota: ResolvedQuotaState) => boolean;
    renderQuotaItems: (quota: unknown, t: TFunction, helpers: unknown) => unknown;
  };

  const quotaStatus = quota?.status ?? 'idle';
  const canReset = !config.canResetQuota || (quota ? config.canResetQuota(quota) : true);
  const canRunResetQuotaAction = canRunQuotaResetAction({
    sectionDisabled: disableControls,
    fileDisabled: file.disabled,
    quota,
    resetting: resettingQuota,
    canResetQuota: config.canResetQuota,
  });
  const resetButtonTitle = canReset
    ? t('codex_quota.reset_button')
    : t('codex_quota.reset_no_credits_hint');
  const resetQuotaAction = config.resetQuota ? (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={styles.quotaResetCreditButton}
      onClick={() => resetQuotaForFile()}
      disabled={!canRunResetQuotaAction}
      loading={resettingQuota}
      title={resetButtonTitle}
      aria-label={resetButtonTitle}
    >
      {!resettingQuota && <IconRefreshCw size={14} />}
      {t('codex_quota.reset_button')}
    </Button>
  ) : undefined;
  const quotaErrorMessage = resolveQuotaErrorMessage(
    t,
    quota?.errorStatus,
    quota?.error || t('common.unknown_error')
  );

  return (
    <div className={styles.quotaSection}>
      {quotaStatus === 'loading' ? (
        <div className={styles.quotaMessage}>{t(`${config.i18nPrefix}.loading`)}</div>
      ) : quotaStatus === 'idle' ? (
        <div className={styles.quotaMessage}>{t('auth_files.quota_not_loaded')}</div>
      ) : quotaStatus === 'error' ? (
        <div className={styles.quotaError}>
          {t(`${config.i18nPrefix}.load_failed`, {
            message: quotaErrorMessage,
          })}
        </div>
      ) : quota ? (
        (config.renderQuotaItems(quota, t, {
          styles,
          QuotaProgressBar,
          resetQuotaAction,
        }) as ReactNode)
      ) : (
        <div className={styles.quotaMessage}>{t(`${config.i18nPrefix}.idle`)}</div>
      )}
    </div>
  );
}

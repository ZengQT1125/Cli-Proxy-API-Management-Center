import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import iconCode0 from '@/assets/icons/code0.png';
import type { GeminiKeyConfig, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';
import { maskApiKey } from '@/utils/format';
import {
  buildCandidateUsageSourceIds,
  lookupStatusBar,
  type KeyStats,
  type StatusBarData,
} from '@/utils/usage';
import styles from '@/pages/AiProvidersPage.module.scss';
import { ProviderStatusBar } from '../ProviderStatusBar';
import { getOpenAIProviderStats, getStatsBySource, hasDisableAllModelsRule } from '../utils';
import {
  CODE0_CLAUDE_BASE_URL,
  CODE0_CODEX_BASE_URL,
  CODE0_GEMINI_BASE_URL,
  CODE0_OPENAI_BASE_URL,
  type Code0Protocol,
  type IndexedProviderConfig,
} from '../code0';

interface Code0SectionProps {
  openaiProviders: IndexedProviderConfig<OpenAIProviderConfig>[];
  claudeConfigs: IndexedProviderConfig<ProviderKeyConfig>[];
  geminiConfigs: IndexedProviderConfig<GeminiKeyConfig>[];
  codexConfigs: IndexedProviderConfig<ProviderKeyConfig>[];
  keyStats: KeyStats;
  statusBarBySource: Map<string, StatusBarData>;
  loading: boolean;
  disableControls: boolean;
  isSwitching: boolean;
  onAdd: (protocol: Code0Protocol) => void;
  onEdit: (protocol: Code0Protocol, index: number) => void;
  onDelete: (protocol: Code0Protocol, index: number) => void;
}

type Code0ProtocolGroup =
  | {
      protocol: 'openai';
      entries: IndexedProviderConfig<OpenAIProviderConfig>[];
      baseUrl: string;
    }
  | {
      protocol: 'gemini';
      entries: IndexedProviderConfig<GeminiKeyConfig>[];
      baseUrl: string;
    }
  | {
      protocol: 'claude' | 'codex';
      entries: IndexedProviderConfig<ProviderKeyConfig>[];
      baseUrl: string;
    };

const protocolOrder: Code0Protocol[] = ['openai', 'claude', 'gemini', 'codex'];

const getFirstApiKeyPreview = (group: Code0ProtocolGroup): string | null => {
  if (group.protocol === 'openai') {
    const first = group.entries[0]?.config;
    if (!first) return null;
    const key = first.apiKeyEntries?.find((entry) => entry.apiKey?.trim())?.apiKey;
    return key ? maskApiKey(key) : null;
  }
  const first = group.entries[0]?.config;
  if (!first) return null;
  return first.apiKey ? maskApiKey(first.apiKey) : null;
};

const collectStatusCandidates = (group: Code0ProtocolGroup): string[] => {
  const candidates: string[] = [];
  if (group.protocol === 'openai') {
    group.entries.forEach(({ config }) => {
      buildCandidateUsageSourceIds({ prefix: config.prefix }).forEach((id) => candidates.push(id));
      config.apiKeyEntries.forEach((entry) => {
        buildCandidateUsageSourceIds({ apiKey: entry.apiKey }).forEach((id) => candidates.push(id));
      });
    });
    return candidates;
  }

  group.entries.forEach(({ config }) => {
    buildCandidateUsageSourceIds({ prefix: config.prefix }).forEach((id) => candidates.push(id));
    buildCandidateUsageSourceIds({ apiKey: config.apiKey }).forEach((id) => candidates.push(id));
  });
  return candidates;
};

export function Code0Section({
  openaiProviders,
  claudeConfigs,
  geminiConfigs,
  codexConfigs,
  keyStats,
  statusBarBySource,
  loading,
  disableControls,
  isSwitching,
  onAdd,
  onEdit,
  onDelete,
}: Code0SectionProps) {
  const { t } = useTranslation();
  const actionsDisabled = disableControls || loading || isSwitching;

  const groups = useMemo<Code0ProtocolGroup[]>(
    () => [
      { protocol: 'openai', entries: openaiProviders, baseUrl: CODE0_OPENAI_BASE_URL },
      { protocol: 'claude', entries: claudeConfigs, baseUrl: CODE0_CLAUDE_BASE_URL },
      { protocol: 'gemini', entries: geminiConfigs, baseUrl: CODE0_GEMINI_BASE_URL },
      { protocol: 'codex', entries: codexConfigs, baseUrl: CODE0_CODEX_BASE_URL },
    ],
    [claudeConfigs, codexConfigs, geminiConfigs, openaiProviders]
  );

  const configuredGroups = groups.filter((group) => group.entries.length > 0);
  const totalConfigured = groups.reduce((count, group) => count + group.entries.length, 0);

  return (
    <Card
      title={
        <span className={styles.cardTitle}>
          <img src={iconCode0} alt="" className={styles.cardTitleIcon} />
          {t('ai_providers.code0_title')}
        </span>
      }
      extra={
        <div className={styles.code0AddActions}>
          {protocolOrder.map((protocol) => (
            <Button
              key={protocol}
              size="sm"
              variant="secondary"
              onClick={() => onAdd(protocol)}
              disabled={actionsDisabled}
            >
              {t(`ai_providers.code0_add_${protocol}`)}
            </Button>
          ))}
        </div>
      }
    >
      {loading && totalConfigured === 0 ? (
        <div className="hint">{t('common.loading')}</div>
      ) : totalConfigured === 0 ? (
        <div className={styles.code0Empty}>
          <div className={styles.searchEmptyTitle}>{t('ai_providers.code0_empty_title')}</div>
          <div className={styles.searchEmptyDesc}>{t('ai_providers.code0_empty_desc')}</div>
        </div>
      ) : (
        <div className={styles.code0ProtocolList}>
          {configuredGroups.map((group) => {
            const firstEntry = group.entries[0];
            const firstApiKeyPreview = getFirstApiKeyPreview(group);
            const statusData = lookupStatusBar(statusBarBySource, collectStatusCandidates(group));
            const stats =
              group.protocol === 'openai'
                ? group.entries.reduce(
                    (acc, entry) => {
                      const entryStats = getOpenAIProviderStats(
                        entry.config.apiKeyEntries,
                        keyStats,
                        entry.config.prefix
                      );
                      acc.success += entryStats.success;
                      acc.failure += entryStats.failure;
                      return acc;
                    },
                    { success: 0, failure: 0 }
                  )
                : group.entries.reduce(
                    (acc, entry) => {
                      const entryStats = getStatsBySource(
                        entry.config.apiKey,
                        keyStats,
                        entry.config.prefix
                      );
                      acc.success += entryStats.success;
                      acc.failure += entryStats.failure;
                      return acc;
                    },
                    { success: 0, failure: 0 }
                  );
            const disabled =
              group.protocol !== 'openai' &&
              hasDisableAllModelsRule(group.entries[0]?.config.excludedModels);
            const baseUrl = group.entries[0]?.config.baseUrl || group.baseUrl;

            return (
              <div key={group.protocol} className={styles.code0ProtocolRow}>
                <div className={styles.code0ProtocolMeta}>
                  <div className={styles.code0ProtocolHeader}>
                    <span className={styles.code0ProtocolName}>
                      {t(`ai_providers.code0_protocol_${group.protocol}`)}
                    </span>
                    <span className={styles.headerBadge}>
                      {t('ai_providers.code0_entry_count', { count: group.entries.length })}
                    </span>
                    {disabled ? (
                      <span className="status-badge warning">
                        {t('ai_providers.config_disabled_badge')}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{t('common.base_url')}:</span>
                    <span className={styles.fieldValue}>{baseUrl}</span>
                  </div>
                  {firstApiKeyPreview ? (
                    <div className={styles.fieldRow}>
                      <span className={styles.fieldLabel}>{t('common.api_key')}:</span>
                      <span className={styles.fieldValue}>{firstApiKeyPreview}</span>
                    </div>
                  ) : null}
                  <div className={styles.cardStats}>
                    <span className={`${styles.statPill} ${styles.statSuccess}`}>
                      {t('stats.success')}: {stats.success}
                    </span>
                    <span className={`${styles.statPill} ${styles.statFailure}`}>
                      {t('stats.failure')}: {stats.failure}
                    </span>
                  </div>
                  <ProviderStatusBar statusData={statusData} />
                </div>
                <div className={styles.code0ProtocolActions}>
                  {firstEntry ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(group.protocol, firstEntry.index)}
                        disabled={actionsDisabled}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(group.protocol, firstEntry.index)}
                        disabled={actionsDisabled}
                      >
                        {t('common.delete')}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

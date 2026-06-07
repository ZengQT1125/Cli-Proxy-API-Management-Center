import { Fragment, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { monitorApi, type MonitorRequestLogItem, type MonitorRequestLogsQuery } from '@/services/api';
import { useDisableModel } from '@/hooks';
import { TimeRangeSelector, formatTimeRangeCaption, type TimeRange } from './TimeRangeSelector';
import { DisableModelModal } from './DisableModelModal';
import { UnsupportedDisableModal } from './UnsupportedDisableModal';
const CHANNEL_OPTION_SEPARATOR = '@@@';

function parseRequestLogSourceFilterValue(val: string) {
  if (!val) return { source: '', channel: '' };
  const parts = val.split(CHANNEL_OPTION_SEPARATOR);
  return {
    source: parts[0],
    channel: parts[1] || '',
  };
}
import {
  REQUEST_LOG_FILTER_KEYS,
  REQUEST_LOG_TABLE_COLUMN_KEYS,
  REQUEST_LOG_TABLE_COLUMN_WIDTHS,
  REQUEST_LOG_TABLE_HEADER_KEYS,
  REQUEST_LOG_TABLE_MIN_WIDTH,
  type RequestLogFilterKey,
  type RequestLogTableColumnKey,
} from './requestLogColumns';
import {
  formatTimestamp,
  getRateClassName,
  getProviderDisplayParts,
  buildMonitorTimeRangeParams,
  formatCompactTokenNumber,
  maskSecret,
  matchModel,
  type DateRange,
} from '@/utils/monitor';
import styles from '@/pages/MonitorPage.module.scss';

interface RequestLogsProps {
  refreshKey: number;
  loading: boolean;
  providerMap: Record<string, string>;
  providerTypeMap: Record<string, string>;
  providerModels: Record<string, Set<string>>;
  apiFilter: string;
  authIndexMap: Record<string, string>;
}

interface LogEntry {
  id: string;
  timestamp: string;
  timestampMs: number;
  model: string;
  source: string;
  actionSource: string;
  providerName: string | null;
  maskedKey: string;
  failed: boolean;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requestCount: number;
  successRate: number;
  latencyMs: number;
  ttftMs: number;
  recentRequests: { failed: boolean; timestamp: number }[];
  authIndex: string;
}

export function RequestLogs({
  refreshKey,
  loading,
  providerMap,
  providerTypeMap,
  providerModels,
  apiFilter,
  authIndexMap,
}: RequestLogsProps) {
  const { t } = useTranslation();
  const [filterModel, setFilterModel] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'success' | 'failed'>('');
  const [autoRefresh, setAutoRefresh] = useState(10);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchLogDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [timeRange, setTimeRange] = useState<TimeRange>(1);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{
    models: string[];
    sources: string[];
  }>({
    models: [],
    sources: [],
  });

  // 使用禁用模型 Hook
  const {
    disableState,
    unsupportedState,
    disabling,
    isModelDisabled,
    handleDisableClick,
    handleConfirmDisable,
    handleCancelDisable,
    handleCloseUnsupported,
  } = useDisableModel({ providerMap, providerTypeMap, providerModels });

  const handleTimeRangeChange = useCallback((range: TimeRange, custom?: DateRange) => {
    setTimeRange(range);
    setCustomRange(custom);
    setPage(1);
  }, []);

  const toLogEntry = useCallback(
    (item: MonitorRequestLogItem, index: number): LogEntry => {
      const source = item.source || 'unknown';
      const channel = item.channel?.trim();
      const { provider, masked } = getProviderDisplayParts(source, providerMap, item.model, providerModels, channel);
      const timestampMs = item.timestamp ? new Date(item.timestamp).getTime() : 0;
      return {
        id: `${item.timestamp}-${item.api_key}-${channel || source}-${item.model}-${index}`,
        timestamp: item.timestamp,
        timestampMs,
        model: item.model,
        source,
        actionSource: channel || source,
        providerName: provider,
        maskedKey: masked,
        failed: item.failed,
        inputTokens: item.input_tokens || 0,
        outputTokens: item.output_tokens || 0,
        cachedTokens: item.cached_tokens || 0,
        requestCount: item.request_count || 0,
        successRate: item.success_rate || 0,
        latencyMs: item.latency_ms || 0,
        ttftMs: item.ttft_ms || 0,
        recentRequests: (item.recent_requests || []).map((req) => ({
          failed: !!req.failed,
          timestamp: req.timestamp ? new Date(req.timestamp).getTime() : 0,
        })),
        authIndex: item.auth_index || '',
      };
    },
    [providerMap, providerModels]
  );

  // 独立获取日志数据
  const fetchLogData = useCallback(async () => {
    setLogLoading(true);
    try {
      const baseParams: MonitorRequestLogsQuery = {
        api_filter: apiFilter || undefined,
        model: filterModel || undefined,
        source: filterSource || undefined,
        channel: filterChannel || undefined,
        status: filterStatus || undefined,
        ...buildMonitorTimeRangeParams(timeRange, customRange),
      };

      const response = await monitorApi.getRequestLogs({
        ...baseParams,
        page,
        page_size: pageSize,
      });
      const items = (response.items || []).map(toLogEntry);
      setLogEntries(items);
      setTotal(response.total || 0);
      setTotalPages(response.total_pages || 0);
      setFilterOptions((prev) => ({
        models: (filterModel || filterSource) ? prev.models : (response.filters?.models || []),
        sources: filterSource ? prev.sources : (response.filters?.sources || []),
      }));

      const safePage = response.page || page;
      if (safePage !== page) {
        setPage(safePage);
      }
    } catch (err) {
      console.error('日志刷新失败：', err);
      setLogEntries([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLogLoading(false);
    }
  }, [
    page,
    pageSize,
    apiFilter,
    filterModel,
    filterSource,
    filterChannel,
    filterStatus,
    timeRange,
    customRange,
    toLogEntry,
  ]);

  useEffect(() => {
    fetchLogDataRef.current = fetchLogData;
  }, [fetchLogData]);

  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (autoRefresh <= 0) {
      setCountdown(0);
      return;
    }

    setCountdown(autoRefresh);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLogDataRef.current();
          return autoRefresh;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    fetchLogData();
  }, [fetchLogData, refreshKey]);

  const showLoading = (logLoading || loading) && logEntries.length === 0;

  const getCountdownText = () => {
    if (logLoading) {
      return t('monitor.logs.refreshing');
    }
    if (autoRefresh === 0) {
      return t('monitor.logs.manual_refresh');
    }
    if (countdown > 0) {
      return t('monitor.logs.refresh_in_seconds', { seconds: countdown });
    }
    return t('monitor.logs.refreshing');
  };

  const formatNumber = (num: number) => num.toLocaleString('zh-CN');

  const goToPage = (nextPage: number) => {
    if (nextPage < 1) return;
    if (totalPages > 0 && nextPage > totalPages) return;
    setPage(nextPage);
  };

  const renderCell = (entry: LogEntry, column: RequestLogTableColumnKey) => {
    const disabled = isModelDisabled(entry.actionSource, entry.model);
    const authDisplayName = entry.authIndex
      ? authIndexMap[entry.authIndex] || entry.authIndex
      : '-';

    switch (column) {
      case 'auth':
        return (
          <td title={authDisplayName}>{authDisplayName}</td>
        );
      case 'model':
        return <td title={entry.model}>{entry.model}</td>;
      case 'source':
        return (
          <td title={entry.source}>
            {entry.providerName ? (
              <>
                <span className={styles.channelName}>{entry.providerName}</span>
                <span className={styles.channelSecret}> ({entry.maskedKey})</span>
              </>
            ) : (
              entry.maskedKey
            )}
          </td>
        );
      case 'status':
        return (
          <td>
            <span className={`${styles.statusPill} ${entry.failed ? styles.failed : styles.success}`}>
              {entry.failed ? t('monitor.logs.failed') : t('monitor.logs.success')}
            </span>
          </td>
        );
      case 'recent':
        return (
          <td>
            <div className={styles.statusBars}>
              {entry.recentRequests.map((req, idx) => (
                <div
                  key={idx}
                  className={`${styles.statusBar} ${req.failed ? styles.failure : styles.success}`}
                />
              ))}
            </div>
          </td>
        );
      case 'rate':
        return (
          <td className={getRateClassName(entry.successRate, styles)}>
            {entry.successRate.toFixed(1)}%
          </td>
        );
      case 'count':
        return <td>{formatNumber(entry.requestCount)}</td>;
      case 'timing': {
        const ttft = entry.ttftMs > 0 ? (entry.ttftMs / 1000).toFixed(2) : '-';
        const latency = entry.latencyMs > 0 ? (entry.latencyMs / 1000).toFixed(2) : '-';
        const titleParts: string[] = [];
        if (entry.ttftMs > 0) titleParts.push(`TTFT: ${formatNumber(entry.ttftMs)}ms`);
        if (entry.latencyMs > 0) titleParts.push(`Latency: ${formatNumber(entry.latencyMs)}ms`);
        return (
          <td className={styles.tokenCell} title={titleParts.join(' / ') || '-'}>
            {ttft === '-' && latency === '-' ? '-' : (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>{ttft}</span>
                {' / '}
                {latency}
              </>
            )}
          </td>
        );
      }
      case 'toks': {
        if (entry.latencyMs <= 0 || entry.outputTokens <= 0) return <td className={styles.tokenCell}>-</td>;
        const toks = (entry.outputTokens / (entry.latencyMs / 1000)).toFixed(1);
        return <td className={styles.tokenCell}>{toks}</td>;
      }
      case 'input':
        return (
          <td className={styles.tokenCell} title={formatNumber(entry.inputTokens)}>
            {formatCompactTokenNumber(entry.inputTokens)}
          </td>
        );
      case 'output':
        return (
          <td className={styles.tokenCell} title={formatNumber(entry.outputTokens)}>
            {formatCompactTokenNumber(entry.outputTokens)}
          </td>
        );
      case 'cache':
        return (
          <td className={styles.tokenCell} title={formatNumber(entry.cachedTokens)}>
            {formatCompactTokenNumber(entry.cachedTokens)}
          </td>
        );
      case 'time':
        return <td>{formatTimestamp(entry.timestamp)}</td>;
      case 'actions':
        return (
          <td>
            {entry.actionSource && entry.actionSource !== '-' && entry.actionSource !== 'unknown' ? (
              disabled ? (
                <span className={styles.disabledLabel}>{t('monitor.logs.disabled')}</span>
              ) : (
                <button
                  className={styles.disableBtn}
                  title={t('monitor.logs.disable_model')}
                  onClick={() => handleDisableClick(entry.actionSource, entry.model)}
                >
                  {t('monitor.logs.disable')}
                </button>
              )
            ) : (
              '-'
            )}
          </td>
        );
    }
  };

  const renderRow = (entry: LogEntry) => {
    return (
      <>
        {REQUEST_LOG_TABLE_COLUMN_KEYS.map((column) => (
          <Fragment key={column}>{renderCell(entry, column)}</Fragment>
        ))}
      </>
    );
  };

  // 生成渠道选择下拉菜单选项（解决相同 API Key 时的渠道分拆，且仅显示当前时间范围内有调用记录的渠道）
  const sourceOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    filterOptions.sources.forEach((source) => {
      const resolved = providerMap[source];
      const masked = maskSecret(source);
      if (resolved) {
        const candidates = resolved.split(',');
        if (candidates.length <= 1) {
          options.push({
            value: source,
            label: `${resolved} (${masked})`,
          });
        } else {
          // 如果有多个候选渠道，我们根据当前时间范围内的 models 过滤出有调用记录的渠道
          const activeModels = filterOptions.models || [];
          if (activeModels.length === 0) {
            // 如果没有活跃模型（例如无日志），默认显示所有候选渠道供用户选择
            candidates.forEach((candidate) => {
              options.push({
                value: `${source}${CHANNEL_OPTION_SEPARATOR}${candidate}`,
                label: `${candidate} (${masked})`,
              });
            });
          } else {
            // 找出每个活跃模型匹配的候选渠道
            const activeCandidates = new Set<string>();
            activeModels.forEach((activeModel) => {
              let matchedExplicitly = false;
              // 1. 尝试显式匹配
              candidates.forEach((candidate) => {
                const models = providerModels[candidate];
                if (models) {
                  for (const m of models) {
                    if (matchModel(activeModel, m)) {
                      activeCandidates.add(candidate);
                      matchedExplicitly = true;
                      break;
                    }
                  }
                }
              });
              
              // 2. 如果没有任何渠道显式匹配该活跃模型，归入空配置（catch-all）的渠道
              if (!matchedExplicitly) {
                candidates.forEach((candidate) => {
                  const models = providerModels[candidate];
                  if (!models || models.size === 0) {
                    activeCandidates.add(candidate);
                  }
                });
              }
            });
            
            // 将过滤后活跃的候选渠道加入选项
            if (activeCandidates.size > 0) {
              activeCandidates.forEach((candidate) => {
                options.push({
                  value: `${source}${CHANNEL_OPTION_SEPARATOR}${candidate}`,
                  label: `${candidate} (${masked})`,
                });
              });
            } else {
              // 兜底：如果没有匹配的活跃渠道，显示所有候选渠道
              candidates.forEach((candidate) => {
                options.push({
                  value: `${source}${CHANNEL_OPTION_SEPARATOR}${candidate}`,
                  label: `${candidate} (${masked})`,
                });
              });
            }
          }
        }
      } else {
        options.push({
          value: source,
          label: masked,
        });
      }
    });
    // 去重，以防有重复 durable value
    const seen = new Set<string>();
    return options.filter((opt) => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [filterOptions.sources, filterOptions.models, providerMap, providerModels]);

  const currentSelectValue = useMemo(() => {
    if (!filterSource) return '';
    if (filterChannel) return `${filterSource}${CHANNEL_OPTION_SEPARATOR}${filterChannel}`;
    return filterSource;
  }, [filterSource, filterChannel]);

  const renderFilterSelect = (filterKey: RequestLogFilterKey) => {
    switch (filterKey) {
      case 'model':
        return (
          <select
            key={filterKey}
            className={styles.logSelect}
            value={filterModel}
            onChange={(e) => {
              setFilterModel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('monitor.logs.all_models')}</option>
            {filterOptions.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        );
      case 'source':
        return (
          <select
            key={filterKey}
            className={styles.logSelect}
            value={currentSelectValue}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setFilterSource('');
                setFilterChannel('');
              } else {
                const { source, channel } = parseRequestLogSourceFilterValue(val);
                setFilterSource(source);
                setFilterChannel(channel);
              }
              setPage(1);
            }}
          >
            <option value="">{t('monitor.logs.all_sources')}</option>
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'status':
        return (
          <select
            key={filterKey}
            className={styles.logSelect}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as '' | 'success' | 'failed');
              setPage(1);
            }}
          >
            <option value="">{t('monitor.logs.all_status')}</option>
            <option value="success">{t('monitor.logs.success')}</option>
            <option value="failed">{t('monitor.logs.failed')}</option>
          </select>
        );
    }
  };

  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <>
      <Card
        title={t('monitor.logs.title')}
        subtitle={
          <span>
            {formatTimeRangeCaption(timeRange, customRange, t)} ·{' '}
            {t('monitor.logs.showing', { start: pageStart, end: pageEnd, total })}
            <span style={{ color: 'var(--text-tertiary)' }}>
              {' '}
              · {t('monitor.logs.scroll_hint')}
            </span>
          </span>
        }
        extra={
          <TimeRangeSelector
            value={timeRange}
            onChange={handleTimeRangeChange}
            customRange={customRange}
          />
        }
      >
        <div className={styles.logFilters}>
          {REQUEST_LOG_FILTER_KEYS.map(renderFilterSelect)}

          <span className={styles.logLastUpdate}>{getCountdownText()}</span>

          <select
            className={styles.logSelect}
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(Number(e.target.value))}
          >
            <option value="0">{t('monitor.logs.manual_refresh')}</option>
            <option value="5">{t('monitor.logs.refresh_5s')}</option>
            <option value="10">{t('monitor.logs.refresh_10s')}</option>
            <option value="15">{t('monitor.logs.refresh_15s')}</option>
            <option value="30">{t('monitor.logs.refresh_30s')}</option>
            <option value="60">{t('monitor.logs.refresh_60s')}</option>
          </select>

          <select
            className={styles.logSelect}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="20">{t('monitor.logs.page_size_20')}</option>
            <option value="50">{t('monitor.logs.page_size_50')}</option>
            <option value="100">{t('monitor.logs.page_size_100')}</option>
          </select>
        </div>

        <div className={styles.logTableWrapper}>
          {showLoading ? (
            <div className={styles.emptyState}>{t('common.loading')}</div>
          ) : logEntries.length === 0 ? (
            <div className={styles.emptyState}>{t('monitor.no_data')}</div>
          ) : (
            <table
              className={`${styles.table} ${styles.virtualTable}`}
              style={{ minWidth: REQUEST_LOG_TABLE_MIN_WIDTH }}
            >
              <colgroup>
                {REQUEST_LOG_TABLE_COLUMN_KEYS.map((column) => (
                  <col key={column} style={{ width: REQUEST_LOG_TABLE_COLUMN_WIDTHS[column] }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {REQUEST_LOG_TABLE_COLUMN_KEYS.map((column) => (
                    <th key={column}>{t(REQUEST_LOG_TABLE_HEADER_KEYS[column])}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logEntries.map((entry) => (
                  <tr key={entry.id}>{renderRow(entry)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 0 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} onClick={() => goToPage(1)} disabled={page <= 1}>
              {t('monitor.logs.first_page')}
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              {t('monitor.logs.prev_page')}
            </button>
            <span className={styles.pageBtn}>
              {t('monitor.logs.page_info', { current: page, total: totalPages })}
            </span>
            <button
              className={styles.pageBtn}
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              {t('monitor.logs.next_page')}
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => goToPage(totalPages)}
              disabled={page >= totalPages}
            >
              {t('monitor.logs.last_page')}
            </button>
          </div>
        )}

        {logEntries.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              marginTop: 8,
            }}
          >
            {t('monitor.logs.total_count', { count: total })}
          </div>
        )}
      </Card>

      <DisableModelModal
        disableState={disableState}
        disabling={disabling}
        onConfirm={handleConfirmDisable}
        onCancel={handleCancelDisable}
      />

      <UnsupportedDisableModal state={unsupportedState} onClose={handleCloseUnsupported} />
    </>
  );
}

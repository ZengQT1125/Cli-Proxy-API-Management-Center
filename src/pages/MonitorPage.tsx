import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useThemeStore } from '@/stores';
import { monitorApi } from '@/services/api';
import type { MonitorDashboardResponse } from '@/services/api/monitor';
import { buildMonitorTimeRangeParams } from '@/utils/monitor';
import { KpiCards } from '@/components/monitor/KpiCards';
import { ModelDistributionChart } from '@/components/monitor/ModelDistributionChart';
import { DailyTrendChart } from '@/components/monitor/DailyTrendChart';
import { HourlyModelChart } from '@/components/monitor/HourlyModelChart';
import { HourlyTokenChart } from '@/components/monitor/HourlyTokenChart';
import { ChannelStats } from '@/components/monitor/ChannelStats';
import { FailureAnalysis } from '@/components/monitor/FailureAnalysis';
import { RequestLogs } from '@/components/monitor/RequestLogs';
import { ServiceHealthCard } from '@/components/monitor/ServiceHealthCard';
import styles from './MonitorPage.module.scss';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 时间范围选项
export type TimeRange = 'yesterday' | 'dayBeforeYesterday' | 1 | 7 | 14 | 30;
type StatsTab = 'channel' | 'failure';

export function MonitorPage() {
  const { t } = useTranslation();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const isDark = resolvedTheme === 'dark';

  // 状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [apiFilter, setApiFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeStatsTab, setActiveStatsTab] = useState<StatsTab>('channel');
  const [providerMap, setProviderMap] = useState<Record<string, string>>({});
  const [providerModels, setProviderModels] = useState<Record<string, Set<string>>>({});
  // 首屏 overview 合并包：kpi/趋势/小时图/分布/健康一次拉齐，避免 6+ 路齐射 SQLite
  const [dashboard, setDashboard] = useState<{
    key: string;
    data: MonitorDashboardResponse | null;
  } | null>(null);

  const overviewKey = `${timeRange}\0${apiFilter}`;
  const hourlyPreloadKey = `${timeRange}\0${apiFilter}\0${12}`;

  // 渠道展示名 / 模型归属：后端一次合成，不再打 auth-files / *-api-key
  const loadProviderMap = useCallback(async () => {
    try {
      const data = await monitorApi.getProviderMap();
      const modelsMap: Record<string, Set<string>> = {};
      Object.entries(data.models || {}).forEach(([key, names]) => {
        modelsMap[key] = new Set((names || []).filter(Boolean));
      });
      setProviderMap(data.providers || {});
      setProviderModels(modelsMap);
    } catch (err) {
      console.warn('Monitor: Failed to load provider map:', err);
    }
  }, []);

  // 加载数据：provider map + 触发底表 refreshKey；overview 由独立 effect 拉取
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadProviderMap();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.unknown_error');
      console.error('Monitor: Error loading data:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [t, loadProviderMap]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 响应头部刷新
  useHeaderRefresh(loadData);

  // overview 合并包：跟随页面时间范围 / API 过滤；与 provider map 解耦
  useEffect(() => {
    let cancelled = false;
    const key = overviewKey;
    (async () => {
      try {
        const data = await monitorApi.getDashboard({
          ...buildMonitorTimeRangeParams(timeRange),
          ...(apiFilter ? { api_filter: apiFilter } : {}),
          hours: 12,
          hourly_model_limit: 6,
          channel_limit: 100,
        });
        if (!cancelled) setDashboard({ key, data });
      } catch (err) {
        console.error('Monitor: dashboard load failed:', err);
        if (!cancelled) setDashboard({ key, data: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [overviewKey, timeRange, apiFilter, refreshKey]);

  // 处理时间范围变化
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  // 处理 API 过滤应用（触发数据刷新）
  const handleApiFilterApply = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className={styles.container}>
      {loading && refreshKey === 0 && (
        <div className={styles.loadingOverlay} aria-busy="true">
          <div className={styles.loadingOverlayContent}>
            <LoadingSpinner size={28} className={styles.loadingOverlaySpinner} />
            <span className={styles.loadingOverlayText}>{t('common.loading')}</span>
          </div>
        </div>
      )}

      {/* 页面标题 */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t('monitor.title')}</h1>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? t('common.loading') : t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && <div className={styles.errorBox}>{error}</div>}

      {/* 时间范围和 API 过滤 */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('monitor.time_range')}</span>
          <div className={styles.timeButtons}>
            <button
              className={`${styles.timeButton} ${timeRange === 'dayBeforeYesterday' ? styles.active : ''}`}
              onClick={() => handleTimeRangeChange('dayBeforeYesterday')}
            >
              {t('monitor.day_before_yesterday')}
            </button>
            <button
              className={`${styles.timeButton} ${timeRange === 'yesterday' ? styles.active : ''}`}
              onClick={() => handleTimeRangeChange('yesterday')}
            >
              {t('monitor.yesterday')}
            </button>
            {([1, 7, 14, 30] as TimeRange[]).map((range) => (
              <button
                key={range}
                className={`${styles.timeButton} ${timeRange === range ? styles.active : ''}`}
                onClick={() => handleTimeRangeChange(range)}
              >
                {range === 1 ? t('monitor.today') : t('monitor.last_n_days', { n: range })}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('monitor.api_filter')}</span>
          <input
            type="text"
            className={styles.filterInput}
            placeholder={t('monitor.api_filter_placeholder')}
            value={apiFilter}
            onChange={(e) => setApiFilter(e.target.value)}
          />
          <Button variant="secondary" size="sm" onClick={handleApiFilterApply}>
            {t('monitor.apply')}
          </Button>
        </div>
      </div>

      {/* KPI 卡片 */}
      <KpiCards
        timeRange={timeRange}
        apiFilter={apiFilter}
        preloaded={dashboard?.key === overviewKey ? dashboard.data?.kpi ?? null : undefined}
        preloadedKey={overviewKey}
      />

      {/* 图表区域 */}
      <div className={styles.chartsGrid}>
        <ModelDistributionChart
          timeRange={timeRange}
          apiFilter={apiFilter}
          isDark={isDark}
          providerMap={providerMap}
          preloadedChannelStats={
            dashboard?.key === overviewKey ? dashboard.data?.channel_stats.items ?? [] : undefined
          }
          preloadedKey={overviewKey}
        />
        <DailyTrendChart
          timeRange={timeRange}
          apiFilter={apiFilter}
          isDark={isDark}
          preloadedItems={
            dashboard?.key === overviewKey ? dashboard.data?.daily_trend.items ?? [] : undefined
          }
          preloadedKey={overviewKey}
        />
      </div>

      {/* 小时级图表（默认 12h 吃 dashboard；切 6/24 时组件自行请求） */}
      <HourlyModelChart
        timeRange={timeRange}
        apiFilter={apiFilter}
        isDark={isDark}
        preloaded={
          dashboard?.key === overviewKey ? dashboard.data?.hourly_models : undefined
        }
        preloadedKey={hourlyPreloadKey}
      />
      <HourlyTokenChart
        timeRange={timeRange}
        apiFilter={apiFilter}
        isDark={isDark}
        preloaded={
          dashboard?.key === overviewKey ? dashboard.data?.hourly_tokens : undefined
        }
        preloadedKey={hourlyPreloadKey}
      />

      {/* 服务健康热力图 */}
      <ServiceHealthCard
        preloaded={dashboard?.key === overviewKey ? dashboard.data?.service_health ?? null : undefined}
        preloadedReady={dashboard?.key === overviewKey}
      />

      {/* 统计表格 */}
      <div className={styles.statsSection}>
        <div className={styles.statsTabs} role="tablist" aria-label={t('monitor.title')}>
          <button
            id="monitor-stats-tab-channel"
            type="button"
            role="tab"
            aria-selected={activeStatsTab === 'channel'}
            aria-controls="monitor-stats-panel-channel"
            className={`${styles.statsTabButton} ${activeStatsTab === 'channel' ? styles.statsTabButtonActive : ''}`}
            onClick={() => setActiveStatsTab('channel')}
          >
            {t('monitor.channel.title')}
          </button>
          <button
            id="monitor-stats-tab-failure"
            type="button"
            role="tab"
            aria-selected={activeStatsTab === 'failure'}
            aria-controls="monitor-stats-panel-failure"
            className={`${styles.statsTabButton} ${activeStatsTab === 'failure' ? styles.statsTabButtonActive : ''}`}
            onClick={() => setActiveStatsTab('failure')}
          >
            {t('monitor.failure.title')}
          </button>
        </div>
        <div
          id={`monitor-stats-panel-${activeStatsTab}`}
          className={styles.statsTabPanel}
          role="tabpanel"
          aria-labelledby={`monitor-stats-tab-${activeStatsTab}`}
        >
          {activeStatsTab === 'channel' ? (
            <ChannelStats refreshKey={refreshKey} loading={loading} providerMap={providerMap} providerModels={providerModels} />
          ) : (
            <FailureAnalysis refreshKey={refreshKey} loading={loading} providerMap={providerMap} providerModels={providerModels} />
          )}
        </div>
      </div>

      {/* 请求日志 */}
      <RequestLogs
        refreshKey={refreshKey}
        loading={loading}
        providerMap={providerMap}
        apiFilter={apiFilter}
      />
    </div>
  );
}

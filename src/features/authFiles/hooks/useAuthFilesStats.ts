import { useCallback, useRef, useState } from 'react';
import { monitorApi, type MonitorKeyStatsResponse } from '@/services/api/monitor';
import {
  blocksToStatusBarData,
  normalizeAuthIndex,
  type KeyStats,
  type StatusBarData,
} from '@/utils/usage';

const STALE_TIME_MS = 240_000;

const EMPTY_KEY_STATS: KeyStats = { bySource: {}, byAuthIndex: {} };

function processKeyStatsResponse(response: MonitorKeyStatsResponse) {
  const { by_source, by_auth_index, block_config } = response;

  const bySource: Record<string, { success: number; failure: number }> = {};
  const byAuthIndex: Record<string, { success: number; failure: number }> = {};
  const statusBarByAuthIndex = new Map<string, StatusBarData>();

  for (const [key, entry] of Object.entries(by_source)) {
    bySource[key] = { success: entry.success, failure: entry.failure };
  }
  for (const [key, entry] of Object.entries(by_auth_index)) {
    byAuthIndex[key] = { success: entry.success, failure: entry.failure };
    statusBarByAuthIndex.set(
      key,
      blocksToStatusBarData(entry.blocks, block_config.window_start_ms, block_config.duration_ms)
    );
  }

  return {
    keyStats: { bySource, byAuthIndex } as KeyStats,
    statusBarByAuthIndex,
  };
}

export type UseAuthFilesStatsResult = {
  keyStats: KeyStats;
  statusBarByAuthIndex: Map<string, StatusBarData>;
  loadKeyStats: () => Promise<void>;
  refreshKeyStats: () => Promise<void>;
  refreshKeyStatsForAuthIndex: (authIndex: unknown) => Promise<void>;
};

export function useAuthFilesStats(): UseAuthFilesStatsResult {
  const [keyStats, setKeyStats] = useState<KeyStats>(EMPTY_KEY_STATS);
  const [statusBarByAuthIndex, setStatusBarByAuthIndex] = useState<Map<string, StatusBarData>>(
    () => new Map()
  );
  const lastRefreshedAt = useRef<number | null>(null);

  const loadKeyStats = useCallback(async () => {
    if (lastRefreshedAt.current && Date.now() - lastRefreshedAt.current < STALE_TIME_MS) {
      return;
    }
    try {
      const response = await monitorApi.getKeyStats();
      const result = processKeyStatsResponse(response);
      setKeyStats(result.keyStats);
      setStatusBarByAuthIndex(result.statusBarByAuthIndex);
      lastRefreshedAt.current = Date.now();
    } catch {
      // silent
    }
  }, []);

  const refreshKeyStats = useCallback(async () => {
    try {
      const response = await monitorApi.getKeyStats();
      const result = processKeyStatsResponse(response);
      setKeyStats(result.keyStats);
      setStatusBarByAuthIndex(result.statusBarByAuthIndex);
      lastRefreshedAt.current = Date.now();
    } catch {
      // silent
    }
  }, []);

  const refreshKeyStatsForAuthIndex = useCallback(async (authIndex: unknown) => {
    const normalizedAuthIndex = normalizeAuthIndex(authIndex);
    if (!normalizedAuthIndex) {
      return;
    }

    try {
      const response = await monitorApi.getKeyStats({ auth_index: normalizedAuthIndex });
      if (normalizeAuthIndex(response.filter?.auth_index) !== normalizedAuthIndex) {
        return;
      }

      const result = processKeyStatsResponse(response);
      const nextStats = result.keyStats.byAuthIndex[normalizedAuthIndex];
      const nextStatusBar = result.statusBarByAuthIndex.get(normalizedAuthIndex);
      const emptyStatusBar = blocksToStatusBarData(
        Array.from({ length: response.block_config.count }, () => ({ success: 0, failure: 0 })),
        response.block_config.window_start_ms,
        response.block_config.duration_ms
      );

      setKeyStats((prev) => {
        const byAuthIndex = { ...prev.byAuthIndex };
        byAuthIndex[normalizedAuthIndex] = nextStats ?? { success: 0, failure: 0 };
        return { bySource: prev.bySource, byAuthIndex };
      });

      setStatusBarByAuthIndex((prev) => {
        const next = new Map(prev);
        next.set(normalizedAuthIndex, nextStatusBar ?? emptyStatusBar);
        return next;
      });
    } catch {
      // silent
    }
  }, []);

  return {
    keyStats,
    statusBarByAuthIndex,
    loadKeyStats,
    refreshKeyStats,
    refreshKeyStatsForAuthIndex,
  };
}

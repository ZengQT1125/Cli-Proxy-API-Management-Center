import type { ApiKeyEntry } from '@/types';
import { buildCandidateUsageSourceIds, type KeyStatBucket, type KeyStats } from '@/utils/usage';
export {
  buildCodexResponsesEndpoint,
  buildClaudeMessagesEndpoint,
  buildGeminiGenerateContentEndpoint,
  buildOpenAIChatCompletionsEndpoint,
  buildOpenAIModelsEndpoint,
  normalizeClaudeBaseUrl,
  normalizeOpenAIBaseUrl,
} from './providerRequests';

export const DISABLE_ALL_MODELS_RULE = '*';

export const hasDisableAllModelsRule = (models?: string[]) =>
  Array.isArray(models) &&
  models.some((model) => String(model ?? '').trim() === DISABLE_ALL_MODELS_RULE);

export const stripDisableAllModelsRule = (models?: string[]) =>
  Array.isArray(models)
    ? models.filter((model) => String(model ?? '').trim() !== DISABLE_ALL_MODELS_RULE)
    : [];

export const withDisableAllModelsRule = (models?: string[]) => {
  const base = stripDisableAllModelsRule(models);
  return [...base, DISABLE_ALL_MODELS_RULE];
};

export const withoutDisableAllModelsRule = (models?: string[]) => {
  const base = stripDisableAllModelsRule(models);
  return base;
};

export const parseTextList = (text: string): string[] =>
  text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const parseExcludedModels = parseTextList;

export const excludedModelsToText = (models?: string[]) =>
  Array.isArray(models) ? models.join('\n') : '';

// 根据 source (apiKey) 获取统计数据 - 与旧版逻辑一致
export const getStatsBySource = (
  apiKey: string,
  keyStats: KeyStats,
  prefix?: string
): KeyStatBucket => {
  const bySource = keyStats.bySource ?? {};
  const candidates = buildCandidateUsageSourceIds({ apiKey, prefix });
  if (!candidates.length) {
    return { success: 0, failure: 0 };
  }

  let success = 0;
  let failure = 0;
  candidates.forEach((candidate) => {
    const stats = bySource[candidate];
    if (!stats) return;
    success += stats.success;
    failure += stats.failure;
  });

  return { success, failure };
};

// 对于 OpenAI 提供商，汇总所有 apiKeyEntries 的统计 - 与旧版逻辑一致
export const getOpenAIProviderStats = (
  apiKeyEntries: ApiKeyEntry[] | undefined,
  keyStats: KeyStats,
  providerPrefix?: string
): KeyStatBucket => {
  const bySource = keyStats.bySource ?? {};

  const sourceIds = new Set<string>();
  buildCandidateUsageSourceIds({ prefix: providerPrefix }).forEach((id) => sourceIds.add(id));
  (apiKeyEntries || []).forEach((entry) => {
    buildCandidateUsageSourceIds({ apiKey: entry?.apiKey }).forEach((id) => sourceIds.add(id));
  });

  let success = 0;
  let failure = 0;
  sourceIds.forEach((id) => {
    const stats = bySource[id];
    if (!stats) return;
    success += stats.success;
    failure += stats.failure;
  });

  return { success, failure };
};

export const buildApiKeyEntry = (input?: Partial<ApiKeyEntry>): ApiKeyEntry => ({
  apiKey: input?.apiKey ?? '',
  proxyUrl: input?.proxyUrl ?? '',
});

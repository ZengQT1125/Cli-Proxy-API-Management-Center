import type { GeminiKeyConfig, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';

export const CODE0_PROVIDER_NAME = 'code0';
export const CODE0_DISPLAY_NAME = 'Code0';
export const CODE0_AFFILIATE_URL = 'https://code0.ai/agent/register/slxVMR3uVBoRgNBf';
export const CODE0_BASE_URL = 'https://code0.ai';
export const CODE0_OPENAI_BASE_URL = `${CODE0_BASE_URL}/v1`;
export const CODE0_CODEX_BASE_URL = CODE0_OPENAI_BASE_URL;
export const CODE0_CLAUDE_BASE_URL = CODE0_BASE_URL;
export const CODE0_GEMINI_BASE_URL = CODE0_BASE_URL;

export type Code0Protocol = 'openai' | 'claude' | 'gemini' | 'codex';

export interface IndexedProviderConfig<TConfig> {
  config: TConfig;
  index: number;
}

const normalizeText = (value: string | undefined | null): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export const normalizeCode0BaseUrl = (value: string | undefined | null): string =>
  normalizeText(value).replace(/\/+$/, '');

const matchesAnyCode0BaseUrl = (
  value: string | undefined | null,
  targets: readonly string[]
): boolean => {
  const normalized = normalizeCode0BaseUrl(value);
  return targets.some((target) => normalized === normalizeCode0BaseUrl(target));
};

export const isCode0OpenAIProvider = (
  config: OpenAIProviderConfig | undefined | null
): boolean => {
  if (!config) return false;
  return (
    normalizeText(config.name) === CODE0_PROVIDER_NAME ||
    matchesAnyCode0BaseUrl(config.baseUrl, [CODE0_OPENAI_BASE_URL, CODE0_CODEX_BASE_URL])
  );
};

export const isCode0CodexConfig = (config: ProviderKeyConfig | undefined | null): boolean => {
  if (!config) return false;
  return matchesAnyCode0BaseUrl(config.baseUrl, [CODE0_CODEX_BASE_URL]);
};

export const isCode0ClaudeConfig = (config: ProviderKeyConfig | undefined | null): boolean => {
  if (!config) return false;
  return matchesAnyCode0BaseUrl(config.baseUrl, [CODE0_CLAUDE_BASE_URL]);
};

export const isCode0GeminiConfig = (config: GeminiKeyConfig | undefined | null): boolean => {
  if (!config) return false;
  return matchesAnyCode0BaseUrl(config.baseUrl, [CODE0_GEMINI_BASE_URL]);
};


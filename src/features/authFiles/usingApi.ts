import { parseDisableCoolingValue } from './websockets.ts';

export const AUTH_FILE_USING_API_PROVIDERS = new Set(['xai', 'grok']);

const normalizeProviderKey = (value: string): string => value.trim().toLowerCase();

export const supportsAuthFileUsingApi = (providerKey: string): boolean =>
  AUTH_FILE_USING_API_PROVIDERS.has(normalizeProviderKey(providerKey));

export const readAuthFileUsingApi = (value: Record<string, unknown>): boolean =>
  parseDisableCoolingValue(value.using_api) ?? false;

export const applyAuthFileUsingApi = (
  value: Record<string, unknown>,
  usingApi: boolean
): Record<string, unknown> => ({ ...value, using_api: usingApi });

import { openAIModelPricing } from '../data/openaiPricing.generated.ts';

export interface ModelPricing {
  inputPrice: number;
  outputPrice: number;
  cacheReadPrice?: number;
  cacheWritePrice?: number;
  cacheReadPriceHigh?: number;
  cacheWritePriceHigh?: number;
  inputPriceHigh?: number;
  outputPriceHigh?: number;
  tierThreshold?: number;
}

export interface CostCalculationOptions {
  applyLongContextTier?: boolean;
}

const TOKENS_PER_MILLION = 1_000_000;
const CLAUDE_CACHE_READ_MULTIPLIER = 0.1;
const GEMINI_LONG_CONTEXT_THRESHOLD = 200_000;

const modelPricing: Record<string, ModelPricing> = {
  'claude-sonnet-5': { inputPrice: 3, outputPrice: 15 },
  'claude-sonnet-4-6': { inputPrice: 3, outputPrice: 15 },
  'claude-sonnet-4-5': {
    inputPrice: 3,
    outputPrice: 15,
    inputPriceHigh: 6,
    outputPriceHigh: 22.5,
  },
  'claude-sonnet-4-0': {
    inputPrice: 3,
    outputPrice: 15,
    inputPriceHigh: 6,
    outputPriceHigh: 22.5,
  },
  'claude-haiku-4-5': { inputPrice: 1, outputPrice: 5 },
  'claude-opus-4-1': { inputPrice: 15, outputPrice: 75 },
  'claude-opus-4-0': { inputPrice: 15, outputPrice: 75 },
  'claude-opus-4-6': { inputPrice: 5, outputPrice: 25 },
  'claude-opus-4-7': { inputPrice: 5, outputPrice: 25 },
  'claude-opus-4-8': { inputPrice: 5, outputPrice: 25 },
  'claude-fable-5': { inputPrice: 10, outputPrice: 50 },
  'claude-opus-4-5': { inputPrice: 5, outputPrice: 25 },
  'claude-3-7-sonnet': { inputPrice: 3, outputPrice: 15 },
  'claude-3-5-sonnet': { inputPrice: 3, outputPrice: 15 },
  'claude-3-5-haiku': { inputPrice: 0.8, outputPrice: 4 },
  'claude-3-opus': { inputPrice: 15, outputPrice: 75 },
  'claude-3-sonnet': { inputPrice: 3, outputPrice: 15 },
  'claude-3-haiku': { inputPrice: 0.25, outputPrice: 1.25 },
  'claude-opus': { inputPrice: 5, outputPrice: 25 },
  'claude-sonnet': { inputPrice: 3, outputPrice: 15 },
  'claude-haiku': { inputPrice: 1, outputPrice: 5 },

  ...openAIModelPricing,

  'gemini-3.5-flash': {
    inputPrice: 1.5,
    outputPrice: 9,
    cacheReadPrice: 0.15,
  },
  'gemini-3-5-flash': {
    inputPrice: 1.5,
    outputPrice: 9,
    cacheReadPrice: 0.15,
  },
  'gemini-3.1-pro': {
    inputPrice: 2,
    outputPrice: 12,
    cacheReadPrice: 0.2,
    inputPriceHigh: 4,
    outputPriceHigh: 18,
    cacheReadPriceHigh: 0.4,
  },
  'gemini-3-pro': {
    inputPrice: 2,
    outputPrice: 12,
    inputPriceHigh: 4,
    outputPriceHigh: 18,
  },
  'gemini-3-flash': { inputPrice: 0.5, outputPrice: 3 },
  'gemini-3.1-flash-lite': { inputPrice: 0.25, outputPrice: 1.5 },
  'gemini-2.5-pro': {
    inputPrice: 1.25,
    outputPrice: 10,
    inputPriceHigh: 2.5,
    outputPriceHigh: 15,
  },
  'gemini-2.5-flash': { inputPrice: 0.3, outputPrice: 2.5 },
  'gemini-2.5-flash-lite': { inputPrice: 0.1, outputPrice: 0.4 },
  'gemini-2.0-flash': { inputPrice: 0.1, outputPrice: 0.4 },
  'gemini-2.0-flash-lite': { inputPrice: 0.075, outputPrice: 0.3 },
  'gemini-1.5-pro': { inputPrice: 1.25, outputPrice: 5 },
  'gemini-1.5-flash': { inputPrice: 0.2, outputPrice: 0.6 },
};

const modelAliases: Record<string, string> = {
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-5',
  'claude-haiku-4-5-20251001': 'claude-haiku-4-5',
  'claude-opus-4-1-20250805': 'claude-opus-4-1',
  'claude-sonnet-4-20250514': 'claude-sonnet-4-0',
  'claude-opus-4-20250514': 'claude-opus-4-0',
  'claude-3-7-sonnet-20250219': 'claude-3-7-sonnet',
  'claude-3-7-sonnet-latest': 'claude-3-7-sonnet',
  'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet',
  'claude-3-5-sonnet-20240620': 'claude-3-5-sonnet',
  'claude-3-5-sonnet-latest': 'claude-3-5-sonnet',
  'claude-3-5-haiku-20241022': 'claude-3-5-haiku',
  'claude-3-5-haiku-latest': 'claude-3-5-haiku',
  'claude-3-opus-20240229': 'claude-3-opus',
  'claude-3-opus-latest': 'claude-3-opus',
  'claude-3-sonnet-20240229': 'claude-3-sonnet',
  'claude-3-sonnet-latest': 'claude-3-sonnet',
  'claude-3-haiku-20240307': 'claude-3-haiku',
  'claude-3-haiku-latest': 'claude-3-haiku',
  'gpt-5-search-api': 'gpt-5',
  'chatgpt-4o-latest': 'gpt-4o',
  'gpt-4o-mini-search-preview': 'gpt-4o-mini',
  'gpt-4o-search-preview': 'gpt-4o',
  'gpt-4-turbo-2024-04-09': 'gpt-4-turbo',
  'gpt-4-0125-preview': 'gpt-4-turbo',
  'gpt-4-1106-preview': 'gpt-4-turbo',
  'gpt-4-1106-vision-preview': 'gpt-4-turbo',
  'gpt-4-0613': 'gpt-4',
  'gpt-4-0314': 'gpt-4',
  'gpt-3.5-turbo-0125': 'gpt-3.5-turbo',
  'gpt-3.5-turbo-1106': 'gpt-3.5-turbo',
  'gpt-3.5-turbo-0613': 'gpt-3.5-turbo',
  'gpt-3.5-0301': 'gpt-3.5-turbo',
  'gpt-3.5-turbo-instruct': 'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k-0613': 'gpt-3.5-turbo',
  'gemini-claude-opus-4-6-thinking': 'claude-opus-4-6',
  'gemini-claude-opus-4-5-thinking': 'claude-opus-4-5',
  'gemini-claude-sonnet-4-5-thinking': 'claude-sonnet-4-5',
  'gemini-claude-sonnet-4-5': 'claude-sonnet-4-5',
};

const fuzzyPrefixes = [
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-opus-4-1',
  'claude-sonnet-4-0',
  'claude-opus-4-0',
  'claude-3-7-sonnet',
  'claude-3-5-sonnet',
  'claude-3-5-haiku',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'claude-opus',
  'claude-sonnet',
  'claude-haiku',
  'gemini-3.5-flash',
  'gemini-3-5-flash',
  'gemini-3.1-pro',
  'gemini-3.1-flash-lite',
  'gemini-3-pro',
  'gemini-3-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  ...Object.keys(openAIModelPricing),
].sort((left, right) => right.length - left.length);

function toSafeTokenCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function resolveModelPricing(model: string): { key: string; pricing: ModelPricing } | null {
  const lowerModel = String(model ?? '')
    .trim()
    .toLowerCase();
  if (!lowerModel) {
    return null;
  }

  const exact = modelPricing[lowerModel];
  if (exact) {
    return { key: lowerModel, pricing: exact };
  }

  const aliased = modelAliases[lowerModel] ?? lowerModel;
  const aliasedPricing = modelPricing[aliased];
  if (aliasedPricing) {
    return { key: aliased, pricing: aliasedPricing };
  }

  const prefix = fuzzyPrefixes.find((item) => aliased.startsWith(item));
  if (!prefix) {
    return null;
  }

  const fuzzyPricing = modelPricing[prefix];
  return fuzzyPricing ? { key: prefix, pricing: fuzzyPricing } : null;
}

function getOpenAICacheMultiplier(model: string): number {
  if (model.startsWith('gpt-5')) {
    return 0.1;
  }
  if (model.startsWith('gpt-4.1')) {
    return 0.25;
  }
  return 0.5;
}

export function calculateModelCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
  options: CostCalculationOptions = {}
): number {
  const resolved = resolveModelPricing(model);
  if (!resolved) {
    return 0;
  }

  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const cacheRead = toSafeTokenCount(cacheReadTokens);
  const cacheWrite = toSafeTokenCount(cacheWriteTokens);
  const pricing = resolved.pricing;
  const applyLongContextTier = options.applyLongContextTier ?? true;
  const useHighPricing =
    applyLongContextTier &&
    pricing.inputPriceHigh !== undefined &&
    pricing.outputPriceHigh !== undefined &&
    input > (pricing.tierThreshold ?? GEMINI_LONG_CONTEXT_THRESHOLD);
  const inputPrice = useHighPricing
    ? (pricing.inputPriceHigh ?? pricing.inputPrice)
    : pricing.inputPrice;
  const outputPrice = useHighPricing
    ? (pricing.outputPriceHigh ?? pricing.outputPrice)
    : pricing.outputPrice;
  const explicitCacheReadPrice =
    useHighPricing && pricing.cacheReadPriceHigh !== undefined
      ? pricing.cacheReadPriceHigh
      : pricing.cacheReadPrice;
  const cacheReadPrice =
    explicitCacheReadPrice ??
    (resolved.key.startsWith('gpt-')
      ? inputPrice * getOpenAICacheMultiplier(resolved.key)
      : inputPrice * CLAUDE_CACHE_READ_MULTIPLIER);
  const explicitCacheWritePrice =
    useHighPricing && pricing.cacheWritePriceHigh !== undefined
      ? pricing.cacheWritePriceHigh
      : pricing.cacheWritePrice;
  const cacheWritePrice = explicitCacheWritePrice ?? inputPrice;
  const ordinaryInput = Math.max(input - cacheRead - cacheWrite, 0);

  return (
    (ordinaryInput * inputPrice +
      output * outputPrice +
      cacheRead * cacheReadPrice +
      cacheWrite * cacheWritePrice) /
    TOKENS_PER_MILLION
  );
}

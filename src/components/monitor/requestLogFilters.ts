export const CHANNEL_OPTION_SEPARATOR = '@@@';

export function parseRequestLogSourceFilterValue(value: string): { source: string; channel: string } {
  if (!value) return { source: '', channel: '' };

  if (!value.includes(CHANNEL_OPTION_SEPARATOR)) {
    return { source: value, channel: '' };
  }

  const [source, channel] = value.split(CHANNEL_OPTION_SEPARATOR);
  return { source, channel };
}

export function buildRequestLogSourceFilterParams(
  filterSource: string,
  filterChannel = ''
): { source?: string; channel?: string } {
  return {
    source: filterSource || undefined,
    channel: filterChannel || undefined,
  };
}

const REQUEST_LOG_CHANNEL_FIELDS = [
  'channel',
  'channel_name',
  'channelName',
  'provider',
  'provider_name',
  'providerName',
  'api_name',
  'apiName',
  'api_channel',
  'apiChannel',
  'matched_api',
  'matchedApi',
  'target_api',
  'targetApi',
  'route',
  'route_name',
  'routeName',
  'api',
] as const;

const REQUEST_LOG_MODEL_FIELDS = [
  'model',
  'raw_model',
  'rawModel',
  'request_model',
  'requestModel',
  'requested_model',
  'requestedModel',
  'original_model',
  'originalModel',
  'source_model',
  'sourceModel',
] as const;

function normalizeChannelName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCandidateList(value: string): string[] {
  return value
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

function resolveChannelFromModelPrefix(
  item: Record<string, unknown>,
  candidateByLower: Map<string, string>,
  providerMap: Record<string, string>
): string {
  for (const field of REQUEST_LOG_MODEL_FIELDS) {
    const model = normalizeChannelName(item[field]);
    const slashIndex = model.indexOf('/');
    if (slashIndex <= 0) continue;

    const prefix = model.slice(0, slashIndex).trim();
    if (!prefix) continue;

    const directCandidate = candidateByLower.get(prefix.toLowerCase());
    if (directCandidate) {
      return directCandidate;
    }

    const mappedCandidates = normalizeCandidateList(providerMap[prefix] || '');
    for (const mapped of mappedCandidates) {
      const matchedCandidate = candidateByLower.get(mapped.toLowerCase());
      if (matchedCandidate) {
        return matchedCandidate;
      }
    }
  }

  return '';
}

export function resolveRequestLogChannel(
  item: Record<string, unknown>,
  source: string,
  providerMap: Record<string, string>
): string {
  const candidates = normalizeCandidateList(providerMap[source] || '');
  const candidateByLower = new Map(candidates.map((candidate) => [candidate.toLowerCase(), candidate]));

  for (const field of REQUEST_LOG_CHANNEL_FIELDS) {
    const value = normalizeChannelName(item[field]);
    if (!value) continue;

    const matchedCandidate = candidateByLower.get(value.toLowerCase());
    if (matchedCandidate) {
      return matchedCandidate;
    }
  }

  const modelPrefixChannel = resolveChannelFromModelPrefix(item, candidateByLower, providerMap);
  if (modelPrefixChannel) {
    return modelPrefixChannel;
  }

  return normalizeChannelName(item.channel);
}

export function filterRequestLogEntriesByChannel<T extends { actionSource: string; providerName?: string | null }>(
  entries: T[],
  filterChannel: string
): T[] {
  if (!filterChannel) return entries;

  return entries.filter((entry) => entry.actionSource === filterChannel || entry.providerName === filterChannel);
}

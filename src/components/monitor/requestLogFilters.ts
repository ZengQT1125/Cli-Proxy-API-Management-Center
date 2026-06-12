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

function normalizeChannelName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveRequestLogChannel(
  item: Record<string, unknown>,
  source: string,
  providerMap: Record<string, string>
): string {
  const candidates = (providerMap[source] || '')
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const candidateByLower = new Map(candidates.map((candidate) => [candidate.toLowerCase(), candidate]));

  for (const field of REQUEST_LOG_CHANNEL_FIELDS) {
    const value = normalizeChannelName(item[field]);
    if (!value) continue;

    const matchedCandidate = candidateByLower.get(value.toLowerCase());
    if (matchedCandidate) {
      return matchedCandidate;
    }
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

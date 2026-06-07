export const CHANNEL_OPTION_SEPARATOR = '@@@';

export function parseRequestLogSourceFilterValue(value: string): { source: string; channel: string } {
  if (!value) return { source: '', channel: '' };

  if (!value.includes(CHANNEL_OPTION_SEPARATOR)) {
    return { source: value, channel: '' };
  }

  const [source, channel] = value.split(CHANNEL_OPTION_SEPARATOR);
  return { source, channel };
}

export function buildRequestLogSourceFilterParams(filterSource: string): { source?: string } {
  return { source: filterSource || undefined };
}

export function filterRequestLogEntriesByChannel<T extends { actionSource: string; providerName?: string | null }>(
  entries: T[],
  filterChannel: string
): T[] {
  if (!filterChannel) return entries;

  return entries.filter((entry) => entry.actionSource === filterChannel || entry.providerName === filterChannel);
}

export function paginateRequestLogEntries<T>(entries: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const startIndex = (safePage - 1) * safePageSize;
  return entries.slice(startIndex, startIndex + safePageSize);
}

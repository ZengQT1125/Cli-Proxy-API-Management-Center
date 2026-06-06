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

export function filterRequestLogEntriesByChannel<T extends { actionSource: string }>(
  entries: T[],
  filterChannel: string
): T[] {
  if (!filterChannel) return entries;

  return entries.filter((entry) => entry.actionSource === filterChannel);
}

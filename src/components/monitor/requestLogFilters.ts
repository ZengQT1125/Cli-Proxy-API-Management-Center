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
  filterChannel: string
): { source?: string; channel?: string } {
  if (filterChannel) {
    return { channel: filterChannel };
  }

  return { source: filterSource || undefined };
}

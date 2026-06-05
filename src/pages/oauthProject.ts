export const normalizeGeminiCliProjectId = (value: string | undefined): string | undefined => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase() === 'ALL' ? 'ALL' : trimmed;
};

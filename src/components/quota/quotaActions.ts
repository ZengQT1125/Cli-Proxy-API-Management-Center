interface QuotaResetActionOptions<TQuota extends { status?: string }> {
  sectionDisabled: boolean;
  fileDisabled?: boolean;
  quota?: TQuota;
  resetting: boolean;
  canResetQuota?: (quota: TQuota) => boolean;
}

export const canRunQuotaResetAction = <TQuota extends { status?: string }>({
  sectionDisabled,
  fileDisabled,
  quota,
  resetting,
  canResetQuota,
}: QuotaResetActionOptions<TQuota>): boolean => {
  if (sectionDisabled || fileDisabled || resetting) return false;
  if (quota?.status === 'loading') return false;
  if (canResetQuota && quota && !canResetQuota(quota)) return false;

  return true;
};

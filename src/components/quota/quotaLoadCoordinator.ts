type ActiveQuotaLoad = {
  requestId: number;
  cacheGeneration: number;
};

export class QuotaLoadCoordinator {
  private nextRequestId = 0;
  private activeLoad: ActiveQuotaLoad | null = null;

  begin(cacheGeneration: number): number | null {
    if (this.activeLoad?.cacheGeneration === cacheGeneration) return null;

    const requestId = ++this.nextRequestId;
    this.activeLoad = { requestId, cacheGeneration };
    return requestId;
  }

  isCurrent(requestId: number): boolean {
    return this.activeLoad?.requestId === requestId;
  }

  finish(requestId: number): boolean {
    if (!this.isCurrent(requestId)) return false;
    this.activeLoad = null;
    return true;
  }
}

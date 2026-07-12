import { beforeEach, describe, expect, test } from 'bun:test';
import {
  captureQuotaCacheGeneration,
  commitIfQuotaCacheCurrent,
  useQuotaStore,
} from '../src/stores/useQuotaStore';
import { QuotaLoadCoordinator } from '../src/components/quota/quotaLoadCoordinator';

describe('quota cache session isolation', () => {
  beforeEach(() => {
    useQuotaStore.getState().clearQuotaCache();
  });

  test('prevents an earlier connection from committing after the cache is cleared', () => {
    const previousConnection = captureQuotaCacheGeneration();
    let committed = false;

    useQuotaStore.getState().clearQuotaCache();

    expect(
      commitIfQuotaCacheCurrent(previousConnection, () => {
        committed = true;
      })
    ).toBe(false);
    expect(committed).toBe(false);
  });

  test('allows the current connection generation to commit', () => {
    const currentConnection = captureQuotaCacheGeneration();
    let committed = false;

    expect(
      commitIfQuotaCacheCurrent(currentConnection, () => {
        committed = true;
      })
    ).toBe(true);
    expect(committed).toBe(true);
  });

  test('allows a new connection load to supersede an in-flight old connection load', () => {
    const coordinator = new QuotaLoadCoordinator();
    const previousRequest = coordinator.begin(1);

    expect(previousRequest).not.toBeNull();
    expect(coordinator.begin(1)).toBeNull();

    const currentRequest = coordinator.begin(2);
    expect(currentRequest).not.toBeNull();
    expect(coordinator.isCurrent(previousRequest as number)).toBe(false);
    expect(coordinator.finish(previousRequest as number)).toBe(false);
    expect(coordinator.isCurrent(currentRequest as number)).toBe(true);
    expect(coordinator.finish(currentRequest as number)).toBe(true);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonitorRequestKey,
  createRequestGate,
} from '../src/utils/requestGate.ts';

test('requestGate 限制最大并发数', async () => {
  const gate = createRequestGate(2);
  let running = 0;
  let peak = 0;

  const tasks = Array.from({ length: 6 }, (_, i) =>
    gate.run(`task-${i}`, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running -= 1;
      return i;
    })
  );

  const results = await Promise.all(tasks);
  assert.deepEqual(results, [0, 1, 2, 3, 4, 5]);
  assert.equal(peak, 2);
  assert.equal(gate.pendingCount(), 0);
});

test('requestGate 同 key 共享 in-flight Promise', async () => {
  const gate = createRequestGate(2);
  let calls = 0;

  const task = () =>
    gate.run('same-key', async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return 'ok';
    });

  const [a, b, c] = await Promise.all([task(), task(), task()]);
  assert.equal(a, 'ok');
  assert.equal(b, 'ok');
  assert.equal(c, 'ok');
  assert.equal(calls, 1);
});

test('requestGate 不同 key 各自执行', async () => {
  const gate = createRequestGate(4);
  let calls = 0;

  await Promise.all([
    gate.run('a', async () => {
      calls += 1;
      return 1;
    }),
    gate.run('b', async () => {
      calls += 1;
      return 2;
    }),
  ]);

  assert.equal(calls, 2);
});

test('requestGate 失败后可重试同一 key', async () => {
  const gate = createRequestGate(1);
  let calls = 0;

  await assert.rejects(
    () =>
      gate.run('retry', async () => {
        calls += 1;
        throw new Error('boom');
      }),
    /boom/
  );

  const value = await gate.run('retry', async () => {
    calls += 1;
    return 42;
  });

  assert.equal(value, 42);
  assert.equal(calls, 2);
});

test('buildMonitorRequestKey 稳定排序并忽略空值', () => {
  assert.equal(
    buildMonitorRequestKey('/custom/monitor/kpi', {
      time_range: '7',
      api_filter: '',
      model: undefined,
      z: 1,
      a: 2,
    }),
    '/custom/monitor/kpi?a=2&time_range=7&z=1'
  );
  assert.equal(buildMonitorRequestKey('/custom/monitor/service-health'), '/custom/monitor/service-health');
});

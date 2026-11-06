export interface SagaStep<C> {
  name: string;
  action(context: C): unknown;
  compensate(context: C): unknown;
}

export interface SagaResult {
  status: 'completed' | 'compensated';
  completed: string[];
  compensated: string[];
  failedCompensations: string[];
  failedStep?: string;
}

export async function runSaga<C>(steps: SagaStep<C>[], context: C): Promise<SagaResult> {
  const completed: SagaStep<C>[] = [];
  for (const step of steps) {
    try {
      await step.action(context);
      completed.push(step);
    } catch {
      return { status: 'compensated', ...(await compensate(completed, context)), failedStep: step.name };
    }
  }
  return { status: 'completed', completed: completed.map((step) => step.name), compensated: [], failedCompensations: [] };
}

async function compensate<C>(completed: SagaStep<C>[], context: C) {
  const compensated: string[] = [];
  const failedCompensations: string[] = [];
  for (const step of [...completed].reverse()) {
    try {
      await step.compensate(context);
      compensated.push(step.name);
    } catch {
      failedCompensations.push(step.name);
    }
  }
  return { completed: completed.map((step) => step.name), compensated, failedCompensations };
}

export function createIdempotentHandler<Req, Res>(handler: (request: Req) => Res | Promise<Res>): (key: string, request: Req) => Promise<Res> {
  const results = new Map<string, Promise<Res>>();

  return (key, request) => {
    const stored = results.get(key);
    if (stored) {
      return stored;
    }
    const result = Promise.resolve().then(() => handler(request));
    results.set(key, result);
    result.catch(() => results.delete(key));
    return result;
  };
}

async function main() {
  const log: string[] = [];
  const result = await runSaga(
    [
      { name: 'create order', action: () => log.push('order created'), compensate: () => log.push('order cancelled') },
      { name: 'charge card', action: () => log.push('card charged'), compensate: () => log.push('payment refunded') },
      { name: 'reserve items', action: () => { throw new Error('out of stock'); }, compensate: () => log.push('items released') },
    ],
    { orderId: 'o-1' },
  );
  console.log(result, log);

  const charge = createIdempotentHandler((amount: number) => ({ chargeId: `ch-${amount}`, chargedAt: log.length }));
  console.log(await charge('key-1', 40), await charge('key-1', 40));
}

main();

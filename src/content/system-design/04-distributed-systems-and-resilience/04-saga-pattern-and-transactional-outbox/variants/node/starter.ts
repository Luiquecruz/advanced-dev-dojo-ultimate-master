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
  const completed: string[] = [];
  for (const step of steps) {
    try {
      await step.action(context);
      completed.push(step.name);
    } catch {
      // TODO: compensate the completed steps in reverse order, keep going when a compensation throws
      return { status: 'compensated', completed, compensated: [], failedCompensations: [], failedStep: step.name };
    }
  }
  return { status: 'completed', completed, compensated: [], failedCompensations: [] };
}

export function createIdempotentHandler<Req, Res>(handler: (request: Req) => Res | Promise<Res>): (key: string, request: Req) => Promise<Res> {
  // TODO: store the result by key so a retry with the same key does not run the handler again
  // TODO: forget the key when the handler fails, so a later retry runs it again
  return async (key, request) => handler(request);
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

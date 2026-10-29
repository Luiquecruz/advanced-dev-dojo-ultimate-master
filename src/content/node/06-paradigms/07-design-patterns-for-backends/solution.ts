export interface ChargeResult {
  id: string;
  status: 'succeeded' | 'declined';
}

export interface PaymentGateway {
  charge(amountCents: number, currency: string): Promise<ChargeResult>;
}

export interface LegacyPaymentRequest {
  value: string;
  curr: string;
}

export interface LegacyPaymentResponse {
  transactionRef: string;
  approved: boolean;
}

export class LegacyPayClient {
  private count = 0;

  makePayment(request: LegacyPaymentRequest, callback: (error: Error | null, response?: LegacyPaymentResponse) => void): void {
    setTimeout(() => {
      if (!['USD', 'EUR'].includes(request.curr)) {
        return callback(new Error(`Unsupported currency ${request.curr}`));
      }
      this.count += 1;
      callback(null, { transactionRef: `LP-${this.count}`, approved: Number(request.value) <= 1000 });
    }, 1);
  }
}

export class FakeGateway implements PaymentGateway {
  private count = 0;

  async charge(): Promise<ChargeResult> {
    this.count += 1;
    return { id: `fake_${this.count}`, status: 'succeeded' };
  }
}

export interface GatewayConfig {
  provider: string;
  logging?: boolean;
  maxAmountCents?: number;
}

export interface GatewayDependencies {
  legacyClient?: LegacyPayClient;
  log?: (line: string) => void;
}

export class LegacyPayAdapter implements PaymentGateway {
  constructor(private readonly client: LegacyPayClient) {}

  charge(amountCents: number, currency: string): Promise<ChargeResult> {
    const request = { value: (amountCents / 100).toFixed(2), curr: currency.toUpperCase() };
    return new Promise((resolve, reject) => {
      this.client.makePayment(request, (error, response) => {
        if (error || !response) {
          return reject(error);
        }
        resolve({ id: response.transactionRef, status: response.approved ? 'succeeded' : 'declined' });
      });
    });
  }
}

export function withLogging(gateway: PaymentGateway, log: (line: string) => void = console.log): PaymentGateway {
  return {
    async charge(amountCents, currency) {
      try {
        const result = await gateway.charge(amountCents, currency);
        log(`charge ${amountCents} ${currency} -> ${result.status} (${result.id})`);
        return result;
      } catch (error) {
        log(`charge ${amountCents} ${currency} -> error: ${(error as Error).message}`);
        throw error;
      }
    },
  };
}

export function withLimit(gateway: PaymentGateway, maxAmountCents: number): PaymentGateway {
  return {
    async charge(amountCents, currency) {
      if (amountCents > maxAmountCents) {
        throw new Error(`Amount exceeds limit of ${maxAmountCents}`);
      }
      return gateway.charge(amountCents, currency);
    },
  };
}

function createBaseGateway(provider: string, deps: GatewayDependencies): PaymentGateway {
  switch (provider) {
    case 'legacy':
      return new LegacyPayAdapter(deps.legacyClient ?? new LegacyPayClient());
    case 'fake':
      return new FakeGateway();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

export function createPaymentGateway(config: GatewayConfig, deps: GatewayDependencies = {}): PaymentGateway {
  const base = createBaseGateway(config.provider, deps);
  const limited = config.maxAmountCents === undefined ? base : withLimit(base, config.maxAmountCents);
  return config.logging ? withLogging(limited, deps.log) : limited;
}

async function main() {
  const gateway = createPaymentGateway({ provider: 'legacy', logging: true, maxAmountCents: 100000 });
  await gateway.charge(1250, 'usd');
  await gateway.charge(250000, 'usd').catch(() => undefined);
}

main();

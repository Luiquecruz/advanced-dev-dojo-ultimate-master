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
    // TODO: call client.makePayment with a decimal string value and an uppercase currency, and translate the callback into a promise
    return Promise.reject(new Error('Not implemented'));
  }
}

export function withLogging(gateway: PaymentGateway, log: (line: string) => void = console.log): PaymentGateway {
  // TODO: delegate to gateway.charge and log every outcome, returning or rethrowing it unchanged
  return gateway;
}

export function withLimit(gateway: PaymentGateway, maxAmountCents: number): PaymentGateway {
  // TODO: reject amounts above the limit without calling the wrapped gateway
  return gateway;
}

export function createPaymentGateway(config: GatewayConfig, deps: GatewayDependencies = {}): PaymentGateway {
  // TODO: build the base gateway for the provider, then apply withLimit and withLogging (outermost)
  return new FakeGateway();
}

async function main() {
  const gateway = createPaymentGateway({ provider: 'legacy', logging: true, maxAmountCents: 100000 });
  await gateway.charge(1250, 'usd');
  await gateway.charge(250000, 'usd').catch(() => undefined);
}

main();

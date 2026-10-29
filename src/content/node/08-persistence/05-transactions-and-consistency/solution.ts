export interface Account {
  id: string;
  owner: string;
  balance: number;
}

export interface Transaction {
  getAccount(id: string): Account | undefined;
  saveAccount(account: Account): void;
}

export class InsufficientFundsError extends Error {
  constructor() {
    super('Insufficient funds');
    this.name = 'InsufficientFundsError';
  }
}

export class InMemoryDatabase {
  private readonly accounts: Map<string, Account>;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(seed: Account[]) {
    this.accounts = new Map(seed.map((account) => [account.id, { ...account }]));
  }

  getAccount(id: string): Account | undefined {
    const account = this.accounts.get(id);
    return account ? { ...account } : undefined;
  }

  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const run = this.queue.then(() => this.execute(work));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async execute<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const pending = new Map<string, Account>();
    const tx: Transaction = {
      getAccount: (id) => {
        const account = pending.get(id) ?? this.accounts.get(id);
        return account ? { ...account } : undefined;
      },
      saveAccount: (account) => {
        pending.set(account.id, { ...account });
      },
    };
    const result = await work(tx);
    pending.forEach((account, id) => this.accounts.set(id, account));
    return result;
  }
}

export function transfer(db: InMemoryDatabase, fromId: string, toId: string, amount: number): Promise<void> {
  return db.transaction(async (tx) => {
    if (amount <= 0) {
      throw new RangeError('Amount must be positive');
    }
    const from = tx.getAccount(fromId);
    const to = tx.getAccount(toId);
    if (!from) {
      throw new Error(`Account not found: ${fromId}`);
    }
    if (!to) {
      throw new Error(`Account not found: ${toId}`);
    }
    if (from.balance < amount) {
      throw new InsufficientFundsError();
    }
    tx.saveAccount({ ...from, balance: from.balance - amount });
    tx.saveAccount({ ...to, balance: to.balance + amount });
  });
}

async function main() {
  const db = new InMemoryDatabase([
    { id: 'a', owner: 'Ada', balance: 100 },
    { id: 'b', owner: 'Alan', balance: 50 },
  ]);
  const results = await Promise.allSettled([transfer(db, 'a', 'b', 60), transfer(db, 'a', 'b', 60)]);
  console.log(results.map((result) => result.status));
  console.log(db.getAccount('a'), db.getAccount('b'));
}

main();

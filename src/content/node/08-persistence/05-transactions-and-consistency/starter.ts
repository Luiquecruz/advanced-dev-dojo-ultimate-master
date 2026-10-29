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

  constructor(seed: Account[]) {
    this.accounts = new Map(seed.map((account) => [account.id, { ...account }]));
  }

  getAccount(id: string): Account | undefined {
    const account = this.accounts.get(id);
    return account ? { ...account } : undefined;
  }

  async transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    // TODO: buffer writes in a pending Map, commit them only when work resolves, and run transactions one at a time
    const tx: Transaction = {
      getAccount: (id) => this.getAccount(id),
      saveAccount: (account) => {
        this.accounts.set(account.id, { ...account });
      },
    };
    return work(tx);
  }
}

export async function transfer(db: InMemoryDatabase, fromId: string, toId: string, amount: number): Promise<void> {
  // TODO: inside db.transaction, validate the amount and both accounts, check the balance, then save both accounts
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

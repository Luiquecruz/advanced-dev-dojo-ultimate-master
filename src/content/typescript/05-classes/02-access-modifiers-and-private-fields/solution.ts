class BankAccount {
  #balance = 0;
  readonly owner: string;

  constructor(owner: string) {
    this.owner = owner;
  }

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new RangeError('Deposit must be positive');
    }
    this.#balance += amount;
  }

  withdraw(amount: number): void {
    if (amount <= 0) {
      throw new RangeError('Withdrawal must be positive');
    }
    if (amount > this.#balance) {
      throw new Error('Insufficient funds');
    }
    this.#balance -= amount;
  }

  getBalance(): number {
    return this.#balance;
  }

  transferTo(target: BankAccount, amount: number): void {
    this.withdraw(amount);
    target.#balance += amount;
  }
}

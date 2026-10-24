class BankAccount {
  // TODO: replace with a #balance private field
  private balance = 0;
  // TODO: make owner readonly
  owner: string;

  constructor(owner: string) {
    this.owner = owner;
  }

  deposit(amount: number): void {
    // TODO: throw a RangeError for amounts <= 0
    this.balance += amount;
  }

  withdraw(amount: number): void {
    // TODO: validate the amount and throw "Insufficient funds" when needed
    this.balance -= amount;
  }

  getBalance(): number {
    return this.balance;
  }

  // TODO: add transferTo(target: BankAccount, amount: number): void
}

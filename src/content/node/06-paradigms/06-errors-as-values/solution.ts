import { Hono } from 'hono';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export interface Account {
  id: string;
  balance: number;
}

export type TransferError =
  | { type: 'invalid_amount' }
  | { type: 'same_account' }
  | { type: 'account_not_found'; accountId: string }
  | { type: 'insufficient_funds'; balance: number; amount: number };

export interface TransferRequest {
  from: string;
  to: string;
  amount: unknown;
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

export function andThen<T, U, E, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F> {
  return result.ok ? fn(result.value) : result;
}

function parseAmount(input: unknown): Result<number, TransferError> {
  return typeof input === 'number' && Number.isInteger(input) && input > 0 ? ok(input) : err({ type: 'invalid_amount' });
}

function findAccount(accounts: ReadonlyMap<string, Account>, accountId: string): Result<Account, TransferError> {
  const account = accounts.get(accountId);
  return account ? ok(account) : err({ type: 'account_not_found', accountId });
}

export function transfer(accounts: ReadonlyMap<string, Account>, request: TransferRequest): Result<{ from: Account; to: Account }, TransferError> {
  return andThen(parseAmount(request.amount), (amount) =>
    andThen(request.from === request.to ? err<TransferError>({ type: 'same_account' }) : ok(amount), () =>
      andThen(findAccount(accounts, request.from), (from) =>
        andThen(findAccount(accounts, request.to), (to) =>
          from.balance < amount
            ? err({ type: 'insufficient_funds', balance: from.balance, amount })
            : ok({ from: { ...from, balance: from.balance - amount }, to: { ...to, balance: to.balance + amount } }),
        ),
      ),
    ),
  );
}

export function toHttpError(error: TransferError) {
  switch (error.type) {
    case 'invalid_amount':
      return { status: 400 as const, body: { error: error.type, message: 'Amount must be a positive integer of cents' } };
    case 'same_account':
      return { status: 400 as const, body: { error: error.type, message: 'Cannot transfer to the same account' } };
    case 'account_not_found':
      return { status: 404 as const, body: { error: error.type, message: `Account ${error.accountId} not found` } };
    case 'insufficient_funds':
      return { status: 422 as const, body: { error: error.type, message: `Balance ${error.balance} is lower than ${error.amount}` } };
    default: {
      const unreachable: never = error;
      return unreachable;
    }
  }
}

export function createAccounts(): Map<string, Account> {
  return new Map([
    ['alice', { id: 'alice', balance: 10000 }],
    ['bob', { id: 'bob', balance: 2500 }],
  ]);
}

export const accounts = createAccounts();

export const app = new Hono();

app.post('/transfers', async (c) => {
  const body = await c.req.json<TransferRequest>();
  const result = transfer(accounts, body);
  if (!result.ok) {
    const { status, body: errorBody } = toHttpError(result.error);
    return c.json(errorBody, status);
  }
  accounts.set(result.value.from.id, result.value.from);
  accounts.set(result.value.to.id, result.value.to);
  return c.json(result.value, 200);
});

function main() {
  const demo = createAccounts();
  console.log(transfer(demo, { from: 'alice', to: 'bob', amount: 1500 }));
  const failed = transfer(demo, { from: 'bob', to: 'alice', amount: 9999 });
  console.log(failed.ok ? failed.value : toHttpError(failed.error));
}

main();

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
  // TODO: transform an ok value, pass an error through unchanged
  return result as unknown as Result<U, E>;
}

export function andThen<T, U, E, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F> {
  // TODO: run fn only for an ok result, pass an error through unchanged
  return result as unknown as Result<U, E | F>;
}

export function transfer(accounts: ReadonlyMap<string, Account>, request: TransferRequest): Result<{ from: Account; to: Account }, TransferError> {
  // TODO: validate in order (amount, same account, from, to, funds) and return new accounts on success
  return err({ type: 'invalid_amount' });
}

export function toHttpError(error: TransferError) {
  // TODO: map every error type to its status and { error, message } body with an exhaustive switch
  return { status: 500 as const, body: { error: error.type, message: 'Unknown error' } };
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
  // TODO: call transfer, store the new accounts on success, answer with toHttpError on failure
  return c.json({ error: 'not_implemented' }, 501);
});

function main() {
  const demo = createAccounts();
  console.log(transfer(demo, { from: 'alice', to: 'bob', amount: 1500 }));
  const failed = transfer(demo, { from: 'bob', to: 'alice', amount: 9999 });
  console.log(failed.ok ? failed.value : toHttpError(failed.error));
}

main();

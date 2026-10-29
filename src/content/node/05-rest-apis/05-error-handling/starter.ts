import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

export interface Account {
  id: number;
  owner: string;
  balance: number;
}

export const accounts: Account[] = [
  { id: 1, owner: 'Ada', balance: 100 },
  { id: 2, owner: 'Alan', balance: 20 },
];

export class NotFoundError extends Error {
  name = 'NotFoundError';
}

export class InsufficientFundsError extends Error {
  name = 'InsufficientFundsError';

  constructor() {
    super('Insufficient funds');
  }
}

export function getAccount(id: number): Account {
  const account = accounts.find((item) => item.id === id);
  if (!account) {
    throw new NotFoundError(`Account ${id} not found`);
  }
  return account;
}

export function withdraw(id: number, amount: number): Account {
  const account = getAccount(id);
  if (account.balance < amount) {
    throw new InsufficientFundsError();
  }
  account.balance -= amount;
  return account;
}

async function buildDailyReport(): Promise<never> {
  throw new Error('connect ECONNREFUSED db-primary.internal:5432 (user=reporting)');
}

export const app = new Hono();

app.get('/accounts/:id{[0-9]+}', (c) => c.json(getAccount(Number(c.req.param('id')))));

app.post('/accounts/:id{[0-9]+}/withdraw', async (c) => {
  const { amount } = await c.req.json<{ amount: unknown }>();
  // TODO: throw an HTTPException 400 'Amount must be positive' unless amount is a number > 0
  return c.json(withdraw(Number(c.req.param('id')), amount as number));
});

app.get('/reports/daily', async (c) => c.json(await buildDailyReport()));

// TODO: app.onError mapping HTTPException, NotFoundError (404), InsufficientFundsError (422) and unknown errors (500 + console.error)

// TODO: app.notFound answering 404 { error: 'Route not found' }

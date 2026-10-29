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
  if (typeof amount !== 'number' || !(amount > 0)) {
    throw new HTTPException(400, { message: 'Amount must be positive' });
  }
  return c.json(withdraw(Number(c.req.param('id')), amount));
});

app.get('/reports/daily', async (c) => c.json(await buildDailyReport()));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  if (err instanceof InsufficientFundsError) {
    return c.json({ error: err.message }, 422);
  }
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ error: 'Route not found' }, 404));

`map` and `andThen` are one-line ternaries on `result.ok`. In the error branch return `result` itself: TypeScript accepts it because an error result has no value type to change.
---
Write two small helpers that already return results: `parseAmount(input)` (`typeof input === 'number' && Number.isInteger(input) && input > 0`) and `findAccount(accounts, id)` returning `err({ type: 'account_not_found', accountId: id })` when `get` finds nothing.
---
Chain the steps: `andThen(parseAmount(request.amount), (amount) => andThen(findAccount(accounts, request.from), (from) => ...))`. Put the same-account check between the amount and the lookups. Plain `if (!result.ok) return result;` statements also work if you prefer them.
---
Last step: `from.balance < amount ? err({ type: 'insufficient_funds', balance: from.balance, amount }) : ok({ from: { ...from, balance: from.balance - amount }, to: { ...to, balance: to.balance + amount } })`. In the route, `if (!result.ok)` answer with `c.json(body, status)` from `toHttpError`; otherwise `accounts.set` both accounts and return `c.json(result.value, 200)`.

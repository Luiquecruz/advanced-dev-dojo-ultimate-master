const { createActor, fromPromise } = require('xstate');

function machineWith(implementation) {
  return mod.paymentMachine.provide({ actors: { chargeCard: fromPromise(implementation) } });
}

function startActor(machine) {
  const actor = createActor(machine);
  actor.start();
  return actor;
}

test('the isCardValid guard blocks "submit" until the card has 16 digits', () => {
  const actor = startActor(mod.paymentMachine);
  actor.send({ type: 'submit' });
  expect(actor.getSnapshot().value).toBe('editing');
  actor.send({ type: 'card.change', value: '4242' });
  expect(actor.getSnapshot().can({ type: 'submit' })).toBe(false);
  actor.send({ type: 'card.change', value: '4242424242424242' });
  expect(actor.getSnapshot().can({ type: 'submit' })).toBe(true);
  actor.stop();
});

test('submitting invokes chargeCard with { card } and stores the receiptId on success', async () => {
  const charge = fn(async ({ input }) => ({ receiptId: `R-${input.card.slice(-4)}` }));
  const actor = startActor(machineWith(charge));
  actor.send({ type: 'card.change', value: '4242424242424242' });
  actor.send({ type: 'submit' });
  expect(actor.getSnapshot().value).toBe('submitting');
  await waitFor(() => expect(actor.getSnapshot().value).toBe('success'));
  expect(charge.mock.calls[0][0].input).toEqual({ card: '4242424242424242' });
  expect(actor.getSnapshot().context.receiptId).toBe('R-4242');
  expect(actor.getSnapshot().status).toBe('done');
});

test('a rejected charge goes to "failure" with the message, and "retry" clears it and tries again', async () => {
  let attempts = 0;
  const actor = startActor(
    machineWith(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Card declined');
      return { receiptId: 'R-2' };
    }),
  );
  actor.send({ type: 'card.change', value: '4242424242424242' });
  actor.send({ type: 'submit' });
  await waitFor(() => expect(actor.getSnapshot().value).toBe('failure'));
  expect(actor.getSnapshot().context.error).toBe('Card declined');
  actor.send({ type: 'retry' });
  expect(actor.getSnapshot().value).toBe('submitting');
  expect(actor.getSnapshot().context.error).toBeNull();
  await waitFor(() => expect(actor.getSnapshot().value).toBe('success'));
  expect(attempts).toBe(2);
});

test('the Pay button is disabled until the machine can accept "submit"', async () => {
  const Checkout = mod.Checkout;
  render(<Checkout machine={machineWith(async () => ({ receiptId: 'R-1' }))} />);
  expect(screen.getByRole('button', { name: 'Pay' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '4242424242424242' } });
  expect(screen.getByRole('button', { name: 'Pay' })).toBeEnabled();
});

test('shows "Processing..." while charging and the receipt on success', async () => {
  const Checkout = mod.Checkout;
  render(
    <Checkout
      machine={machineWith(async () => {
        await sleep(100);
        return { receiptId: 'R-4242' };
      })}
    />,
  );
  fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '4242424242424242' } });
  await user.click(screen.getByRole('button', { name: 'Pay' }));
  expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
  expect(await screen.findByRole('status')).toHaveTextContent('Paid! Receipt R-4242');
});

test('a failure shows an alert; "Edit card" returns to editing and "Retry" charges again', async () => {
  let attempts = 0;
  const Checkout = mod.Checkout;
  render(
    <Checkout
      machine={machineWith(async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('Card declined');
        return { receiptId: 'R-9' };
      })}
    />,
  );
  fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '4242424242420000' } });
  await user.click(screen.getByRole('button', { name: 'Pay' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Card declined');
  await user.click(screen.getByRole('button', { name: 'Edit card' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByLabelText('Card number')).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Pay' }));
  await user.click(await screen.findByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Paid! Receipt R-9');
});

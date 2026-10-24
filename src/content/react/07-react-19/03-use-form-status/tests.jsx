const slowSubscribe = () => fn(() => sleep(200));

test('SubmitButton reads "Subscribe" and is enabled when idle', () => {
  const { SubmitButton } = mod;
  render(
    <form action={async () => {}}>
      <SubmitButton />
    </form>,
  );
  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('Subscribe');
  expect(button).toBeEnabled();
});

test('the button is disabled and reads "Subscribing..." while the form submits', async () => {
  const NewsletterForm = mod.default;
  render(<NewsletterForm onSubscribe={slowSubscribe()} />);
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));
  const button = await screen.findByRole('button', { name: 'Subscribing...' });
  expect(button).toBeDisabled();
});

test('SendingHint shows the email being submitted while pending', async () => {
  const NewsletterForm = mod.default;
  render(<NewsletterForm onSubscribe={slowSubscribe()} />);
  expect(screen.queryByRole('status')).toBeNull();
  await user.type(screen.getByLabelText('Email'), 'grace@example.com');
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Sending to grace@example.com');
});

test('calls onSubscribe with the email and then thanks the user', async () => {
  const onSubscribe = fn(async () => {});
  const NewsletterForm = mod.default;
  render(<NewsletterForm onSubscribe={onSubscribe} />);
  await user.type(screen.getByLabelText('Email'), 'alan@example.com');
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));
  expect(await screen.findByText('Thanks for subscribing!')).toBeInTheDocument();
  expect(onSubscribe).toHaveBeenCalledWith('alan@example.com');
});

test('imports useFormStatus from react-dom', () => {
  expect(source).toMatch(/import\s*\{[^}]*useFormStatus[^}]*\}\s*from\s*['"]react-dom['"]/);
  expect(source).toMatch(/useFormStatus\(\s*\)/);
});

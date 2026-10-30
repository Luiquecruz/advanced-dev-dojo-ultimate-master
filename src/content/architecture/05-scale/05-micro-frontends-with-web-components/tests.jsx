const { CartSummaryElement, defineCartSummary } = modules['cart-summary.jsx'];

function defineFreshTag() {
  const tagName = `cart-summary-test-${Math.random().toString(36).slice(2, 10)}`;
  customElements.define(tagName, class extends CartSummaryElement {});
  return tagName;
}

async function connect(tagName, count) {
  const element = document.createElement(tagName);
  element.setAttribute('count', String(count));
  await act(async () => {
    document.body.append(element);
  });
  return element;
}

test('defineCartSummary registers <cart-summary> once and observes the count attribute', () => {
  defineCartSummary();
  expect(() => defineCartSummary()).not.toThrow();
  expect(customElements.get('cart-summary')).toBeDefined();
  expect(CartSummaryElement.observedAttributes).toContain('count');
});

test('renders the React view on connect and re-renders when count changes', async () => {
  const element = await connect(defineFreshTag(), 2);
  expect(element).toHaveTextContent('Items in cart: 2');
  await act(async () => {
    element.setAttribute('count', '5');
  });
  expect(element).toHaveTextContent('Items in cart: 5');
  expect(element.querySelectorAll('p')).toHaveLength(1);
});

test('Checkout dispatches a bubbling, composed cart:checkout CustomEvent with the count', async () => {
  const received = fn();
  document.addEventListener('cart:checkout', received);
  try {
    const element = await connect(defineFreshTag(), 3);
    await user.click(within(element).getByRole('button', { name: 'Checkout' }));
    expect(received).toHaveBeenCalledTimes(1);
    const event = received.mock.calls[0][0];
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.target).toBe(element);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.detail).toEqual({ count: 3 });
  } finally {
    document.removeEventListener('cart:checkout', received);
  }
});

test('disconnecting unmounts the React root without warnings, and moving the element keeps it alive', async () => {
  const tagName = defineFreshTag();
  const element = await connect(tagName, 1);
  await act(async () => {
    document.body.append(document.createElement('hr'), element);
  });
  expect(element).toHaveTextContent('Items in cart: 1');
  await act(async () => {
    element.remove();
  });
  await waitFor(() => expect(element.innerHTML).toBe(''));

  const originalError = console.error;
  const reactErrors = [];
  console.error = (...args) => {
    const message = args.map(String).join(' ');
    if (/unmount/i.test(message)) reactErrors.push(message);
  };
  try {
    const host = render(React.createElement(tagName, { count: 4 }));
    await waitFor(() => expect(host.container).toHaveTextContent('Items in cart: 4'));
    host.unmount();
    await sleep(10);
  } finally {
    console.error = originalError;
  }
  expect(reactErrors).toEqual([]);
});

test('the React host passes count as an attribute and reacts to cart:checkout', async () => {
  render(<mod.default />);
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  const element = document.querySelector('cart-summary');
  expect(element).toHaveAttribute('count', '2');
  await waitFor(() => expect(element).toHaveTextContent('Items in cart: 2'));
  await user.click(within(element).getByRole('button', { name: 'Checkout' }));
  expect(screen.getByRole('status')).toHaveTextContent('Checked out 2 items');
});

function readField(event, name) {
  event.preventDefault();
  return new FormData(event.currentTarget).get(name);
}

export function CheckoutView({ checkout, cartItems }) {
  const { step, data, error, order } = checkout;

  return (
    <section aria-label="Checkout">
      <p>Step: {step}</p>

      {step === 'cart' && (
        <>
          <ul aria-label="Cart">
            {cartItems.map((item) => (
              <li key={item.id}>
                {item.name} × {item.quantity} (${item.price * item.quantity})
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => checkout.next({ items: cartItems })}>
            Continue to shipping
          </button>
        </>
      )}

      {step === 'shipping' && (
        <form onSubmit={(event) => checkout.next({ address: readField(event, 'address') })}>
          <label>
            Address
            <input name="address" defaultValue={data.address} required />
          </label>
          <button type="button" onClick={checkout.back}>
            Back
          </button>
          <button type="submit">Continue to payment</button>
        </form>
      )}

      {step === 'payment' && (
        <form onSubmit={(event) => checkout.submit({ card: readField(event, 'card') })}>
          <label>
            Card number
            <input name="card" defaultValue={data.card} required />
          </label>
          <button type="button" onClick={checkout.back}>
            Back
          </button>
          <button type="submit">Pay</button>
        </form>
      )}

      {step === 'submitting' && <p role="status">Placing your order...</p>}

      {step === 'error' && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={checkout.retry}>
            Retry
          </button>
          <button type="button" onClick={checkout.back}>
            Back to payment
          </button>
        </div>
      )}

      {step === 'done' && <p role="status">Order #{order.id} placed</p>}
    </section>
  );
}

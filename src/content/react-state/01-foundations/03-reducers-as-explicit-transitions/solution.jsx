import { useReducer, useState } from 'react';

export const initialCheckout = { status: 'shipping', address: '', card: '', orderId: null, error: null };

const knownTypes = ['shippingSubmitted', 'paymentSubmitted', 'back', 'orderPlaced', 'orderSucceeded', 'orderFailed', 'retried', 'restarted'];

const transitions = {
  shipping: {
    shippingSubmitted: (state, action) => ({ ...state, status: 'payment', address: action.address }),
  },
  payment: {
    paymentSubmitted: (state, action) => ({ ...state, status: 'review', card: action.card }),
    back: (state) => ({ ...state, status: 'shipping' }),
  },
  review: {
    orderPlaced: (state) => ({ ...state, status: 'submitting', error: null }),
    back: (state) => ({ ...state, status: 'payment' }),
  },
  submitting: {
    orderSucceeded: (state, action) => ({ ...state, status: 'done', orderId: action.orderId }),
    orderFailed: (state, action) => ({ ...state, status: 'failed', error: action.error }),
  },
  failed: {
    retried: (state) => ({ ...state, status: 'review', error: null }),
  },
  done: {
    restarted: () => initialCheckout,
  },
};

export function checkoutReducer(state, action) {
  if (!knownTypes.includes(action.type)) {
    throw new Error(`Unknown action: ${action.type}`);
  }
  const transition = transitions[state.status][action.type];
  return transition ? transition(state, action) : state;
}

function TextStep({ label, onSubmit, onBack }) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <label>
        {label}
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      {onBack && (
        <button type="button" onClick={onBack}>
          Back
        </button>
      )}
      <button type="submit">Continue</button>
    </form>
  );
}

export function Checkout({ placeOrder }) {
  const [state, dispatch] = useReducer(checkoutReducer, initialCheckout);

  async function handlePlaceOrder() {
    dispatch({ type: 'orderPlaced' });
    try {
      const { orderId } = await placeOrder({ address: state.address, card: state.card });
      dispatch({ type: 'orderSucceeded', orderId });
    } catch (error) {
      dispatch({ type: 'orderFailed', error: error.message });
    }
  }

  switch (state.status) {
    case 'shipping':
      return <TextStep key="shipping" label="Address" onSubmit={(address) => dispatch({ type: 'shippingSubmitted', address })} />;
    case 'payment':
      return (
        <TextStep
          key="payment"
          label="Card number"
          onSubmit={(card) => dispatch({ type: 'paymentSubmitted', card })}
          onBack={() => dispatch({ type: 'back' })}
        />
      );
    case 'review':
      return (
        <section>
          <p>Ship to {state.address}</p>
          <p>Card ending in {state.card.slice(-4)}</p>
          <button onClick={() => dispatch({ type: 'back' })}>Back</button>
          <button onClick={handlePlaceOrder}>Place order</button>
        </section>
      );
    case 'submitting':
      return <p role="status">Placing order...</p>;
    case 'failed':
      return (
        <section>
          <p role="alert">{state.error}</p>
          <button onClick={() => dispatch({ type: 'retried' })}>Try again</button>
        </section>
      );
    case 'done':
      return (
        <section>
          <h2>Order {state.orderId} confirmed</h2>
          <button onClick={() => dispatch({ type: 'restarted' })}>New order</button>
        </section>
      );
  }
}

const fakePlaceOrder = () => new Promise((resolve) => setTimeout(() => resolve({ orderId: 'A-100' }), 600));

export default function App() {
  return <Checkout placeOrder={fakePlaceOrder} />;
}

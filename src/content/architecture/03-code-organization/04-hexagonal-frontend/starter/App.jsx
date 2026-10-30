import { createPlaceOrder } from './application/placeOrder';
import { Checkout } from './ui/Checkout';
import { PlaceOrderProvider } from './ui/PlaceOrderContext';

const DEMO_ITEMS = [
  { productId: 1, name: 'Keyboard', price: 120, quantity: 1 },
  { productId: 2, name: 'Mouse', price: 45, quantity: 1 },
];

// TODO: composition root: create the HTTP adapter with createHttpOrderGateway('/api/orders') and pass it to createPlaceOrder
const placeOrder = createPlaceOrder();

export default function App() {
  return (
    <PlaceOrderProvider placeOrder={placeOrder}>
      <h1>Checkout</h1>
      <Checkout items={DEMO_ITEMS} />
    </PlaceOrderProvider>
  );
}

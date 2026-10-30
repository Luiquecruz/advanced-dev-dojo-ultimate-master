import { createHttpOrderGateway } from './adapters/httpOrderGateway';
import { createPlaceOrder } from './application/placeOrder';
import { Checkout } from './ui/Checkout';
import { PlaceOrderProvider } from './ui/PlaceOrderContext';

const DEMO_ITEMS = [
  { productId: 1, name: 'Keyboard', price: 120, quantity: 1 },
  { productId: 2, name: 'Mouse', price: 45, quantity: 1 },
];

const orderGateway = createHttpOrderGateway('/api/orders');
const placeOrder = createPlaceOrder(orderGateway);

export default function App() {
  return (
    <PlaceOrderProvider placeOrder={placeOrder}>
      <h1>Checkout</h1>
      <Checkout items={DEMO_ITEMS} />
    </PlaceOrderProvider>
  );
}

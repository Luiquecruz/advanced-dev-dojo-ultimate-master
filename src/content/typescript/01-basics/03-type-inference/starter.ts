type CartItem = { name: string; price: number; quantity: number };

const cartItems = [
  { name: 'Keyboard', price: 120, quantity: 1 },
  { name: 'Mouse', price: 45, quantity: 2 },
];

function cartTotal(items: CartItem[]) {
  // TODO: return the sum of price * quantity with reduce, starting from 0
  return 0;
}

// TODO: annotate the empty array so it only accepts strings
const discountCodes = [];
discountCodes.push('WELCOME10');

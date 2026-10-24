type CartItem = { name: string; price: number; quantity: number };

const cartItems = [
  { name: 'Keyboard', price: 120, quantity: 1 },
  { name: 'Mouse', price: 45, quantity: 2 },
];

function cartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

const discountCodes: string[] = [];
discountCodes.push('WELCOME10');

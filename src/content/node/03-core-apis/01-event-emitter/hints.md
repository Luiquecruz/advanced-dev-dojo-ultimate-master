`pay` is two branches: `this.emit('error', new Error(...))` and `return`, otherwise `this.emit('paid', { orderId, amount })`. The class already extends `EventEmitter`, so `this.emit` is available.
---
`off` removes a listener by reference. Register the `listener` you received (not a new arrow wrapping it) and return `() => { checkout.off('paid', listener); }`.
---
`once(checkout, 'paid')` resolves with the **array** of the event's arguments and rejects on `'error'` by itself: `const [payment] = await once(checkout, 'paid'); return payment;`. The logger is `checkout.on('error', (error) => console.error(\`Payment failed: ${error.message}\`))`.

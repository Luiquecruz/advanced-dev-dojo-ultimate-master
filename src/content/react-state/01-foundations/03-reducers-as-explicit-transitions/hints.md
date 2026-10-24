Follow the shape of the `shipping` entry: each status maps event types to a function `(state, action) => nextState`. Statuses list only the events they accept.
---
The reducer has three steps: throw when `!knownTypes.includes(action.type)`, look up `transitions[state.status][action.type]`, and return `transition ? transition(state, action) : state`.
---
`restarted` can return `initialCheckout` directly. `orderPlaced` and `retried` both reset `error` to `null`.
---
In the handler: `dispatch({ type: 'orderPlaced' }); try { const { orderId } = await placeOrder({ address: state.address, card: state.card }); dispatch({ type: 'orderSucceeded', orderId }); } catch (error) { dispatch({ type: 'orderFailed', error: error.message }); }`

/**
 * Shape returned by every useCheckout implementation.
 *
 * @typedef {'cart' | 'shipping' | 'payment' | 'submitting' | 'error' | 'done'} CheckoutStep
 * @typedef {{ items: Array<{ id: number, name: string, price: number, quantity: number }>, address: string, card: string }} CheckoutData
 * @typedef {{
 *   step: CheckoutStep,
 *   data: CheckoutData,
 *   error: string | null,
 *   order: { id: number } | null,
 *   next: (fields?: Partial<CheckoutData>) => void,
 *   back: () => void,
 *   submit: (fields?: Partial<CheckoutData>) => void,
 *   retry: () => void,
 * }} Checkout
 */

export const CHECKOUT_STEPS = ['cart', 'shipping', 'payment', 'submitting', 'error', 'done'];

export const INITIAL_CHECKOUT_DATA = { items: [], address: '', card: '' };

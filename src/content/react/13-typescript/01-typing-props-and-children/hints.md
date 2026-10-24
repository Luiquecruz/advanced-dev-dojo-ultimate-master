Declare the shape first: `interface CardProps { title: string; subtitle?: string; ... }`. The `?` marks optional props.
---
A literal union restricts a string to a few values: `variant?: 'info' | 'warning'`. Children use `children: ReactNode`, and the optional callback is `onClose?: () => void`.
---
Annotate the destructured parameter: `function Card({ title, subtitle, variant = 'info', onClose, children }: CardProps)`. Then render conditionally: `{subtitle && <p>{subtitle}</p>}` and `{onClose && <button onClick={onClose}>Close</button>}`.

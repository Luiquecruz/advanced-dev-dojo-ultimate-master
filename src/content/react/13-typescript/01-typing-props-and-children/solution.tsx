import type { ReactNode } from 'react';

type Variant = 'info' | 'warning';

interface CardProps {
  title: string;
  subtitle?: string;
  variant?: Variant;
  onClose?: () => void;
  children: ReactNode;
}

export function Card({ title, subtitle, variant = 'info', onClose, children }: CardProps) {
  return (
    <article data-variant={variant}>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {children}
      {onClose && <button onClick={onClose}>Close</button>}
    </article>
  );
}

export default function App() {
  return (
    <Card title="Welcome" subtitle="TypeScript edition" onClose={() => alert('Closed')}>
      <p>Props are typed now.</p>
    </Card>
  );
}

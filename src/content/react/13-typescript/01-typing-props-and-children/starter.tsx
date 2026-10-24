import type { ReactNode } from 'react';

// TODO: declare CardProps with title, subtitle?, variant? ('info' | 'warning'), onClose? and children

// TODO: replace `any` with CardProps and default variant to 'info'
export function Card({ title, children }: any) {
  return (
    <article>
      <h3>{title}</h3>
      {/* TODO: render the subtitle <p> only when provided */}
      {children}
      {/* TODO: render the Close button only when onClose is provided */}
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

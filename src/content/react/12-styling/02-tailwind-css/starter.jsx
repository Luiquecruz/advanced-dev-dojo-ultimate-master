const tones = {
  // TODO: map success, warning and error to their complete class strings
};

export function StatusBadge({ status, children }) {
  // TODO: combine the base classes with tones[status]
  return <span className={`bg-${status}-100`}>{children}</span>;
}

export function Card({ title, children }) {
  return (
    // TODO: add the card classes, including the md: padding variant
    <article>
      {/* TODO: style the title */}
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export default function App() {
  return (
    <Card title="Deployments">
      <StatusBadge status="success">Live</StatusBadge> <StatusBadge status="warning">Queued</StatusBadge>{' '}
      <StatusBadge status="error">Failed</StatusBadge>
    </Card>
  );
}

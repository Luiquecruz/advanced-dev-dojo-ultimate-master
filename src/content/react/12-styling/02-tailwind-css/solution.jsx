import clsx from 'clsx';

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

const tones = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function StatusBadge({ status, children }) {
  return <span className={clsx(base, tones[status])}>{children}</span>;
}

export function Card({ title, children }) {
  return (
    <article className="rounded-xl border border-gray-200 p-4 shadow-sm md:p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
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

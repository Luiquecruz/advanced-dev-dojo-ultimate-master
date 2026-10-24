import clsx from 'clsx';

export function Button({ variant = 'primary', size = 'md', fullWidth = false, className, children, ...rest }) {
  return (
    <button className={clsx('btn', `btn-${variant}`, `btn-${size}`, { 'btn-block': fullWidth }, className)} {...rest}>
      {children}
    </button>
  );
}

export function ProgressBar({ value }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" className="progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}>
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function App() {
  return (
    <section>
      <Button onClick={() => alert('Saved!')}>Save</Button>
      <Button variant="secondary" size="lg" fullWidth>
        Cancel
      </Button>
      <ProgressBar value={40} />
    </section>
  );
}

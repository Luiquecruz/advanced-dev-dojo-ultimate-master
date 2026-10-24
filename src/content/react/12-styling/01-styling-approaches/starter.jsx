import clsx from 'clsx';

export function Button({ variant = 'primary', size = 'md', fullWidth = false, className, children, ...rest }) {
  // TODO: build the class list with clsx: btn, btn-<variant>, btn-<size>, btn-block when fullWidth, then className
  return (
    // TODO: forward the remaining props to the button
    <button className="btn">{children}</button>
  );
}

export function ProgressBar({ value }) {
  // TODO: clamp value between 0 and 100
  return (
    <div role="progressbar" className="progress">
      {/* TODO: add aria-valuemin, aria-valuemax and aria-valuenow to the outer div */}
      {/* TODO: give the fill an inline width in percent */}
      <div className="progress-fill" />
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

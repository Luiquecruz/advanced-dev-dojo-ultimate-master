import type { ComponentProps, PropsWithChildren } from 'react';

export type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ variant = 'primary', type = 'button', className, ...rest }: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}

export type IconButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  icon: string;
  label: string;
};

export function IconButton({ icon, label, ...rest }: IconButtonProps) {
  return (
    <Button aria-label={label} {...rest}>
      {icon}
    </Button>
  );
}

export function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export type AlertProps = { message: string } & (
  | { dismissible: true; onDismiss: () => void }
  | { dismissible?: false; onDismiss?: never }
);

export function Alert(props: AlertProps) {
  return (
    <div role="alert">
      {props.message}
      {props.dismissible && <button onClick={props.onDismiss}>Dismiss</button>}
    </div>
  );
}

export default function App() {
  return (
    <Panel title="Settings">
      <Alert message="Changes saved" dismissible onDismiss={() => alert('Dismissed')} />
      <Button variant="ghost" className="wide">
        Cancel
      </Button>
      <IconButton icon="✕" label="Close settings" />
    </Panel>
  );
}

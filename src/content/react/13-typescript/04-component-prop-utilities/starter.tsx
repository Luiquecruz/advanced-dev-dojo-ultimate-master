import type { ComponentProps, PropsWithChildren } from 'react';

// TODO: export ButtonProps based on ComponentProps<'button'> plus an optional variant ('primary' | 'ghost')

// TODO: type the props, default type to 'button' and variant to 'primary', merge className and spread the rest
export function Button({ children }: any) {
  return <button>{children}</button>;
}

// TODO: export IconButtonProps with Omit<ComponentProps<typeof Button>, 'children'> plus icon and label

export function IconButton({ icon }: any) {
  // TODO: render a Button with aria-label, the icon as child and the remaining props
  return <Button>{icon}</Button>;
}

// TODO: type Panel with PropsWithChildren<{ title: string }>
export function Panel({ title, children }: any) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

// TODO: export AlertProps as a discriminated union on `dismissible`

export function Alert(props: any) {
  // TODO: render the Dismiss button only when props.dismissible is true
  return <div role="alert">{props.message}</div>;
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

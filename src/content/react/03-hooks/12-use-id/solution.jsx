import { useId } from 'react';

export function FormField({ label, hint, type = 'text' }) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} aria-describedby={hintId} />
      <p id={hintId}>{hint}</p>
    </div>
  );
}

export default function SignupForm() {
  return (
    <form>
      <FormField label="Email" hint="We never share it." type="email" />
      <FormField label="Backup email" hint="Used to recover your account." type="email" />
    </form>
  );
}

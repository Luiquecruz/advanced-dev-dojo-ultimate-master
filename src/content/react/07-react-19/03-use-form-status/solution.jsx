import { useState } from 'react';
import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Subscribing...' : 'Subscribe'}
    </button>
  );
}

export function SendingHint() {
  const { pending, data } = useFormStatus();
  if (!pending) {
    return null;
  }
  return <p role="status">Sending to {data.get('email')}</p>;
}

export default function NewsletterForm({ onSubscribe = async () => {} }) {
  const [done, setDone] = useState(false);

  async function subscribe(formData) {
    await onSubscribe(formData.get('email'));
    setDone(true);
  }

  if (done) {
    return <p>Thanks for subscribing!</p>;
  }

  return (
    <form action={subscribe}>
      <label>
        Email
        <input name="email" type="email" />
      </label>
      <SendingHint />
      <SubmitButton />
    </form>
  );
}

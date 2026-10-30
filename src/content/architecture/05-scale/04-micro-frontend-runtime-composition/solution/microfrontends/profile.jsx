import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function goToCheckout() {
  window.dispatchEvent(new CustomEvent('mfe:navigate', { detail: { path: '/checkout' } }));
}

function Profile({ path }) {
  const [following, setFollowing] = useState(false);

  return (
    <article>
      <h2>Profile</h2>
      <p>Ada Lovelace · rendered by React at {path}</p>
      <button type="button" onClick={() => setFollowing(!following)}>
        {following ? 'Following' : 'Follow'}
      </button>
      <button type="button" onClick={goToCheckout}>
        Go to checkout
      </button>
    </article>
  );
}

export function mount(element, props) {
  const root = createRoot(element);
  root.render(<Profile {...props} />);
  return () => root.unmount();
}

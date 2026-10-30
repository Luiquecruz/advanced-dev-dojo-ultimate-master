export function mount(element, props) {
  const heading = document.createElement('h2');
  heading.textContent = 'Checkout';
  const description = document.createElement('p');
  description.textContent = `Plain DOM, no framework, at ${props.path}`;
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.textContent = 'Back to profile';

  function goToProfile() {
    window.dispatchEvent(new CustomEvent('mfe:navigate', { detail: { path: '/profile' } }));
  }

  backButton.addEventListener('click', goToProfile);
  element.append(heading, description, backButton);

  return () => {
    backButton.removeEventListener('click', goToProfile);
    element.replaceChildren();
  };
}

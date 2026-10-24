import { useId, useState } from 'react';

export function useDisclosure({ defaultOpen = false } = {}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((current) => !current);

  const getButtonProps = (props = {}) => ({
    ...props,
    type: 'button',
    'aria-expanded': isOpen,
    'aria-controls': panelId,
    onClick: (event) => {
      props.onClick?.(event);
      toggle();
    },
  });

  const getPanelProps = (props = {}) => ({
    ...props,
    id: panelId,
    hidden: !isOpen,
  });

  return { isOpen, open, close, toggle, getButtonProps, getPanelProps };
}

export default function FaqItem({ question = 'What is a headless component?', answer = 'Logic without markup.' }) {
  const { getButtonProps, getPanelProps } = useDisclosure();
  return (
    <div>
      <button {...getButtonProps()}>{question}</button>
      <p {...getPanelProps()}>{answer}</p>
    </div>
  );
}

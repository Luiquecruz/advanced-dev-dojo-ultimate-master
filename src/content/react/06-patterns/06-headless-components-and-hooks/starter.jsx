import { useId, useState } from 'react';

export function useDisclosure({ defaultOpen = false } = {}) {
  // TODO: keep isOpen in state, generate a panel id with useId and implement open, close and toggle
  const isOpen = defaultOpen;

  const getButtonProps = (props = {}) => ({
    // TODO: merge props with type, aria-expanded, aria-controls and a composed onClick
    ...props,
  });

  const getPanelProps = (props = {}) => ({
    // TODO: merge props with the panel id and hidden
    ...props,
  });

  return { isOpen, open: () => {}, close: () => {}, toggle: () => {}, getButtonProps, getPanelProps };
}

export default function FaqItem({ question = 'What is a headless component?', answer = 'Logic without markup.' }) {
  // TODO: call useDisclosure and spread the prop getters on the button and the panel
  return (
    <div>
      <button>{question}</button>
      <p>{answer}</p>
    </div>
  );
}

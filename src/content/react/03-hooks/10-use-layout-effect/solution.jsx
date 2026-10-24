import { useLayoutEffect, useRef, useState } from 'react';

export default function Tooltip({ anchorTop = 120, text = 'Saved to your library' }) {
  const tooltipRef = useRef(null);
  const [placement, setPlacement] = useState('top');

  useLayoutEffect(() => {
    const { height } = tooltipRef.current.getBoundingClientRect();
    setPlacement(anchorTop >= height ? 'top' : 'bottom');
  }, [anchorTop, text]);

  return (
    <div ref={tooltipRef} role="tooltip" data-placement={placement}>
      {text}
    </div>
  );
}

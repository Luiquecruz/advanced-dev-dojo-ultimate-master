import { useEffect, useRef, useState } from 'react';

export default function Tooltip({ anchorTop = 120, text = 'Saved to your library' }) {
  const tooltipRef = useRef(null);
  const [placement, setPlacement] = useState('top');

  // TODO: this measurement runs after paint, so users see the tooltip jump. Measure before paint instead.
  useEffect(() => {
    const { height } = tooltipRef.current.getBoundingClientRect();
    setPlacement(anchorTop >= height ? 'top' : 'bottom');
  }, [anchorTop, text]);

  return (
    <div ref={tooltipRef} role="tooltip" data-placement={placement}>
      {text}
    </div>
  );
}

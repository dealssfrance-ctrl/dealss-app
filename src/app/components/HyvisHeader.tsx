import { useEffect, useRef, useState, ReactNode } from 'react';

interface HyvisHeaderProps {
  /** Content rendered on the right side of the header (optional) */
  right?: ReactNode;
}

export function HyvisHeader({ right }: HyvisHeaderProps) {
  const [visible, setVisible] = useState(true);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
      if (y <= 10) {
        setVisible(true);
      } else if (y > lastScrollRef.current + 5) {
        setVisible(false);
      } else if (y < lastScrollRef.current - 5) {
        setVisible(true);
      }
      lastScrollRef.current = y;
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-20 flex items-center px-5 justify-between md:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <h1 className="text-2xl font-bold text-gray-900">Hyvis</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

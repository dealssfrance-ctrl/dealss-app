import { useEffect, useRef, useState, ReactNode } from 'react';
import { Logo } from './Logo';

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
    <>
      {/* Reserve vertical space so page content sits below the fixed header on mobile. */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <div
        className={`fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-20 grid grid-cols-[1fr_auto_1fr] items-center px-5 md:hidden transition-transform duration-300 ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* Left spacer keeps logo centered regardless of right slot width */}
        <div aria-hidden="true" />
        <Logo className="h-8 w-auto justify-self-center" />
        <div className="flex items-center gap-2 justify-self-end">{right}</div>
      </div>
    </>
  );
}

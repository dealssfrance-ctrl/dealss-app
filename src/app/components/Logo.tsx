import logoUrl from '../../imports/logotexttroqly.png';

interface LogoProps {
  /** Tailwind height class. Defaults to h-8. */
  className?: string;
  /** Optional alt text override. */
  alt?: string;
}

/**
 * Troqly brand logo. The source PNG lives in src/imports/ and is imported
 * through Vite so the bundler can hash and cache-bust the asset.
 */
export function Logo({ className = 'h-8 w-auto', alt = 'Troqly' }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}

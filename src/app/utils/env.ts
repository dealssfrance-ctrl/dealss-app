/**
 * Multi-environment URL utilities.
 * Works across localhost, GitHub Pages (with subpath), and custom domains.
 *
 * Vite sets `import.meta.env.BASE_URL` at build time:
 *   - Development:  "/"
 *   - Production:   "/dealss-app/"  (when built with --base=/dealss-app/)
 *   - Custom domain: "/"
 */

/** Full base URL including origin and base path, no trailing slash. */
export function getAppBaseUrl(): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${window.location.origin}${base}`;
}

/**
 * Build an absolute redirect URL for Supabase auth callbacks.
 * @param path  Route path, e.g. "/reset-password" or "" for home.
 */
export function getRedirectUrl(path: string = ''): string {
  const baseUrl = getAppBaseUrl();
  const cleanPath = path.replace(/^\//, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : `${baseUrl}/`;
}

/** The basename the router should use (e.g. "/dealss-app" or "/"). */
export function getRouterBasename(): string {
  return (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';
}

/** Log helper — prefixes all auth-related logs. */
export function authLog(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(`[Auth] ${message}`, ...args);
  }
}

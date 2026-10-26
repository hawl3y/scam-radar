const BASE = "https://same-site.invalid";

/**
 * Only allow same-site relative paths as post-login destinations. Parsed the
 * way browsers parse, since they drop tabs and newlines and treat "\" as "/"
 * (so "/\t/evil.test" would otherwise become "//evil.test").
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  try {
    const url = new URL(next, BASE);
    return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

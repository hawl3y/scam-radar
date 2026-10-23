// Links and bare domains. Kept in reports (they're useful for matching), but
// always displayed defanged and never clickable.

const TLDS =
  "com|net|org|info|biz|us|co|io|ly|me|xyz|top|site|online|app|gov|edu|shop|club|live|link|click|vip|icu|cc|tk|ws|ru|cn|uk|ca|de|in|support|help|services|pro|store|tech|cloud|page";

const URL_SOURCE = String.raw`\b(?:https?:\/\/|www\.)[^\s<>"']+`;
const DOMAIN_SOURCE = String.raw`\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:${TLDS})\b(?:\/[^\s<>"']*)?`;

/** Matches URLs (with scheme or www.) and bare domains like example.com/path. */
export function linkPattern() {
  return new RegExp(`${URL_SOURCE}|${DOMAIN_SOURCE}`, "gi");
}

const TRAILING_PUNCTUATION = /[.,;:!?)\]'"]+$/;

/** Split trailing sentence punctuation off a matched link. */
export function trimLink(match: string): [link: string, trailing: string] {
  const trailing = match.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return [match.slice(0, match.length - trailing.length), trailing];
}

function defangLink(link: string): string {
  const scheme = link.match(/^https?:\/\//i)?.[0] ?? "";
  const rest = link.slice(scheme.length);
  const slash = rest.indexOf("/");
  const host = slash === -1 ? rest : rest.slice(0, slash);
  const path = slash === -1 ? "" : rest.slice(slash);
  return scheme.replace(/^http/i, "hxxp") + host.replace(/\./g, "[.]") + path;
}

/** hxxps://example[.]com/login — safe to show, can't be clicked or auto-linked. */
export function defang(text: string): string {
  return text.replace(linkPattern(), (match) => {
    const [link, trailing] = trimLink(match);
    return defangLink(link) + trailing;
  });
}

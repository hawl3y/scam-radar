import { linkPattern, trimLink } from "./links";

export { defang } from "./links";

// Rules-based redaction (brief §7: redact before saving). The reporter reviews
// and can edit the result before it's posted. AI redaction is added in Phase 2.

export type RedactionKind = "email" | "phone" | "card" | "account" | "ssn" | "code" | "address" | "name";

export const PLACEHOLDERS: Record<RedactionKind, string> = {
  email: "[email]",
  phone: "[phone]",
  card: "[card number]",
  account: "[account number]",
  ssn: "[SSN]",
  code: "[code]",
  address: "[address]",
  name: "[name]",
};

export type RedactionResult = { text: string; found: Partial<Record<RedactionKind, number>> };

const SENTINEL_OPEN = "";
const SENTINEL_CLOSE = "";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
const PHONE_US = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;
const PHONE_INTL = /\+\d{1,3}[\s.-]?\d(?:[\s.-]?\d){6,12}\b/g;
const CODE =
  /\b((?:verification|security|confirmation|access|one[- ]time|login|auth(?:entication)?|pass)?\s*(?:code|pin|passcode|password)\s*(?:is|was|of)?\s*[:#]?\s*)(\d{4,8})\b/gi;
const ACCOUNT =
  /\b((?:account|acct|routing|member|policy|card|order|case|reference|ref|invoice|customer|tracking|ssn|social security)\s*(?:number|no\.?|num|#|id)?\s*(?:ending\s+in|ends\s+in|ending|last\s+(?:4|four)(?:\s+digits)?)?\s*(?:is|was|of)?\s*[:#]?\s*)((?:[*xX•]+\s*)?\d[\d -]{2,}\d)\b/gi;
const MASKED = /(?:[*xX•]{2,}[\s-]?)\d{3,4}\b/g;
const LONG_DIGITS = /\b\d{8,}\b/g;

const STREET_SUFFIX =
  "Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Terrace|Ter|Parkway|Pkwy|Circle|Cir|Highway|Hwy|Trail|Trl|Square|Sq";
const ADDRESS = new RegExp(
  String.raw`\b\d{1,6}\s+(?:[NSEW]\.?\s+)?(?:(?:[A-Z][a-zA-Z'.-]*|\d+(?:st|nd|rd|th))\s+){1,4}(?:${STREET_SUFFIX})\b\.?(?:,?\s+(?:Apt|Apartment|Unit|Suite|Ste|#)\.?\s*[A-Za-z0-9-]+)?`,
  "g",
);
const PO_BOX = /\bP\.?\s?O\.?\s+Box\s+\d+/gi;

// Names: rules can only catch names in common phrasings. The preview step lets
// the reporter fix anything missed.
const NAME_WORD = String.raw`[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?`;
const NAME_1_2 = String.raw`${NAME_WORD}(?:\s+(?:[A-Z]\.\s+)?${NAME_WORD})?`;
const NAME_2 = String.raw`${NAME_WORD}\s+(?:[A-Z]\.\s+)?${NAME_WORD}`;
const ci = (words: string) =>
  words
    .split("|")
    .map((w) => `[${w[0].toUpperCase()}${w[0].toLowerCase()}]${w.slice(1)}`)
    .join("|");

const NAME_RULES: RegExp[] = [
  new RegExp(
    String.raw`(\b(?:${ci("mr|mrs|ms|miss|mx|dr|officer|agent|deputy|sgt|sergeant|detective|lt|lieutenant|captain|capt|judge|attorney|lawyer|pastor|father")})\.?\s+)(${NAME_1_2})`,
    "g",
  ),
  new RegExp(String.raw`(\b(?:${ci("my name is|name's|named|signed|ask for|speak to|speak with|talk to|talk with")})\s+)(${NAME_1_2})`, "g"),
  new RegExp(String.raw`(\b(?:${ci("this is|i'm|i am|it's")})\s+)(${NAME_2})`, "g"),
  new RegExp(
    String.raw`(\b(?:${ci("my|your|our|his|her")})\s+(?:${"son|daughter|grandson|granddaughter|grandchild|nephew|niece|husband|wife|brother|sister|mom|mother|dad|father|grandma|grandmother|grandpa|grandfather|cousin|friend|neighbor|uncle|aunt|boss"})\s*,?\s+)(${NAME_1_2})`,
    "g",
  ),
  new RegExp(String.raw`((?:^|\n)\s*(?:${ci("hi|hello|hey|dear|good morning|good afternoon|good evening")})\s+)(${NAME_1_2})`, "g"),
  new RegExp(
    String.raw`((?:^|\n)\s*(?:${ci("thanks|thank you|regards|best|sincerely|cheers|respectfully|best regards|kind regards")})\s*,?\s*\n?\s*|\n\s*[-–—]\s*)(${NAME_1_2})(?=\s*$)`,
    "g",
  ),
];

// Words that look like names after a trigger but aren't.
const NOT_NAMES = new Set(
  (
    "there|customer|customers|sir|madam|valued|user|member|friend|all|everyone|team|folks|guys|neighbor|neighbors|" +
    "mom|dad|grandma|grandpa|the|a|an|you|your|my|our|this|that|it|we|they|he|she|calling|here|not|just|also|so|" +
    "very|really|sorry|good|hello|hi|from|with|and|or|at|on|in|of|to|for|urgent|important|final|notice|account|" +
    "amazon|apple|microsoft|google|paypal|venmo|zelle|cash|usps|ups|fedex|dhl|irs|ssa|medicare|walmart|target|netflix|" +
    "chase|wells|fargo|citi|bank|geek|squad|norton|mcafee|costco|best|buy|ebay|facebook|meta|instagram|verizon|" +
    "comcast|xfinity|spectrum|social|security|police|sheriff|department|county|state|federal|support|service|services|" +
    "officer|agent|deputy|detective|sergeant|captain|judge|attorney|mr|mrs|ms|dr"
  ).split("|"),
);

function keepNameWords(candidate: string): string | null {
  const words = candidate.split(/\s+/);
  const kept: string[] = [];
  for (const word of words) {
    if (NOT_NAMES.has(word.toLowerCase().replace(/\.$/, ""))) break;
    kept.push(word);
  }
  return kept.length ? kept.join(" ") : null;
}

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function redact(input: string): RedactionResult {
  const found: RedactionResult["found"] = {};
  const count = (kind: RedactionKind) => {
    found[kind] = (found[kind] ?? 0) + 1;
    return PLACEHOLDERS[kind];
  };

  let text = input.replace(/[]/g, "").replace(/\r\n?/g, "\n");

  text = text.replace(EMAIL, () => count("email"));

  // Protect links so digits inside them aren't treated as phone/account numbers.
  const links: string[] = [];
  text = text.replace(linkPattern(), (match) => {
    const [link, trailing] = trimLink(match);
    links.push(link);
    return `${SENTINEL_OPEN}${links.length - 1}${SENTINEL_CLOSE}${trailing}`;
  });

  text = text.replace(SSN, () => count("ssn"));
  text = text.replace(CARD, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhn(digits) ? count("card") : match;
  });
  text = text.replace(PHONE_INTL, () => count("phone"));
  text = text.replace(PHONE_US, () => count("phone"));
  text = text.replace(CODE, (_m, prefix: string) => prefix + count("code"));
  text = text.replace(ACCOUNT, (_m, prefix: string) => prefix + count("account"));
  text = text.replace(MASKED, () => count("account"));
  text = text.replace(LONG_DIGITS, () => count("account"));
  text = text.replace(ADDRESS, () => count("address"));
  text = text.replace(PO_BOX, () => count("address"));

  for (const rule of NAME_RULES) {
    text = text.replace(rule, (match, prefix: string, candidate: string) => {
      const name = keepNameWords(candidate);
      if (!name) return match;
      return prefix + count("name") + candidate.slice(name.length);
    });
  }

  text = text.replace(
    new RegExp(`${SENTINEL_OPEN}(\\d+)${SENTINEL_CLOSE}`, "g"),
    (_m, i: string) => links[Number(i)],
  );

  return { text, found };
}

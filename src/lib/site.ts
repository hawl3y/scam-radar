// Name, domain, and email addresses live here. Renaming? See "Rename / new
// domain checklist" in PILOT.md for everything outside the code.
// Working title until the name is decided (only if the pilot continues).
export const SITE_NAME = "Scam Radar";
export const SITE_DESCRIPTION =
  "See what scams are going around near you, and report the ones you get.";

/** Contact for questions and data deletion requests. Used on all legal pages. */
export const SUPPORT_EMAIL = "support@joechawley.com";

/** Next steps fallback when a market has no police_contact set (markets table). */
export const DEFAULT_POLICE_CONTACT = "your local police non-emergency line";

/** Production address, used on printed materials (QR code on /flyer). */
export const PUBLIC_SITE_URL = "https://scam-radar.joechawley.com";

/** Sender for alert emails (domain must be verified in Resend). */
export const ALERTS_FROM_EMAIL = "alerts@scam-radar.joechawley.com";

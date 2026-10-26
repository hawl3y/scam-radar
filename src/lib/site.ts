// The repo and infrastructure names keep "scam-radar".
export const SITE_NAME = "ByeBell";
/** Home hero headline and link-preview line. */
export const SITE_TAGLINE = "Ring the bell on scams";
export const SITE_DESCRIPTION =
  "See what scams are going around near you, and report the ones you get.";

/** Contact for questions and data deletion requests. Used on all legal pages. */
export const SUPPORT_EMAIL = "support@byebell.com";

/** Next steps fallback when a market has no police_contact set (markets table). */
export const DEFAULT_POLICE_CONTACT = "your local police non-emergency line";

/** Production address, used on printed materials (QR code on /flyer). */
export const PUBLIC_SITE_URL = "https://byebell.com";

/** Sender for alert emails (domain must be verified in Resend). */
export const ALERTS_FROM_EMAIL = "alerts@byebell.com";

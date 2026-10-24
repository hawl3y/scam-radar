"use server";

import { ALERT_MODES, setAlertMode } from "@/lib/alerts/preferences";
import { verifyPrefsToken } from "@/lib/alerts/tokens";

export type PrefsState = { saved?: boolean; error?: string };

export async function saveEmailPreference(token: string, _prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const userId = verifyPrefsToken(token);
  if (!userId) return { error: "This link isn't valid. Use the link in your most recent email." };

  const mode = ALERT_MODES.find((m) => m === formData.get("alertMode"));
  if (!mode) return { error: "Choose an option." };

  return (await setAlertMode(userId, mode)) ? { saved: true } : { error: "We couldn't save that. Please try again." };
}

import type { AlertMode } from "@/lib/alerts/preferences";

const OPTIONS: { value: AlertMode; label: string; hint: string }[] = [
  { value: "digest", label: "Daily digest", hint: "One email a day when there's something new near you." },
  { value: "instant", label: "Instant alerts and daily digest", hint: "An email right away when several neighbors report the same scam." },
  { value: "off", label: "No emails", hint: "You can still check the app anytime." },
];

export function AlertModeOptions({ value, onChange }: { value?: AlertMode; onChange?: (mode: AlertMode) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-bold">How should we email you?</legend>
      <div className="space-y-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border-2 border-border p-3 has-checked:border-accent"
          >
            <input
              type="radio"
              name="alertMode"
              value={option.value}
              {...(onChange
                ? { checked: value === option.value, onChange: () => onChange(option.value) }
                : { defaultChecked: value === option.value })}
              className="mt-1 size-5"
            />
            <span>
              <span className="block font-bold">{option.label}</span>
              <span className="block text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

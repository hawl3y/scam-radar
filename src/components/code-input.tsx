"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const CODE_LENGTH = 6;

// Clipboard reading isn't available everywhere, and not during server rendering.
const noSubscribe = () => () => {};
const clipboardReadable = () => typeof navigator.clipboard?.readText === "function";

type Props = {
  className: string;
  /** The submit button's `value` (its name is "intent"), used when auto-submitting. */
  submitIntent: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * The sign-in code field: numeric keypad, one-time-code autofill, a Paste code
 * button, and auto-submit once 6 digits are in.
 */
export function CodeInput({ className, submitIntent, disabled, autoFocus }: Props) {
  const [code, setCode] = useState("");
  const canPaste = useSyncExternalStore(noSubscribe, clipboardReadable, () => false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitted = useRef<string | null>(null);

  useEffect(() => {
    if (code.length !== CODE_LENGTH || disabled || submitted.current === code) return;
    const form = inputRef.current?.form;
    const button = form?.querySelector<HTMLButtonElement>(`button[name="intent"][value="${submitIntent}"]`);
    if (!form || !button) return;
    submitted.current = code;
    form.requestSubmit(button);
  }, [code, disabled, submitIntent]);

  async function paste() {
    setPasteError(null);
    try {
      const digits = (await navigator.clipboard.readText()).match(/\d[\d\s-]{4,}\d/)?.[0].replace(/\D/g, "");
      if (digits && digits.length >= CODE_LENGTH && digits.length <= 10) setCode(digits);
      else setPasteError("We didn't find a code on your clipboard. Copy the code from the email, then try again.");
    } catch {
      setPasteError("Pasting isn't allowed here. Tap the box and paste, or type the code.");
    }
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={10}
          required
          autoFocus={autoFocus}
          value={code}
          onChange={(e) => {
            setPasteError(null);
            setCode(e.target.value.replace(/\D/g, ""));
          }}
          aria-describedby={pasteError ? "code-paste-error" : undefined}
          className={`${className} tracking-widest`}
        />
        {canPaste && (
          <button
            type="button"
            onClick={paste}
            disabled={disabled}
            className="min-h-12 shrink-0 rounded-md border-2 border-accent bg-surface px-4 font-bold whitespace-nowrap disabled:opacity-60"
          >
            Paste code
          </button>
        )}
      </div>
      {pasteError && (
        <p id="code-paste-error" role="alert" className="text-danger">
          {pasteError}
        </p>
      )}
    </div>
  );
}

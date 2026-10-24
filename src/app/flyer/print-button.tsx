"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground print:hidden"
    >
      Print this flyer
    </button>
  );
}

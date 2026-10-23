export function ZipForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/" method="get" className="flex flex-wrap items-end gap-3">
      <label className="space-y-2">
        <span className="block font-bold">Your zip code</span>
        <input
          name="zip"
          defaultValue={defaultValue}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          required
          pattern="[0-9]{5}"
          className="block w-40 min-h-12 rounded-md border-2 border-border bg-background px-3 text-lg"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground"
      >
        Show scams near me
      </button>
    </form>
  );
}

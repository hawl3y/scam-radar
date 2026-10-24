export function ZipForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/" method="get" className="grid gap-3 sm:flex sm:flex-wrap sm:items-end lg:grid lg:grid-cols-2">
      <label className="block space-y-2">
        <span className="block font-bold">Your zip code</span>
        <input
          name="zip"
          defaultValue={defaultValue}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          required
          pattern="[0-9]{5}"
          className="block min-h-11 w-full rounded-md border-2 border-border bg-background px-3 text-lg sm:min-h-12 sm:w-40 lg:w-full"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-md bg-accent px-4 text-base font-bold text-accent-foreground sm:min-h-12 sm:w-auto sm:px-5 sm:text-lg lg:w-full lg:px-3 lg:text-base"
      >
        Show scams near me
      </button>
    </form>
  );
}

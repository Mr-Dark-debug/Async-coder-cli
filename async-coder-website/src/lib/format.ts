const formatters = new Map<string, Intl.DateTimeFormat>();

/** Locale- and timezone-independent date text, so server HTML and client render match. */
export function formatDate(
  input: string | number | Date | undefined,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) {
  if (input === undefined) return "—";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const key = JSON.stringify(options);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });
    formatters.set(key, formatter);
  }
  return formatter.format(date);
}

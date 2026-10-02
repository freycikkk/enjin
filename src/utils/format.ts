/**
 * Small formatting helpers shared by the info commands (guild, user, memory...).
 *
 * Everything here returns plain strings. We deliberately avoid Discord's
 * `<t:123:R>` timestamps because the reports are sent inside code blocks,
 * where Discord does not render them.
 */

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** 1536 -> "1.50 KB". Handles negatives and non-finite numbers. */
export function bytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";

  const sign = value < 0 ? "-" : "";
  let size = Math.abs(value);
  let unit = 0;

  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit++;
  }

  // Plain bytes never need decimals.
  return `${sign}${unit === 0 ? size : size.toFixed(2)} ${UNITS[unit]}`;
}

/** 1234567 -> "1,234,567" */
export function num(value: number | bigint | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return value.toLocaleString("en-US");
}

/** true -> "Yes", false -> "No", null/undefined -> "N/A" */
export function yn(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return value ? "Yes" : "No";
}

/** Turns a millisecond span into "2d 3h 4m 5s". Skips leading zero units. */
export function duration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "N/A";

  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (d || h) parts.push(`${h}h`);
  if (d || h || m) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

/** Rough age for long spans: "3y 41d" for old things, the exact duration for anything under a year. */
function approx(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days < 365) return duration(ms);
  return `${Math.floor(days / 365)}y ${days % 365}d`;
}

/** "2024-05-01 12:30:00 UTC (3y 41d ago, or "2h 5m 1s ago" if under a year)". Accepts a Date or ms timestamp. */
export function date(value: Date | number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";

  const ms = value instanceof Date ? value.getTime() : value;
  if (!Number.isFinite(ms)) return "N/A";

  const iso = new Date(ms).toISOString().replace("T", " ").slice(0, 19);
  const diff = Date.now() - ms;

  // Future dates (e.g. an invite expiry) read better as "in ...".
  const rel = diff >= 0 ? `${approx(diff)} ago` : `in ${approx(-diff)}`;
  return `${iso} UTC (${rel})`;
}

/** Joins a list, cutting it off after `max` items: "a, b, c (+12 more)". */
export function list(items: readonly (string | number)[], max = 15): string {
  if (!items.length) return "None";
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} (+${items.length - max} more)` : shown;
}

/** Alias of `list` with a bigger default limit, used for permission and feature flag names. */
export function flags(items: readonly string[], max = 30): string {
  return list(items, max);
}

/** Returns the value as text, or "None" for null/undefined/empty strings. */
export function str(value: unknown): string {
  if (value === null || value === undefined || value === "") return "None";
  return String(value);
}

/** Cuts long text (topics, descriptions) and flattens newlines so a field stays on one line. */
export function clip(value: string | null | undefined, max = 200): string {
  if (!value) return "None";
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 3)}...` : flat;
}

/**
 * Turns a numeric enum value into its name, e.g. enumName(ChannelType, 0) -> "GuildText".
 * Falls back to the raw number when the value isn't in the enum.
 */
export function enumName(enumObject: Record<number, string>, value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return enumObject[value] ?? String(value);
}

/** 0x5865f2 -> "#5865F2" */
export function hex(color: number | null | undefined): string {
  if (color === null || color === undefined) return "None";
  return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
}

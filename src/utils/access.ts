/**
 * Safe property readers.
 *
 * discord.js has many channel / guild classes and each one only has a few of
 * the properties we want to show (topic, bitrate, userLimit, ...). Instead of
 * writing a giant type-guard ladder, these helpers read a key if it exists and
 * hand back `undefined` when it doesn't. Report code then just skips what is
 * missing.
 */

export function read(obj: unknown, key: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[key];
}

export function readStr(obj: unknown, key: string): string | undefined {
  const value = read(obj, key);
  return typeof value === "string" ? value : undefined;
}

export function readNum(obj: unknown, key: string): number | undefined {
  const value = read(obj, key);
  return typeof value === "number" ? value : undefined;
}

export function readBool(obj: unknown, key: string): boolean | undefined {
  const value = read(obj, key);
  return typeof value === "boolean" ? value : undefined;
}

/** Size of a `.cache` collection hanging off `obj[key]`, e.g. cacheSize(channel, "messages"). */
export function cacheSize(obj: unknown, key: string): number | undefined {
  const manager = read(obj, key);
  const cache = read(manager, "cache");
  return cache instanceof Map ? cache.size : undefined;
}

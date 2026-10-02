/**
 * Helpers for working with Discord IDs (snowflakes).
 */

/** Discord's epoch: 2015-01-01T00:00:00.000Z. Every snowflake counts ms from here. */
const DISCORD_EPOCH = 1420070400000n;

/**
 * Pulls an ID out of whatever the owner typed: a raw id, a mention like
 * `<@123>` / `<#123>` / `<@&123>`, a custom emoji `<:name:123>` or even a URL.
 * Returns `null` when nothing that looks like an id is found.
 *
 * `index` picks which id to use when the input holds several, e.g. a message
 * link `/channels/GUILD/CHANNEL/MESSAGE` has three of them.
 */
export function parseSnowflake(input: string | undefined, index = 0): string | null {
  if (!input) return null;
  const matches = input.match(/\d{15,21}/g);
  return matches?.[index] ?? null;
}

/** When the object with this id was created, as a unix ms timestamp. */
export function snowflakeTime(id: string): number {
  return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
}

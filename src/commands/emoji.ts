import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { date, list, str, yn } from "../utils/format.js";
import { parseSnowflake, snowflakeTime } from "../utils/snowflake.js";
import { cacheSize, read, readBool, readStr } from "../utils/access.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `emoji <emoji | id>`
 *
 * Accepts a custom emoji (`<:name:id>` / `<a:name:id>`), a raw id, or a normal
 * unicode emoji like 🔥.
 *
 * Custom emoji lookup order:
 *   1. guild emojis this shard has cached
 *   2. the bot's own application emojis
 *   3. the Discord CDN (we can still tell if it exists and if it's animated)
 */
export const emoji = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  if (!input?.trim()) {
    await message.reply("[ Enjin ] Missing emoji or emoji id.");
    return;
  }

  const text = input.trim();
  const id = parseSnowflake(text);

  // No id in there -> it must be a unicode emoji.
  if (!id) {
    await sendReport(message, unicodeReport(text), ctx.secrets, client.token);
    return;
  }

  // The animated flag and name are also written inside the mention itself.
  const mention = text.match(/^<(a)?:(\w+):\d+>$/);
  const mentionAnimated = mention ? mention[1] === "a" : undefined;
  const mentionName = mention?.[2];

  const cached = client.emojis.cache.get(id);
  if (cached) {
    const animated = cached.animated === true;
    const author = await cached.fetchAuthor().catch(() => null);

    const report = new InfoReport(`Emoji: ${cached.name ?? id}`)
      .section("General")
      .field("Name", str(cached.name))
      .field("ID", cached.id)
      .field("Source", "Guild emoji (cached)")
      .field("Created", date(cached.createdAt))
      .field("Animated", yn(animated))
      .field("Available", yn(cached.available))
      .field("Managed (integration)", yn(cached.managed))
      .field("Requires Colons", yn(cached.requiresColons))
      .field("Guild", `${cached.guild.name} (${cached.guild.id})`)
      .field("Uploaded By", author ? `${author.username} (${author.id})` : "Unknown (needs ManageGuildExpressions)")

      .section("Usage")
      .field("Raw Format", `\\${cached.toString()}`)
      .field("Identifier", cached.identifier)
      .field("Role Restricted", yn(cached.roles.cache.size > 0))
      .field("Allowed Roles", list(cached.roles.cache.map((r) => r.name)))
      .field("URL", `https://cdn.discordapp.com/emojis/${cached.id}.${animated ? "gif" : "png"}?size=256`);

    await sendReport(message, report, ctx.secrets, client.token);
    return;
  }

  // Application emojis belong to the bot itself and can be fetched by id.
  const appEmoji = await fetchApplicationEmoji(client, id);
  if (appEmoji) {
    const animated = readBool(appEmoji, "animated") === true;
    const ext = animated ? "gif" : "png";

    const report = new InfoReport(`Emoji: ${readStr(appEmoji, "name") ?? id}`)
      .section("General")
      .field("Name", str(readStr(appEmoji, "name")))
      .field("ID", id)
      .field("Source", "Application emoji (owned by this bot)")
      .field("Created", date(snowflakeTime(id)))
      .field("Animated", yn(animated))
      .field("URL", `https://cdn.discordapp.com/emojis/${id}.${ext}?size=256`);

    await sendReport(message, report, ctx.secrets, client.token);
    return;
  }

  // Not cached anywhere. Ask the CDN so we can still say something useful.
  const probe = await probeCdn(id);

  const report = new InfoReport(`Emoji: ${mentionName ?? id}`)
    .section("Not Cached (limited info)")
    .field("Name", str(mentionName))
    .field("ID", id)
    .field("Created", date(snowflakeTime(id)))
    .field("Exists On CDN", yn(probe.exists))
    .field("Animated", yn(probe.exists ? probe.animated : mentionAnimated))
    .field("URL", probe.exists ? probe.url : "None")
    .field("Note", "The bot isn't in the guild that owns it (or it's on another shard).");

  await sendReport(message, report, ctx.secrets, client.token);
};

/** Info about a plain unicode emoji. There is no database of names, so we show the code points. */
function unicodeReport(text: string): InfoReport {
  // Spread splits by code point, so surrogate pairs stay together.
  const points = [...text].map((c) => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`);

  return new InfoReport(`Emoji: ${text}`)
    .section("Unicode Emoji")
    .field("Emoji", text)
    .field("Code Points", points.join(" "))
    .field("Code Point Count", points.length)
    .field("UTF-16 Length", text.length)
    .field("UTF-8 Bytes", Buffer.byteLength(text, "utf8"))
    .field("Escape", [...text].map((c) => `\\u{${(c.codePointAt(0) ?? 0).toString(16)}}`).join(""))
    .field("Note", "Unicode emojis are not tied to a guild, so there is nothing else to look up.");
}

/** Tries `client.application.emojis.fetch(id)`. Returns null on any failure or older discord.js. */
async function fetchApplicationEmoji(client: Client, id: string): Promise<unknown> {
  const manager = read(client.application, "emojis");
  const fetcher = read(manager, "fetch");
  if (typeof fetcher !== "function") return null;

  try {
    // Cache first, REST second.
    if (cacheSize(client.application, "emojis")) {
      const cache = read(manager, "cache") as Map<string, unknown>;
      const hit = cache.get(id);
      if (hit) return hit;
    }
    return (await fetcher.call(manager, id)) ?? null;
  } catch {
    return null;
  }
}

/** HEAD request to the CDN: .gif only exists for animated emojis, .png for the rest. */
async function probeCdn(id: string): Promise<{ exists: boolean; animated: boolean; url: string }> {
  const check = async (ext: "gif" | "png") => {
    const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5_000) });
      return res.ok ? url : null;
    } catch {
      return null;
    }
  };

  const gif = await check("gif");
  if (gif) return { exists: true, animated: true, url: gif };

  const png = await check("png");
  if (png) return { exists: true, animated: false, url: png };

  return { exists: false, animated: false, url: "" };
}

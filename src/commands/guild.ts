import { InfoReport } from "../class/InfoReport.js";
import { parseSnowflake, snowflakeTime } from "../utils/snowflake.js";
import { cacheSize, readNum } from "../utils/access.js";
import { sendReport } from "../utils/respond.js";
import { clip, date, enumName, flags, list, num, str, yn } from "../utils/format.js";
import {
  ChannelType,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildMFALevel,
  GuildNSFWLevel,
  GuildPremiumTier,
  GuildVerificationLevel,
} from "discord.js";

import type { Client, Guild } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `guild [id]`
 *
 * Shows everything we can find out about a guild. With no id it uses the guild
 * the command was typed in. Lookup order:
 *   1. this shard's cache
 *   2. REST fetch (works for any guild the bot is in, even on another shard)
 *   3. public guild preview (works for discoverable guilds the bot is NOT in)
 */
export const guild = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  const id = parseSnowflake(input) ?? message.guildId;
  if (!id) {
    await message.reply("[ Enjin ] Missing guild id.");
    return;
  }

  let target: Guild | undefined = client.guilds.cache.get(id);

  if (!target) {
    try {
      target = await client.guilds.fetch(id);
    } catch {
      // Bot isn't in this guild. The preview endpoint may still know about it.
      await previewFallback(client, ctx, id);
      return;
    }
  }

  // A REST-fetched guild has no channels cached, so pull them in once to get real counts.
  if (target.channels.cache.size === 0) {
    await target.channels.fetch().catch(() => null);
  }

  // Owner is only an id on the guild object; resolve it so the report is readable.
  const owner = await client.users.fetch(target.ownerId).catch(() => null);

  const report = new InfoReport(`Guild: ${target.name}`)
    .section("General")
    .field("Name", target.name)
    .field("ID", target.id)
    .field("Created", date(target.createdAt))
    .field("Owner", owner ? `${owner.username} (${owner.id})` : target.ownerId)
    .field("Description", clip(target.description))
    .field("Locale", target.preferredLocale)
    .field("Vanity URL", target.vanityURLCode ? `discord.gg/${target.vanityURLCode}` : "None")
    .field("Partnered", yn(target.partnered))
    .field("Verified", yn(target.verified))
    .field("Large", yn(target.large))
    .field("Available", yn(target.available))
    .field("Shard ID", target.shardId)

    .section("Members")
    .field("Member Count", num(target.memberCount))
    .field("Approx Members", num(target.approximateMemberCount))
    .field("Approx Online", num(target.approximatePresenceCount))
    .field("Max Members", num(target.maximumMembers))
    .field("Members Cached", num(target.members.cache.size))
    .field("Bot Joined", date(target.members.me?.joinedAt))

    .section("Content Counts")
    .field("Channels", channelBreakdown(target))
    .field("Roles", num(target.roles.cache.size))
    .field("Highest Role", target.roles.highest.name)
    .field("Emojis", emojiBreakdown(target))
    .field("Stickers", num(target.stickers.cache.size))
    .field("Scheduled Events", num(cacheSize(target, "scheduledEvents")))

    .section("Boosts")
    .field("Tier", enumName(GuildPremiumTier, target.premiumTier))
    .field("Boosts", num(target.premiumSubscriptionCount))
    .field("Progress Bar", yn(target.premiumProgressBarEnabled))

    .section("Moderation")
    .field("Verification", enumName(GuildVerificationLevel, target.verificationLevel))
    .field("Explicit Filter", enumName(GuildExplicitContentFilter, target.explicitContentFilter))
    .field("2FA Required", enumName(GuildMFALevel, target.mfaLevel))
    .field("NSFW Level", enumName(GuildNSFWLevel, target.nsfwLevel))
    .field("Default Notifs", enumName(GuildDefaultMessageNotifications, target.defaultMessageNotifications))

    .section("Special Channels")
    .field("System", str(target.systemChannelId))
    .field("Rules", str(target.rulesChannelId))
    .field("Updates", str(target.publicUpdatesChannelId))
    .field("AFK", target.afkChannelId ? `${target.afkChannelId} (${target.afkTimeout}s timeout)` : "None")
    .field("Widget", target.widgetEnabled ? `Enabled (channel ${str(target.widgetChannelId)})` : "Disabled")

    .section("Assets")
    .field("Icon", str(target.iconURL({ size: 1024 })))
    .field("Banner", str(target.bannerURL({ size: 1024 })))
    .field("Splash", str(target.splashURL({ size: 1024 })))
    .field("Discovery Splash", str(target.discoverySplashURL({ size: 1024 })))

    .section("Bot In This Guild")
    .field("Nickname", str(target.members.me?.nickname))
    .field("Administrator", yn(target.members.me?.permissions.has("Administrator")))
    .field("Top Role", str(target.members.me?.roles.highest.name))

    .section("Features")
    .field("Count", target.features.length)
    .field("List", flags(target.features))
    .field("Max Video Users", num(readNum(target, "maxVideoChannelUsers")));

  await sendReport(message, report, ctx.secrets, client.token);
};

/** "42 (Text 30, Voice 8, Category 4)" built from whatever channels are cached. */
function channelBreakdown(target: Guild): string {
  const counts = new Map<string, number>();

  for (const channel of target.channels.cache.values()) {
    const name = enumName(ChannelType, channel.type);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  if (!counts.size) return "0";
  const parts = [...counts.entries()].map(([name, count]) => `${name} ${count}`);
  return `${target.channels.cache.size} (${list(parts, 12)})`;
}

/** "25 (Static 20, Animated 5)" */
function emojiBreakdown(target: Guild): string {
  const all = target.emojis.cache;
  const animated = all.filter((e) => e.animated === true).size;
  return `${all.size} (Static ${all.size - animated}, Animated ${animated})`;
}

/** Limited report for guilds the bot can't see but that are public (discoverable). */
async function previewFallback(client: Client, ctx: Context, id: string) {
  const { message } = ctx;

  try {
    const preview = await client.fetchGuildPreview(id);

    const report = new InfoReport(`Guild Preview: ${preview.name}`)
      .section("Public Preview (bot is not in this guild)")
      .field("Name", preview.name)
      .field("ID", preview.id)
      .field("Created", date(snowflakeTime(preview.id)))
      .field("Description", clip(preview.description))
      .field("Approx Members", num(preview.approximateMemberCount))
      .field("Approx Online", num(preview.approximatePresenceCount))
      .field("Emojis", preview.emojis.size)
      .field("Stickers", preview.stickers.size)
      .field("Icon", str(preview.iconURL({ size: 1024 })))
      .field("Features", flags(preview.features));

    await sendReport(message, report, ctx.secrets, client.token);
  } catch {
    // Not found anywhere, but the id itself still tells us when it was made.
    await message.reply(
      `[ Enjin ] Guild not found. The bot is not in it and it is not public.\nID created: ${date(snowflakeTime(id))}`
    );
  }
}

import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { snowflakeTime } from "../utils/snowflake.js";
import { clip, date, flags, hex, list, str, yn } from "../utils/format.js";

import type { Client, Guild } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `member <guildId> <userId>`
 *
 * Fetches a user as a member of a specific guild and shows the guild specific
 * data: nickname, join date, roles, permissions, voice state, presence...
 * Both ids are required, in that order. Mentions work for the user part.
 *
 * Steps:
 *   1. find the guild (cache first, then REST)
 *   2. fetch the member from that guild (REST, so it works even if not cached)
 *   3. fetch the user too, so banner / accent colour can be shown
 */
export const member = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  // Pull every id out of the input. First is the guild, second is the user.
  const ids = input?.match(/\d{15,21}/g) ?? [];
  const guildId = ids[0];
  const userId = ids[1];

  if (!guildId || !userId) {
    await message.reply("[ Enjin ] Usage: `member <guildId> <userId>`");
    return;
  }

  let guild: Guild;
  try {
    guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
  } catch {
    await message.reply("[ Enjin ] Guild not found. The bot has to be in it.");
    return;
  }

  const target = await guild.members.fetch({ user: userId, force: true }).catch(() => null);
  if (!target) {
    await message.reply(
      `[ Enjin ] Member not found in ${guild.name}.\nUser id created: ${date(snowflakeTime(userId))}`
    );
    return;
  }

  // A member's user object from the guild payload has no banner, fetch the full one.
  const account = await client.users.fetch(userId, { force: true }).catch(() => target.user);

  // Skip @everyone, it's on every member and only adds noise.
  const roles = target.roles.cache
    .filter((r) => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => r.name);

  const timeout = target.communicationDisabledUntil;

  const report = new InfoReport(`Member: ${target.displayName} in ${guild.name}`)
    .section("Account")
    .field("Username", account.username)
    .field("User ID", account.id)
    .field("Created", date(account.createdAt))
    .field("Bot", yn(account.bot))
    .field("Public Flags", flags(account.flags?.toArray() ?? []))
    .field("Banner", str(account.bannerURL({ size: 1024 })))

    .section("Guild")
    .field("Guild", `${guild.name} (${guild.id})`)
    .field("Is Owner", yn(guild.ownerId === target.id))
    .field("Nickname", str(target.nickname))
    .field("Display Name", target.displayName)
    .field("Joined", date(target.joinedAt))
    .field("Boosting Since", target.premiumSince ? date(target.premiumSince) : "Not boosting")
    .field("Guild Avatar", str(target.avatar ? target.displayAvatarURL({ size: 1024 }) : null))
    .field("Pending Screening", yn(target.pending))
    .field("Timed Out Until", timeout && timeout.getTime() > Date.now() ? date(timeout) : "No")
    .field("Colour", hex(target.displayColor))
    .field("Flags", flags(target.flags.toArray()))

    .section("Roles")
    .field("Highest Role", target.roles.highest.name)
    .field("Role Count", roles.length)
    .field("Roles", list(roles, 25))

    .section("Permissions")
    .field("Administrator", yn(target.permissions.has("Administrator")))
    .field("Count", target.permissions.toArray().length)
    .field("List", flags(target.permissions.toArray(), 60))

    .section("Voice")
    .field("Channel", str(target.voice.channel?.name))
    .field("Muted / Deafened", `${yn(target.voice.mute)} / ${yn(target.voice.deaf)}`)
    .field("Streaming", yn(target.voice.streaming))

    .section("Presence")
    .field("Status", target.presence?.status ?? "Unknown (needs GuildPresences intent)")
    .field("Platforms", list(Object.keys(target.presence?.clientStatus ?? {})))
    .field("Activities", clip(target.presence?.activities.map((a) => a.name).join(", ")))

    .section("Bot Access")
    .field("Manageable", yn(target.manageable))
    .field("Kickable", yn(target.kickable))
    .field("Bannable", yn(target.bannable));

  await sendReport(message, report, ctx.secrets, client.token);
};

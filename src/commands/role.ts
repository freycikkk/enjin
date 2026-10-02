import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { parseSnowflake } from "../utils/snowflake.js";
import { date, flags, hex, num, str, yn } from "../utils/format.js";

import type { Client, Role } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `role <id>`
 *
 * Shows a role. Discord has no "get role by id" endpoint, so the role is
 * searched for in the guild the command was used in first, then in every guild
 * this shard has cached. Accepts raw ids and `<@&id>` mentions.
 */
export const role = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  const id = parseSnowflake(input);
  if (!id) {
    await message.reply("[ Enjin ] Missing role id.");
    return;
  }

  const target = findRole(client, ctx, id);
  if (!target) {
    await message.reply("[ Enjin ] Role not found in any cached guild. (If you use sharding, it may be on another shard.)");
    return;
  }

  const guild = target.guild;
  const me = guild.members.me;

  // Where the bot's top role sits compared to this one decides if the bot can edit it.
  const botTop = me?.roles.highest;
  let relation = "N/A";
  if (botTop) {
    if (botTop.id === target.id) relation = "This is the bot's top role";
    else if (botTop.comparePositionTo(target) > 0) relation = "Bot role is higher";
    else relation = "Bot role is lower";
  }

  const report = new InfoReport(`Role: ${target.name}`)
    .section("General")
    .field("Name", target.name)
    .field("ID", target.id)
    .field("Guild", `${guild.name} (${guild.id})`)
    .field("Created", date(target.createdAt))
    .field("Mention", `<@&${target.id}>`)
    .field("Is @everyone", yn(target.id === guild.id))

    .section("Appearance")
    .field("Colour", hex(target.color))
    .field("Icon", str(target.iconURL({ size: 256 })))
    .field("Unicode Emoji", str(target.unicodeEmoji))
    .field("Displayed Separately", yn(target.hoist))

    .section("Position")
    .field("Position", target.position)
    .field("Raw Position", target.rawPosition)
    .field("Total Roles In Guild", guild.roles.cache.size)

    .section("Behaviour")
    .field("Mentionable", yn(target.mentionable))
    .field("Managed (bot/integration)", yn(target.managed))
    .field("Editable By Bot", yn(target.editable))
    .field("Bot Comparison", relation)
    .field("Members With Role (cached)", `${num(target.members.size)} of ${num(guild.memberCount)} total`)

    .section("Tags")
    .field("Bot ID", str(target.tags?.botId))
    .field("Integration ID", str(target.tags?.integrationId))
    .field("Server Booster Role", yn(target.tags?.premiumSubscriberRole === true))

    .section("Permissions")
    .field("Administrator", yn(target.permissions.has("Administrator")))
    .field("Count", target.permissions.toArray().length)
    .field("List", flags(target.permissions.toArray(), 60));

  await sendReport(message, report, ctx.secrets, client.token);
};

/** Looks in the current guild first (cheap and most likely), then everywhere. */
function findRole(client: Client, ctx: Context, id: string): Role | undefined {
  const local = ctx.message.guild?.roles.cache.get(id);
  if (local) return local;

  for (const guild of client.guilds.cache.values()) {
    const found = guild.roles.cache.get(id);
    if (found) return found;
  }

  return undefined;
}

import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { date, flags, hex, str, yn } from "../utils/format.js";
import { parseSnowflake, snowflakeTime } from "../utils/snowflake.js";

import type { Client, User } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `user [id]`
 *
 * Shows a Discord user fetched straight from the API. With no id it shows
 * whoever ran the command. Accepts raw ids and `<@id>` mentions.
 *
 * This is account level info only. For guild specific info (roles, join date,
 * nickname...) use the `member` command.
 */
export const user = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  const id = parseSnowflake(input) ?? message.author.id;

  let target: User;
  try {
    // force: true skips the cache so banner and accent colour are included.
    target = await client.users.fetch(id, { force: true });
  } catch {
    await message.reply(`[ Enjin ] User not found.\nID created: ${date(snowflakeTime(id))}`);
    return;
  }

  const report = new InfoReport(`User: ${target.username}`)
    .section("General")
    .field("Username", target.username)
    .field("Display Name", str(target.globalName))
    .field("Discriminator", target.discriminator === "0" ? "None (new username system)" : target.discriminator)
    .field("ID", target.id)
    .field("Created", date(target.createdAt))
    .field("Bot", yn(target.bot))
    .field("System", yn(target.system))
    .field("Mention", `<@${target.id}>`)
    .field("Is This Bot", yn(client.user?.id === target.id))

    .section("Appearance")
    .field("Avatar", target.displayAvatarURL({ size: 1024 }))
    .field("Custom Avatar", yn(target.avatar !== null))
    .field("Banner", str(target.bannerURL({ size: 1024 })))
    .field("Accent Colour", hex(target.accentColor))

    .section("Badges")
    .field("Public Flags", flags(target.flags?.toArray() ?? []));

  await sendReport(message, report, ctx.secrets, client.token);
};

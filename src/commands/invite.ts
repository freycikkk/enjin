import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { read, readNum, readStr } from "../utils/access.js";
import { clip, date, enumName, flags, num, str, yn } from "../utils/format.js";
import { ChannelType, GuildNSFWLevel, GuildVerificationLevel, InviteTargetType } from "discord.js";

import type { Client, Invite } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `invite <code | url>`
 *
 * Looks up an invite without joining the guild. Works with a bare code
 * (`abc123`) or any invite link (`discord.gg/abc123`,
 * `https://discord.com/invite/abc123`).
 *
 * Discord only returns what is public for an invite: the guild's public info,
 * the channel it points to, who made it, and approximate member counts.
 */
export const invite = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  const code = input?.trim();
  if (!code) {
    await message.reply("[ Enjin ] Missing invite code or link.");
    return;
  }

  let data: Invite;
  try {
    // discord.js extracts the code from links for us.
    data = await client.fetchInvite(code);
  } catch {
    await message.reply("[ Enjin ] Invalid or expired invite.");
    return;
  }

  const guild = data.guild;
  const channel = data.channel;
  const channelType = readNum(channel, "type");
  const event = data.guildScheduledEvent;

  const report = new InfoReport(`Invite: ${data.code}`)
    .section("Invite")
    .field("Code", data.code)
    .field("URL", data.url)
    .field("Created", date(data.createdAt))
    .field("Expires", data.expiresAt ? date(data.expiresAt) : "Never / unknown")
    .field("Uses", data.uses === null ? "N/A" : `${num(data.uses)} / ${data.maxUses ? num(data.maxUses) : "Unlimited"}`)
    .field("Max Age", data.maxAge === null ? "N/A" : data.maxAge === 0 ? "Never expires" : `${data.maxAge}s`)
    .field("Temporary Membership", yn(data.temporary))
    .field("Approx Members", num(data.memberCount))
    .field("Approx Online", num(data.presenceCount))

    .section("Guild")
    .field("Name", str(guild?.name))
    .field("ID", str(guild?.id))
    .field("Created", guild ? date(guild.createdAt) : "N/A")
    .field("Description", clip(guild?.description))
    .field("Vanity URL", guild?.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : "None")
    .field("Verification", guild ? enumName(GuildVerificationLevel, guild.verificationLevel) : "N/A")
    .field("NSFW Level", guild ? enumName(GuildNSFWLevel, guild.nsfwLevel) : "N/A")
    .field("Boosts", num(guild?.premiumSubscriptionCount))
    .field("Icon", str(guild?.iconURL({ size: 1024 })))
    .field("Banner", str(guild?.bannerURL({ size: 1024 })))
    .field("Splash", str(guild?.splashURL({ size: 1024 })))
    .field("Features", flags(guild?.features ?? []))
    .field("Bot Is Member", yn(guild ? client.guilds.cache.has(guild.id) : null))

    .section("Channel")
    .field("Name", str(readStr(channel, "name")))
    .field("ID", str(readStr(channel, "id") ?? data.channelId))
    .field("Type", channelType !== undefined ? enumName(ChannelType, channelType) : "N/A")

    .section("Inviter")
    .field("User", data.inviter ? `${data.inviter.username} (${data.inviter.id})` : "Unknown")
    .field("Bot", yn(data.inviter?.bot));

  // Voice channel invites can point at a user's stream or an embedded activity.
  if (data.targetType) {
    const app = read(data, "targetApplication");
    report
      .section("Target")
      .field("Type", enumName(InviteTargetType, data.targetType))
      .field("User", data.targetUser ? `${data.targetUser.username} (${data.targetUser.id})` : "None")
      .field("Application", str(readStr(app, "name")));
  }

  // Invite attached to a scheduled event.
  if (event) {
    report
      .section("Scheduled Event")
      .field("Name", event.name)
      .field("ID", event.id)
      .field("Starts", date(event.scheduledStartAt))
      .field("Ends", event.scheduledEndAt ? date(event.scheduledEndAt) : "Not set")
      .field("Interested Users", num(event.userCount))
      .field("Location", str(event.entityMetadata?.location ?? event.channelId))
      .field("Description", clip(event.description));
  }

  await sendReport(message, report, ctx.secrets, client.token);
};

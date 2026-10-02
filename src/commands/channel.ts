import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { parseSnowflake } from "../utils/snowflake.js";
import { cacheSize, read, readBool, readNum, readStr } from "../utils/access.js";
import { ChannelType, ForumLayoutType, SortOrderType, VideoQualityMode } from "discord.js";
import { clip, date, duration, enumName, flags, list, num, str, yn } from "../utils/format.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `channel [id]`
 *
 * Detailed info about any channel: text, voice, category, thread, forum, DM...
 * With no id it uses the channel the command was typed in. Also accepts
 * `<#id>` mentions and channel / message links.
 *
 * Which fields show up depends on the channel type, e.g. only voice channels
 * have a bitrate and only threads have an archive state.
 */
export const channel = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  // In a link like /channels/GUILD/CHANNEL/MESSAGE the channel is the 2nd id.
  const isLink = input?.includes("/channels/");
  const id = parseSnowflake(input, isLink ? 1 : 0) ?? message.channelId;

  let target = client.channels.cache.get(id);

  if (!target) {
    try {
      target = (await client.channels.fetch(id)) ?? undefined;
    } catch {
      target = undefined;
    }
  }

  if (!target) {
    await message.reply("[ Enjin ] Channel not found. The bot can't see it or the id is wrong.");
    return;
  }

  const type = enumName(ChannelType, target.type);
  const guildRef = read(target, "guild");

  const report = new InfoReport(`Channel: ${str(readStr(target, "name") ?? target.id)}`)
    .section("General")
    .field("Name", str(readStr(target, "name")))
    .field("ID", target.id)
    .field("Type", `${type} (${target.type})`)
    .field("Created", date(target.createdAt))
    .field("URL", target.url)
    .field("Guild", guildRef ? `${str(readStr(guildRef, "name"))} (${str(readStr(guildRef, "id"))})` : "None (DM)")
    .field("Parent", str(readStr(target, "parentId")))
    .field("Position", str(readNum(target, "position")))
    .field("Flags", flags(channelFlags(target)));

  // Text-ish settings
  const topic = readStr(target, "topic");
  if (topic !== undefined || readBool(target, "nsfw") !== undefined) {
    report
      .section("Text Settings")
      .field("Topic", clip(topic))
      .field("NSFW", yn(readBool(target, "nsfw")))
      .field("Slowmode", slowmode(readNum(target, "rateLimitPerUser")))
      .field("Default Auto-Archive", archiveMinutes(readNum(target, "defaultAutoArchiveDuration")))
      .field("Last Message ID", str(readStr(target, "lastMessageId")))
      .field("Last Pin", date(readNum(target, "lastPinTimestamp")));
  }

  // Voice / stage settings
  if (readNum(target, "bitrate") !== undefined) {
    const quality = readNum(target, "videoQualityMode");
    report
      .section("Voice Settings")
      .field("Bitrate", `${Math.round((readNum(target, "bitrate") ?? 0) / 1000)} kbps`)
      .field("User Limit", readNum(target, "userLimit") ? num(readNum(target, "userLimit")) : "Unlimited")
      .field("Region", str(readStr(target, "rtcRegion") ?? "Automatic"))
      .field("Video Quality", quality !== undefined ? enumName(VideoQualityMode, quality) : "N/A")
      .field("Members Inside", num(cacheSize(target, "members")));
  }

  // Threads
  if ("archived" in target) {
    report
      .section("Thread")
      .field("Archived", yn(readBool(target, "archived")))
      .field("Locked", yn(readBool(target, "locked")))
      .field("Owner ID", str(readStr(target, "ownerId")))
      .field("Auto-Archive", archiveMinutes(readNum(target, "autoArchiveDuration")))
      .field("Archived At", date(readNum(target, "archiveTimestamp")))
      .field("Messages", num(readNum(target, "messageCount")))
      .field("Total Sent", num(readNum(target, "totalMessageSent")))
      .field("Members", num(readNum(target, "memberCount")))
      .field("Invitable", yn(readBool(target, "invitable")))
      .field("Applied Tags", list((read(target, "appliedTags") as string[] | undefined) ?? []));
  }

  // Forum / media channels
  const tags = read(target, "availableTags");
  if (Array.isArray(tags)) {
    const layout = readNum(target, "defaultForumLayout");
    const sort = readNum(target, "defaultSortOrder");
    const reaction = read(target, "defaultReactionEmoji");

    report
      .section("Forum")
      .field("Tags", list(tags.map((t) => str(readStr(t, "name")))))
      .field("Default Layout", layout !== undefined ? enumName(ForumLayoutType, layout) : "N/A")
      .field("Default Sort", sort !== undefined ? enumName(SortOrderType, sort) : "N/A")
      .field("Default Reaction", reaction ? str(readStr(reaction, "name") ?? readStr(reaction, "id")) : "None")
      .field("Thread Slowmode", slowmode(readNum(target, "defaultThreadRateLimitPerUser")));
  }

  // DMs
  const recipient = read(target, "recipient");
  if (recipient) {
    report
      .section("Direct Message")
      .field("Recipient", `${str(readStr(recipient, "username"))} (${str(readStr(recipient, "id"))})`);
  }

  // Caches and permissions (only meaningful for channels we have cached data for)
  report
    .section("Cache")
    .field("Messages Cached", num(cacheSize(target, "messages")))
    .field("Threads Cached", num(cacheSize(target, "threads")))
    .field("Permission Overwrites", num(cacheSize(target, "permissionOverwrites")));

  report.section("Bot Permissions").field("In This Channel", botPermissions(client, target));

  await sendReport(message, report, ctx.secrets, client.token);
};

/** Channel flag names (pinned thread, require tag...) if the channel has any. */
function channelFlags(target: unknown): string[] {
  const bitfield = read(target, "flags");
  const toArray = read(bitfield, "toArray");
  return typeof toArray === "function" ? (toArray.call(bitfield) as string[]) : [];
}

/** 0 -> "Off", 90 -> "1m 30s" */
function slowmode(seconds: number | undefined): string {
  if (seconds === undefined) return "N/A";
  return seconds === 0 ? "Off" : duration(seconds * 1000);
}

/** Thread auto-archive values are minutes: 60, 1440, 4320, 10080. */
function archiveMinutes(minutes: number | undefined): string {
  if (minutes === undefined) return "N/A";
  return duration(minutes * 60_000);
}

/** What the bot itself is allowed to do in this channel. */
function botPermissions(client: Client, target: unknown): string {
  const permissionsFor = read(target, "permissionsFor");
  if (typeof permissionsFor !== "function" || !client.user) return "N/A";

  try {
    const perms = permissionsFor.call(target, client.user) as { toArray?: () => string[] } | null;
    const names = perms?.toArray?.() ?? [];
    return names.length ? `${names.length} (${flags(names, 40)})` : "None / not visible";
  } catch {
    return "N/A";
  }
}

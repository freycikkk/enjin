import { list, num } from "../utils/format.js";
import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";
import type { EngineClient } from "../interface/EnjinClient.js";

/** Every number the cache report shows. One of these exists per shard / cluster. */
interface CacheCounts {
  guilds: number;
  users: number;
  channels: number;
  emojis: number;
  threads: number;
  dmChannels: number;
  commands: number;
  voiceAdapters: number;
  members: number;
  roles: number;
  stickers: number;
  presences: number;
  voiceStates: number;
  invites: number;
  bans: number;
  scheduledEvents: number;
  stageInstances: number;
  autoModRules: number;
  messages: number;
  reactions: number;
}

/**
 * Walks the whole client cache and counts it.
 *
 * IMPORTANT: this must stay 100% self contained (no imports, no outside
 * helpers). When the bot is sharded it is converted to text and sent to the
 * other shards through `broadcastEval`, where nothing from this file exists.
 */
const collectCounts = (client: Client): CacheCounts => {
  const counts = {
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    channels: client.channels.cache.size,
    emojis: client.emojis.cache.size,
    threads: 0,
    dmChannels: 0,
    commands: client.application?.commands.cache.size ?? 0,
    voiceAdapters: client.voice.adapters.size,
    members: 0,
    roles: 0,
    stickers: 0,
    presences: 0,
    voiceStates: 0,
    invites: 0,
    bans: 0,
    scheduledEvents: 0,
    stageInstances: 0,
    autoModRules: 0,
    messages: 0,
    reactions: 0,
  };

  // Everything that is stored per guild.
  for (const guild of client.guilds.cache.values()) {
    counts.members += guild.members.cache.size;
    counts.roles += guild.roles.cache.size;
    counts.stickers += guild.stickers.cache.size;
    counts.presences += guild.presences.cache.size;
    counts.voiceStates += guild.voiceStates.cache.size;
    counts.invites += guild.invites.cache.size;
    counts.bans += guild.bans.cache.size;
    counts.scheduledEvents += guild.scheduledEvents.cache.size;
    counts.stageInstances += guild.stageInstances.cache.size;
    counts.autoModRules += guild.autoModerationRules.cache.size;
  }

  // Everything that is stored per channel (threads, DMs, messages and their reactions).
  for (const channel of client.channels.cache.values()) {
    if (channel.isThread()) counts.threads++;
    if (channel.isDMBased()) counts.dmChannels++;

    if ("messages" in channel) {
      counts.messages += channel.messages.cache.size;
      for (const msg of channel.messages.cache.values()) counts.reactions += msg.reactions.cache.size;
    }
  }

  return counts;
};

/** Adds up a list of per-shard counts into one total. */
function sum(all: CacheCounts[]): CacheCounts {
  const total = { ...all[0] } as CacheCounts;
  for (const key of Object.keys(total) as (keyof CacheCounts)[]) {
    total[key] = all.reduce((acc, item) => acc + item[key], 0);
  }
  return total;
}

/** Adds the count rows to a report section. Reused for the local and the global view. */
function addCounts(report: InfoReport, c: CacheCounts) {
  const total = Object.values(c).reduce((a, b) => a + b, 0);

  report
    .section("Client Cache")
    .field("Guilds", num(c.guilds))
    .field("Users", num(c.users))
    .field("Channels", num(c.channels))
    .field("  of which threads", num(c.threads))
    .field("  of which DMs", num(c.dmChannels))
    .field("Emojis", num(c.emojis))
    .field("Application Commands", num(c.commands))
    .field("Voice Adapters", num(c.voiceAdapters))

    .section("Guild Caches (all guilds combined)")
    .field("Members", num(c.members))
    .field("Roles", num(c.roles))
    .field("Stickers", num(c.stickers))
    .field("Presences", num(c.presences))
    .field("Voice States", num(c.voiceStates))
    .field("Invites", num(c.invites))
    .field("Bans", num(c.bans))
    .field("Scheduled Events", num(c.scheduledEvents))
    .field("Stage Instances", num(c.stageInstances))
    .field("AutoMod Rules", num(c.autoModRules))

    .section("Message Caches")
    .field("Messages", num(c.messages))
    .field("Reactions", num(c.reactions))

    .section("Summary")
    .field("Total Cached Objects", num(total))
    .field("Avg Members / Guild", c.guilds ? (c.members / c.guilds).toFixed(1) : "N/A")
    .field("Avg Messages / Channel", c.channels ? (c.messages / c.channels).toFixed(1) : "N/A");
}

/**
 * `cache`
 *
 * Counts everything the client has cached: guilds, users, channels, members,
 * roles, messages, reactions and more. Useful to see where memory goes and
 * whether your sweepers / cache limits are doing their job.
 *
 * When the bot is sharded you also get the combined total of all shards or
 * clusters plus a small row for each one.
 */
export const cache = async (client: Client, ctx: Context) => {
  const { message } = ctx;
  const meta = (client as EngineClient).__Enjin;

  const local = collectCounts(client);

  const report = new InfoReport("Cache Report");
  addCounts(report, local);

  // The five guilds holding the most cached members: the usual memory hogs.
  const biggest = [...client.guilds.cache.values()]
    .sort((a, b) => b.members.cache.size - a.members.cache.size)
    .slice(0, 5)
    .map((g) => `${g.name} (${num(g.members.cache.size)})`);

  report
    .section("Biggest Member Caches")
    .field("Top 5", list(biggest, 5))

    .section("Cache Settings")
    .field("Sweepers Configured", list(Object.keys(client.options.sweepers ?? {})));

  // Combine every shard / cluster when sharding is in use.
  try {
    let all: CacheCounts[] | null = null;

    if (meta?.cluster) all = await meta.cluster.broadcastEval(collectCounts);
    else if (client.shard) all = await client.shard.broadcastEval(collectCounts);

    if (all && all.length > 1) {
      const unit = meta?.shardType === "hybrid" ? "Cluster" : "Shard";

      report.section(`All ${unit}s Combined`);
      const total = sum(all);
      report
        .field("Guilds", num(total.guilds))
        .field("Users", num(total.users))
        .field("Channels", num(total.channels))
        .field("Members", num(total.members))
        .field("Messages", num(total.messages))
        .field("Reactions", num(total.reactions));

      report.section(`Per ${unit}`);
      all.forEach((c, i) => {
        report.field(
          `${unit} #${i}`,
          `${num(c.guilds)} guilds | ${num(c.users)} users | ${num(c.members)} members | ${num(c.messages)} msgs`
        );
      });
    }
  } catch (err: unknown) {
    report.section("All Shards Combined").field("Error", err instanceof Error ? err.message : String(err));
  }

  await sendReport(message, report, ctx.secrets, client.token);
};

/** @format */

import { TextReport } from '../class/TextReport.js';
import pkg from '../../package.json' with { type: 'json' };
import { DateFormatting } from '../utils/DateFormatting.js';
import { GatewayIntentBits, IntentsBitField, version as djsVersion } from 'discord.js';

import type { Client } from 'discord.js';
import type { Context } from '../interface/Context.js';
import type { EngineClient } from '../interface/EnjinClient.js';

const INTENTS = [GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent];

export const Default = async (client: Client, ctx: Context) => {
  const { message } = ctx;
  const { version } = pkg;

  const engineClient = client as EngineClient;
  const meta = engineClient.__Enjin;

  const intents = new IntentsBitField(client.options.intents);

  const now = Date.now();
  const processStart = now - process.uptime() * 1000;
  const botReady = client.readyAt?.getTime() ?? now;

  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();

  const rss = (mem.rss / 1024 / 1024).toFixed(1);
  const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
  const heapPct = ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1);

  const cpuUser = (cpu.user / 1000).toFixed(1);
  const cpuSys = (cpu.system / 1000).toFixed(1);

  const shardTypeLabel = { hybrid: 'Hybrid', djs: 'DJS', none: 'None' } as const;
  const shardType = shardTypeLabel[meta?.shardType ?? 'none'];
  const shardCount =
    meta?.shardType === 'none' ? '1 (Single Shard By Default)' : String(client.options.shardCount ?? 1);

  let globalGuilds: number | null = null;
  let globalUsers: number | null = null;

  try {
    if (meta?.cluster) {
      const results = await meta.cluster.broadcastEval((c) => ({
        guilds: c.guilds.cache.size,
        users: c.users.cache.size
      }));

      globalGuilds = results.reduce((a, b) => a + b.guilds, 0);
      globalUsers = results.reduce((a, b) => a + b.users, 0);
    } else if (client.shard) {
      const results = await client.shard.broadcastEval((c) => ({
        guilds: c.guilds.cache.size,
        users: c.users.cache.size
      }));

      globalGuilds = results.reduce((a, b) => a + b.guilds, 0);
      globalUsers = results.reduce((a, b) => a + b.users, 0);
    }
  } catch (err: unknown) {
    console.log(err);
  }

  const intentInfo = INTENTS.map((i) => `${GatewayIntentBits[i]}:${intents.has(i) ? ' Enabled' : ' Disabled'}`).join(
    ' | '
  );

  const report = new TextReport()
    .line(`Enjin v${version}`)
    .line(`Node ${process.version} • discord.js ${djsVersion}`)
    .line(`OS ${process.platform} • PID ${process.pid} • PPID ${process.ppid}`)
    .blank()

    .line(`Uptime: ${DateFormatting.relative(processStart)}`)
    .line(`Ready: ${DateFormatting.relative(botReady)}`)
    .line(`WS Ping: ${client.ws.ping} ms`)
    .blank()

    .line(`Memory: ${rss} MB RSS | Heap ${heapUsed}/${heapTotal} MB (${heapPct}%)`)
    .line(`CPU: ${cpuUser} ms user | ${cpuSys} ms sys`)
    .blank()

    .line(`Sharding Type: ${shardType}`)
    .line(`Shard Count: ${shardCount}`)
    .blank()

    .line(
      globalGuilds !== null
        ? `Guilds: ${globalGuilds} (global cache)`
        : `Guilds: ${client.guilds.cache.size} (local cache)`
    )
    .line(
      globalUsers !== null ? `Users: ${globalUsers} (global cache)` : `Users: ${client.users.cache.size} (local cache)`
    )
    .blank()

    .line(`Intents: ${intentInfo}`);

  await message.reply(report.render());
};

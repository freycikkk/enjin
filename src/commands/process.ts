import os from "node:os";
import { Status } from "discord.js";
import { read } from "../utils/access.js";
import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { bytes, clip, date, duration, enumName, list, num, str, yn } from "../utils/format.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";
import type { EngineClient } from "../interface/EnjinClient.js";

/** Newer process APIs that older @types/node versions may not declare. */
type ModernProcess = NodeJS.Process & {
  getActiveResourcesInfo?: () => string[];
  features?: Record<string, unknown>;
};

/** Signals / events worth checking for listeners, because they decide how the bot shuts down or crashes. */
const WATCHED_EVENTS = ["uncaughtException", "unhandledRejection", "warning", "exit", "beforeExit", "SIGINT", "SIGTERM"];

/** Nanoseconds -> "1.23 ms" */
const ms = (ns: number) => `${(ns / 1e6).toFixed(2)} ms`;

/**
 * `process`
 *
 * Everything about the running Node process: identity, runtime versions,
 * timing, CPU, event loop health, open handles, listeners and how it was started.
 *
 * Environment variables are NOT printed (they hold secrets). Only the count
 * and a couple of harmless ones are shown.
 */
export const processInfo = async (client: Client, ctx: Context) => {
  const { message } = ctx;
  const modern = process as ModernProcess;
  const meta = (client as EngineClient).__Enjin;

  // Watch the event loop for a quarter of a second to see how responsive it is.
  const delay = monitorEventLoopDelay({ resolution: 10 });
  const eluStart = performance.eventLoopUtilization();
  delay.enable();
  await new Promise((resolve) => setTimeout(resolve, 250));
  delay.disable();
  const elu = performance.eventLoopUtilization(eluStart);

  const cpu = process.cpuUsage();
  const uptimeMs = process.uptime() * 1000;
  const cpuTotalMs = (cpu.user + cpu.system) / 1000;

  // Count what is keeping the process alive (timers, sockets, file handles...).
  const resources = modern.getActiveResourcesInfo?.() ?? [];
  const resourceCounts = new Map<string, number>();
  for (const name of resources) resourceCounts.set(name, (resourceCounts.get(name) ?? 0) + 1);

  // os.userInfo() throws on some systems (e.g. user without a passwd entry).
  let userInfo: ReturnType<typeof os.userInfo> | null = null;
  try {
    userInfo = os.userInfo();
  } catch {
    userInfo = null;
  }

  const enabledFeatures = Object.entries(modern.features ?? {})
    .filter(([, value]) => value === true)
    .map(([key]) => key);

  const report = new InfoReport(`Process Report (PID ${process.pid})`)
    .section("Identity")
    .field("PID", process.pid)
    .field("Parent PID", process.ppid)
    .field("Title", process.title)
    .field("Started", date(Date.now() - uptimeMs))
    .field("Uptime", duration(uptimeMs))
    .field("Exit Code", str(process.exitCode))
    .field("IPC Channel", yn(typeof process.send === "function"))
    .field("Running As", userInfo ? `${userInfo.username} (uid ${userInfo.uid}, gid ${userInfo.gid})` : "Unknown")

    .section("Runtime")
    .field("Node", process.version)
    .field("V8", process.versions.v8)
    .field("libuv", process.versions.uv)
    .field("OpenSSL", str(process.versions.openssl))
    .field("Module ABI", str(process.versions.modules))
    .field("Release", `${process.release.name}${process.release.lts ? ` (LTS ${process.release.lts})` : ""}`)
    .field("Features On", list(enabledFeatures))
    .field("Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)
    .field("Locale", Intl.DateTimeFormat().resolvedOptions().locale)

    .section("Platform")
    .field("OS", `${os.type()} ${os.release()}`)
    .field("Platform / Arch", `${process.platform} / ${process.arch}`)
    .field("CPU Model", str(os.cpus()[0]?.model))
    .field("CPU Cores", os.cpus().length)
    .field("Machine Uptime", duration(os.uptime() * 1000))
    .field("TTY Attached", yn(Boolean(process.stdout.isTTY)))

    .section("CPU Usage")
    .field("User Time", `${(cpu.user / 1000).toFixed(1)} ms`)
    .field("System Time", `${(cpu.system / 1000).toFixed(1)} ms`)
    .field("Average Load", `${((cpuTotalMs / uptimeMs) * 100).toFixed(2)}% of one core since start`)

    .section("Event Loop (250ms sample)")
    .field("Utilization", `${(elu.utilization * 100).toFixed(1)}%`)
    .field("Delay Min / Mean", `${delay.min > 1e15 ? "N/A" : ms(delay.min)} / ${ms(delay.mean)}`)
    .field("Delay P50 / P99", `${ms(delay.percentile(50))} / ${ms(delay.percentile(99))}`)
    .field("Delay Max", ms(delay.max))

    .section("Active Resources")
    .field("Total", resources.length)
    .field("Breakdown", list([...resourceCounts.entries()].map(([name, count]) => `${name} x${count}`), 20))

    .section("Event Listeners")
    .field("Counts", WATCHED_EVENTS.map((name) => `${name}: ${process.listenerCount(name)}`).join(" | "))

    .section("Launch")
    .field("Executable", process.execPath)
    .field("Script", str(process.argv[1]))
    .field("Arguments", clip(process.argv.slice(2).join(" ")))
    .field("Node Flags", list(process.execArgv))
    .field("Working Dir", process.cwd())
    .field("Env Variables", `${num(Object.keys(process.env).length)} set`)
    .field("NODE_ENV", str(process.env.NODE_ENV))
    .field("Debug Port", process.debugPort)

    .section("Discord Client")
    .field("Sharding", meta?.shardType ?? "none")
    .field("Shard IDs", client.shard ? client.shard.ids.join(", ") : "N/A")
    .field("Cluster ID", str(read(meta?.cluster, "id")))
    .field("Ready", client.isReady() ? date(client.readyAt) : "Not ready")
    .field("WS Ping", `${client.ws.ping} ms`)
    .field("WS Status", enumName(Status, client.ws.status))
    .field("WS Shards Held", client.ws.shards.size)
    .field("Process Memory (RSS)", bytes(process.memoryUsage.rss()));

  await sendReport(message, report, ctx.secrets, client.token);
};

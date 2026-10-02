import WebSocket from "ws";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `rtt`
 * Measures the real round-trip time to Discord's gateway by opening a fresh
 * connection 5 times and timing how long the first message takes.
 * This is more honest than `client.ws.ping`, which is only the heartbeat latency.
 */
export const rtt = async (client: Client, ctx: Context) => {
  const { message } = ctx;

  let output = "[ Enjin ] Calculating round-trip time...\n";
  const statusMsg = await message.reply(output);

  // Only successful readings go here, failed ones are skipped in the average.
  const latencies: number[] = [];

  for (let i = 0; i <= 4; i++) {
    const latency = await measureGatewayRTT();

    if (latency !== null) {
      latencies.push(latency);
      output += `\nReading ${i + 1}: ${latency}ms`;
    } else {
      output += `\nReading ${i + 1}: Failed`;
    }
  }

  if (!latencies.length) {
    await statusMsg.edit(output + "\n\nAll readings failed.");
    return;
  }

  // Average and standard deviation (how much the readings jump around).
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const stdDev = Math.sqrt(latencies.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / latencies.length);

  output += `\n\nAverage Gateway RTT: ${avg.toFixed(2)}ms ± ${stdDev.toFixed(2)}ms`;
  output += `\nClient WS Ping: ${client.ws.ping}ms`;

  await statusMsg.edit(output);
};

/**
 * Opens a websocket to the gateway and resolves with the ms until Discord
 * sends its first message (the Hello). Resolves null on error or after 5 seconds.
 */
function measureGatewayRTT(): Promise<number | null> {
  return new Promise((resolve) => {
    const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
    const start = Date.now();

    const timeout = setTimeout(() => {
      ws.terminate();
      resolve(null);
    }, 5_000);

    ws.once("message", () => {
      clearTimeout(timeout);
      const end = Date.now();
      ws.close();
      resolve(end - start);
    });

    ws.once("error", () => {
      clearTimeout(timeout);
      ws.terminate();
      resolve(null);
    });
  });
}

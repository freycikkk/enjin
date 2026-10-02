import { ShardClientUtil } from "discord.js";
import { ClusterClient } from "discord-hybrid-sharding";

import type { Client } from "discord.js";

/**
 * Finds out how the bot is being sharded.
 *   hybrid -> discord-hybrid-sharding (a ClusterClient is attached to the client)
 *   djs    -> discord.js' own ShardingManager (`client.shard` exists)
 *   none   -> a plain single process bot
 */
export function detectShard(client: Client): {
  shardType: "hybrid" | "djs" | "none";
  cluster?: ClusterClient<Client>;
} {
  // discord-hybrid-sharding normally puts the cluster on `client.cluster`.
  const direct = (client as unknown as { cluster?: unknown }).cluster;
  if (direct instanceof ClusterClient) return { shardType: "hybrid", cluster: direct };

  // In case it isn't on `client.cluster`, look through every property of the client for it.
  for (const value of Object.values(client)) {
    if (value instanceof ClusterClient) return { shardType: "hybrid", cluster: value };
  }

  // Not hybrid, but discord.js has a shard util attached -> native ShardingManager.
  if (client.shard instanceof ShardClientUtil) return { shardType: "djs" };
  return { shardType: "none" };
}

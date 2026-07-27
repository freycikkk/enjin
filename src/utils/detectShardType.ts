/** @format */

import { ShardClientUtil } from 'discord.js';
import { ClusterClient } from 'discord-hybrid-sharding';

import type { Client } from 'discord.js';

export function detectShard(client: Client): {
  shardType: 'hybrid' | 'djs' | 'none';
  cluster?: ClusterClient<Client>;
} {
  const direct = (client as unknown as { cluster?: unknown }).cluster;
  if (direct instanceof ClusterClient) return { shardType: 'hybrid', cluster: direct };

  for (const value of Object.values(client)) {
    if (value instanceof ClusterClient) return { shardType: 'hybrid', cluster: value };
  }

  if (client.shard instanceof ShardClientUtil) return { shardType: 'djs' };
  return { shardType: 'none' };
}

import type { Client } from "discord.js";
import type { ClusterClient } from "discord-hybrid-sharding";

export interface EngineClient extends Client {
  __Enjin?: {
    shardType: "hybrid" | "djs" | "none";
    cluster?: ClusterClient<Client>;
  };
}

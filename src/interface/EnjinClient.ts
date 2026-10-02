import type { Client } from "discord.js";
import type { ClusterClient } from "discord-hybrid-sharding";

/**
 * A discord.js Client with the extra data Enjin attaches to it.
 * `__Enjin` is filled in once, in the Enjin constructor, so commands don't
 * have to detect the sharding setup again on every run.
 */
export interface EngineClient extends Client {
  __Enjin?: {
    /** "hybrid" = discord-hybrid-sharding, "djs" = built in ShardingManager, "none" = one process. */
    shardType: "hybrid" | "djs" | "none";
    /** The cluster client, only present when `shardType` is "hybrid". */
    cluster?: ClusterClient<Client>;
  };
}

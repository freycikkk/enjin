import type { Snowflake } from "discord.js";

/** Options you pass as the second argument of `new Enjin(client, options)`. */
export interface EnjinOptions {
  /** Words that trigger Enjin after the prefix, like `["enjin", "debug"]`. Defaults to `["enjin"]`. */
  aliases?: string[];
  /** Discord user ids allowed to run commands. Required. */
  owners: Snowflake[];
  /** Text every command must start with, e.g. `!`. Defaults to nothing. */
  prefix?: string;
  /** Extra values to hide from every output (api keys, passwords...). The bot token is added for you. */
  secrets?: string[];
  /** Set to false to stop Enjin from reacting after a command. Defaults to true. */
  react?: boolean;
  /** Emoji used for that reaction. Defaults to ✅. */
  reactEmoji?: string;
}

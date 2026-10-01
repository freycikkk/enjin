import type { Snowflake } from "discord.js";

export interface EnjinOptions {
  aliases?: string[];
  owners: Snowflake[];
  prefix?: string;
  secrets?: string[];
  react?: boolean;
  reactEmoji?: string;
}

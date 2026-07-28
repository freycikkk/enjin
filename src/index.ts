import { js } from "./commands/js.js";
import { cat } from "./commands/cat.js";
import { rtt } from "./commands/rtt.js";
import { curl } from "./commands/curl.js";
import { shard } from "./commands/shard.js";
import { shell } from "./commands/shell.js";
import { Client, Events } from "discord.js";
import { Default } from "./commands/default.js";
import { Commands } from "./readonly/Commands.js";
import { detectShard } from "./utils/detectShardType.js";

import type { Message, Snowflake } from "discord.js";
import type { EngineClient } from "./interface/EnjinClient.js";
import type { EnjinOptions } from "./interface/EnjinOptions.js";

class Enjin {
  process: NodeJS.Process[];
  private owners: Snowflake[];

  constructor(
    public client: Client,
    public options: EnjinOptions
  ) {
    if (!(client instanceof Client)) throw new TypeError("[ Enjin ] Client must be an instance of Discord.js Client");
    if (!Array.isArray(options.owners)) throw new TypeError("[ Enjin ] Owners must be an array of Snowflake IDs");
    if (!options.owners) throw new Error("[ Enjin ] Owners not provided.");
    if (!options.secrets || !Array.isArray(options.secrets)) options.secrets = [];
    options.aliases =
      this.options.aliases && this.options.aliases.length > 0 ? [...new Set(this.options.aliases)] : ["eval"];

    const engineClient = client as EngineClient;
    if (!engineClient.__Enjin) engineClient.__Enjin = detectShard(client);

    this.owners = options.owners;
    this.process = [process];
    if (client.isReady()) this.options.secrets?.push(client.token);
    else client.once(Events.ClientReady, (c) => this.options.secrets?.push(c.token));
  }

  public async run(message: Message) {
    if (!message.content) return;

    const prefix = this.options.prefix ?? "";

    if (!message.content.startsWith(prefix)) return;
    if (!this.owners.includes(message.author.id)) return;

    const raw = message.content.slice(prefix.length).trim();

    const commandMatch = raw.match(/^(\S+)\s*/);
    const command = commandMatch?.[1];
    const afterCommand = commandMatch ? raw.slice(commandMatch[0].length) : "";

    const engineMatch = afterCommand.match(/^(\S+)\s*/);
    const engine = engineMatch?.[1];
    const input = engineMatch ? afterCommand.slice(engineMatch[0].length) : afterCommand;

    if (!command || !this.options.aliases?.includes(command)) return;
    const ctx = { message, secrets: this.options.secrets };

    if (!engine) {
      await Default(this.client, ctx);
      return;
    }

    try {
      switch (engine) {
        case "js":
        case "javascript":
          await js(this.client, ctx, input);
          break;

        case "sh":
        case "bash":
        case "ps":
        case "powershell":
        case "shell":
        case "zsh":
        case "exec":
          await shell(this.client, ctx, input);
          break;

        case "curl":
          await curl(this.client, ctx, input);
          break;

        case "cat":
          await cat(this.client, ctx, input);
          break;

        case "shard":
        case "cluster":
          await shard(this.client, ctx, input);
          break;

        case "rtt":
          await rtt(this.client, ctx);
          break;

        case "help":
        default:
          await message.reply(`[ Enjin ] Available Options: ${Commands.map((t) => `\`${t}\``).join(", ")}`);
          break;
      }
    } catch (err: unknown) {
      console.error("[ Enjin ] ", err);
      await message.reply("[ Enjin ] Eval execution failed.");
    }
  }
}

export { Enjin };

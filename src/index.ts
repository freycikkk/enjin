import { js } from "./commands/js.js";
import { cat } from "./commands/cat.js";
import { role } from "./commands/role.js";
import { user } from "./commands/user.js";
import { member } from "./commands/member.js";
import { rtt } from "./commands/rtt.js";
import { cache } from "./commands/cache.js";
import { guild } from "./commands/guild.js";
import { emoji } from "./commands/emoji.js";
import { memory } from "./commands/memory.js";
import { invite } from "./commands/invite.js";
import { channel } from "./commands/channel.js";
import { processInfo } from "./commands/process.js";
import { curl } from "./commands/curl.js";
import { iife } from "./commands/iife.js";
import { shard } from "./commands/shard.js";
import { shell } from "./commands/shell.js";
import { Client, Events } from "discord.js";
import { Default } from "./commands/default.js";
import { Commands } from "./readonly/Commands.js";
import { detectShard } from "./utils/detectShardType.js";

import type { EngineClient } from "./interface/EnjinClient.js";
import type { EnjinOptions } from "./interface/EnjinOptions.js";
import type { Message, OmitPartialGroupDMChannel, PartialMessage, Snowflake } from "discord.js";

/**
 * Enjin is the entry point of the package.
 *
 * You create one instance with your discord.js client, then call `run()` with
 * every message you receive (and optionally with edited messages too).
 * Enjin checks the message is a command, that the author is an owner, and then
 * hands it over to the right engine (js, shell, guild, memory, ...).
 */
class Enjin {
  /** The current Node process, wrapped in an array. */
  process: NodeJS.Process[];
  /** User ids that are allowed to run anything. Everybody else is silently ignored. */
  private owners: Snowflake[];
  /** Whether to react to the message once the command finished fine. */
  private react: boolean;
  /** The emoji used for that reaction. */
  private reactEmoji: string;

  constructor(
    public client: Client,
    public options: EnjinOptions
  ) {
    // Fail early with a clear message if the setup is wrong.
    if (!(client instanceof Client)) throw new TypeError("[ Enjin ] Client must be an instance of Discord.js Client");
    if (!Array.isArray(options.owners)) throw new TypeError("[ Enjin ] Owners must be an array of Snowflake IDs");
    if (!options.owners) throw new Error("[ Enjin ] Owners not provided.");
    if (!options.secrets || !Array.isArray(options.secrets)) options.secrets = [];
    // No aliases given -> fall back to "enjin". Set() removes duplicates.
    options.aliases =
      this.options.aliases && this.options.aliases.length > 0 ? [...new Set(this.options.aliases)] : ["enjin"];

    // Work out once how the bot is sharded and stash it on the client for the commands to use.
    const engineClient = client as EngineClient;
    if (!engineClient.__Enjin) engineClient.__Enjin = detectShard(client);

    this.owners = options.owners;
    this.process = [process];
    this.react = options.react ?? true;
    this.reactEmoji = options.reactEmoji && options.reactEmoji.length > 0 ? options.reactEmoji : "✅";

    // The bot token is always treated as a secret. If the client is not logged in yet, wait until it is.
    if (client.isReady()) this.options.secrets?.push(client.token);
    else client.once(Events.ClientReady, (c) => this.options.secrets?.push(c.token));
  }

  /**
   * Decides what the command input really is.
   * If the owner typed something, that wins. If not and the message is a reply,
   * we use the text of the message being replied to (handy for code blocks / urls).
   */
  private async resolveInput(message: Message, input: string): Promise<string> {
    if (input.trim()) return input;
    if (!message.reference?.messageId) return input;

    try {
      const referenced = await message.fetchReference();
      return referenced.content || input;
    } catch {
      return input;
    }
  }

  /**
   * Call this for every message (and edited message) your bot receives.
   * It does nothing unless the message starts with the prefix, uses one of the
   * aliases and was sent by an owner.
   *
   * @param message    the message that was just sent
   * @param oldMessage the message before the edit, only for `messageUpdate` events
   */
  public async run(
    message: OmitPartialGroupDMChannel<Message>,
    oldMessage?: OmitPartialGroupDMChannel<Message | PartialMessage>
  ) {
    // Nothing to do for empty messages (embeds only, attachments only...).
    if (!message.content) return;
    // On edits, ignore events where the text did not change (embed updates also fire messageUpdate).
    if (oldMessage && !oldMessage.partial && oldMessage.content === message.content) return;

    const prefix = this.options.prefix ?? "";

    if (!message.content.startsWith(prefix)) return;
    // Security check: only owners go past this line.
    if (!this.owners.includes(message.author.id)) return;

    // Message format is: <prefix><alias> <engine> <input>
    // Example: "!enjin js 1 + 1" -> alias "enjin", engine "js", input "1 + 1".
    const raw = message.content.slice(prefix.length).trim();

    const commandMatch = raw.match(/^(\S+)\s*/);
    const command = commandMatch?.[1];
    const afterCommand = commandMatch ? raw.slice(commandMatch[0].length) : "";

    const engineMatch = afterCommand.match(/^(\S+)\s*/);
    const engine = engineMatch?.[1];
    const rawInput = engineMatch ? afterCommand.slice(engineMatch[0].length) : afterCommand;

    // First word must be one of our aliases, otherwise it is somebody else's command.
    if (!command || !this.options.aliases?.includes(command)) return;
    const ctx = { message, secrets: this.options.secrets };

    // Just the alias with nothing after it -> show the status overview.
    if (!engine) {
      await Default(this.client, ctx);
      return;
    }

    const input = await this.resolveInput(message, rawInput);

    // Becomes false for unknown engines so we don't react with a checkmark to them.
    let handled = true;

    try {
      // Each case is one engine. Several names can point to the same one.
      switch (engine) {
        case "js":
        case "javascript":
          await js(this.client, ctx, input);
          break;

        case "iife":
          await iife(this.client, ctx, input);
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

        case "guild":
        case "server":
          await guild(this.client, ctx, input);
          break;

        case "channel":
          await channel(this.client, ctx, input);
          break;

        case "emoji":
          await emoji(this.client, ctx, input);
          break;

        case "invite":
          await invite(this.client, ctx, input);
          break;

        case "user":
          await user(this.client, ctx, input);
          break;

        case "member":
          await member(this.client, ctx, input);
          break;

        case "role":
          await role(this.client, ctx, input);
          break;

        case "memory":
        case "mem":
          await memory(this.client, ctx);
          break;

        case "cache":
          await cache(this.client, ctx);
          break;

        case "process":
        case "proc":
          await processInfo(this.client, ctx);
          break;

        case "help":
          await message.reply(`[ Enjin ] Available Options: ${Commands.map((t) => `\`${t}\``).join(", ")}`);
          break;

        default:
          handled = false;
          await message.reply(`[ Enjin ] Available Options: ${Commands.map((t) => `\`${t}\``).join(", ")}`);
          break;
      }

      // Success reaction. Ignore errors (missing permission, message deleted...).
      if (handled && this.react) {
        await message.react(this.reactEmoji).catch(() => {});
      }
    } catch (err: unknown) {
      // Anything an engine did not catch itself ends up here.
      console.error("[ Enjin ] ", err);
      await message.reply("[ Enjin ] Eval execution failed.");
    }
  }
}

export { Enjin };

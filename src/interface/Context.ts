import type { Message } from "discord.js";

/**
 * What every command receives besides the client: the message that triggered
 * it and the list of secrets to hide from the output.
 */
export interface Context {
  /** The message the owner sent. Replies and reactions go through this. */
  message: Message;
  /** Strings that must never appear in a reply. Replaced by `[secret]` before sending. */
  secrets: string[] | undefined;
}

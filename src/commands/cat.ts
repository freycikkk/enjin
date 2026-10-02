import { sendResult } from "../utils/respond.js";
import path from "node:path";
import { readFile } from "node:fs/promises";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

// Files can only be read from inside the folder the bot was started in.
const BASE_DIR = process.cwd();

/**
 * `cat <path>`
 * Prints a text file. The path is relative to the bot's working directory and
 * cannot leave it. Secrets in the file are hidden in the output.
 */
export const cat = async (client: Client, ctx: Context, filePath: string | undefined) => {
  const { message } = ctx;

  if (!filePath) {
    await message.reply({ content: "[ Enjin ] Missing path." });
    return;
  }

  try {
    // resolve() turns things like "../../etc/passwd" into a real path so we can check where it ends up.
    const resolved = path.resolve(BASE_DIR, filePath);

    if (!resolved.startsWith(BASE_DIR)) {
      await message.reply("[ Enjin ] Access denied.");
      return;
    }

    const content = await readFile(resolved, "utf8");
    await sendResult(message, content, ctx.secrets, client.token, "js");
  } catch (err: unknown) {
    await sendResult(message, err, ctx.secrets, client.token, "js");
  }
};

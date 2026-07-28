import path from "node:path";
import { readFile } from "node:fs/promises";
import { sendResult } from "../utils/respond.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

const BASE_DIR = process.cwd();

export const cat = async (client: Client, ctx: Context, filePath: string | undefined) => {
  const { message } = ctx;

  if (!filePath) {
    await message.reply({ content: "[ Enjin ] Missing path." });
    return;
  }

  try {
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

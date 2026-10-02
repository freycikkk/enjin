import { sendResult } from "../utils/respond.js";
import { CodeBlock } from "../utils/codeBlock.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `js <code>`
 * Runs JavaScript with eval in the context of this file, so `client` and
 * `ctx` are available. Promises are awaited. Code blocks are unwrapped first.
 * Owner-only, never expose this to other users.
 */
export const js = async (client: Client, ctx: Context, rawCode: string | undefined) => {
  const { message } = ctx;

  if (!rawCode) {
    await message.reply({ content: "[ Enjin ] Missing code to execute." });
    return;
  }

  // Accept both plain code and a ```js fenced block.
  const parsed = CodeBlock.parse(rawCode);
  const code = parsed?.content ?? rawCode;

  try {
    let result: unknown = await eval(code);
    if (typeof result === "function") result = result.toString();
    await sendResult(message, result, ctx.secrets, client.token, "js");
  } catch (err: unknown) {
    await sendResult(message, err, ctx.secrets, client.token, "js");
  }
};

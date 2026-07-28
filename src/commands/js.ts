import { sendResult } from "../utils/respond.js";
import { CodeBlock } from "../utils/codeBlock.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

export const js = async (client: Client, ctx: Context, rawCode: string | undefined) => {
  const { message } = ctx;

  if (!rawCode) {
    await message.reply({ content: "[ Enjin ] Missing code to execute." });
    return;
  }

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

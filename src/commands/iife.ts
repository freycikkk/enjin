import { sendResult } from "../utils/respond.js";
import { CodeBlock } from "../utils/codeBlock.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

/**
 * `iife <code>`
 * Like `js`, but the code runs inside its own async function, so you can use
 * `await` and `return` at the top level and your variables don't leak out.
 *
 * It first tries the input as a single expression (so `client.guilds.cache.size`
 * just works). If that isn't valid syntax, it runs it as a list of statements,
 * and then you need an explicit `return` to get a value back.
 */
export const iife = async (client: Client, ctx: Context, rawCode: string | undefined) => {
  const { message } = ctx;

  if (!rawCode) {
    await message.reply({ content: "[ Enjin ] Missing code to execute." });
    return;
  }

  const parsed = CodeBlock.parse(rawCode);
  const code = parsed?.content ?? rawCode;

  try {
    let result: unknown;

    try {
      // Attempt 1: treat the whole input as one expression.
      const asExpression = `(async () => {return (${code});})()`;
      result = await eval(asExpression);
    } catch (err: unknown) {
      // Only a syntax error means "this isn't an expression". Real runtime errors are passed on.
      if (!(err instanceof SyntaxError)) throw err;

      // Attempt 2: run it as statements.
      const asStatements = `(async () => {${code}})()`;
      result = await eval(asStatements);
    }

    // Functions would print as [Function], show their source instead.
    if (typeof result === "function") result = result.toString();
    await sendResult(message, result, ctx.secrets, client.token, "iife");
  } catch (err: unknown) {
    await sendResult(message, err, ctx.secrets, client.token, "iife");
  }
};

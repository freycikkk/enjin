import { Chunking } from "./Chunking.js";
import { sanitize } from "./sanitize.js";
import { Paginator } from "./paginator.js";
import util from "node:util";

import type { Message } from "discord.js";

const INSPECT_OPTIONS = {
  depth: Infinity,
  maxArrayLength: Infinity,
  breakLength: 80,
  compact: false,
} as const;

function stringify(value: unknown): string {
  return typeof value === "string" ? value : util.inspect(value, INSPECT_OPTIONS);
}

export async function sendResult(
  message: Message,
  value: unknown,
  secrets: string[] | undefined,
  token: string | null | undefined,
  lang = "js"
) {
  const sanitized = sanitize(value, secrets, token);
  const pages = Chunking(stringify(sanitized));
  const paginator = new Paginator(message, pages, lang);
  await paginator.init();
}

import util from "node:util";
import { Chunking } from "./Chunking.js";
import { sanitize } from "./sanitize.js";
import { Paginator } from "./paginator.js";

import type { Message } from "discord.js";
import type { InfoReport } from "../class/InfoReport.js";

// Settings for util.inspect: print everything, no depth or array length cutoff.
const INSPECT_OPTIONS = {
  depth: Infinity,
  maxArrayLength: Infinity,
  breakLength: 80,
  compact: false,
} as const;

/** Strings stay as they are, everything else is printed like console.log would. */
function stringify(value: unknown): string {
  return typeof value === "string" ? value : util.inspect(value, INSPECT_OPTIONS);
}

/**
 * Sends any value back to the channel as a paginated code block.
 * The value is converted to text, secrets are removed, and long output is
 * split into pages with Prev / Next buttons.
 *
 * @param lang syntax highlighting language of the code block
 */
export async function sendResult(
  message: Message,
  value: unknown,
  secrets: string[] | undefined,
  token: string | null | undefined,
  lang = "js"
) {
  const sanitized = sanitize(stringify(value), secrets, token);
  const pages = Chunking(sanitized);
  const paginator = new Paginator(message, pages, lang);
  await paginator.init();
}

/**
 * Sends an InfoReport as a paginated code block.
 * Goes through `sendResult` so secrets and the bot token are still scrubbed.
 * "ini" is used as the language because it colours `[Section]` headers nicely.
 */
export async function sendReport(
  message: Message,
  report: InfoReport,
  secrets: string[] | undefined,
  token: string | null | undefined
) {
  await sendResult(message, report.render(), secrets, token, "ini");
}

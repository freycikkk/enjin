/**
 * Every engine name shown by `!enjin help` (and when an unknown engine is typed).
 * Keep this in sync with the `switch` in `Enjin.run()` inside index.ts.
 * Aliases like `sh` or `bash` are left out on purpose, only the main name is listed.
 */
export const Commands = [
  "help",
  "cat",
  "curl",
  "shell",
  "js",
  "iife",
  "rtt",
  "shard",
  "guild",
  "channel",
  "emoji",
  "invite",
  "user",
  "member",
  "role",
  "memory",
  "cache",
  "process",
] as const;

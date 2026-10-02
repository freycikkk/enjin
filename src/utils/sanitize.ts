/**
 * Hides secrets in text before it is sent to Discord.
 * The bot token gets its own label so it's obvious when the token leaked into an output.
 */
export function sanitize(value: string, secrets: string[] | undefined, token?: string | null): string {
  // Empty strings would match everywhere, drop them.
  const list = secrets?.filter(Boolean) ?? [];

  let out = value;
  if (token) out = out.replaceAll(token, "[access token hidden]");
  for (const secret of list) out = out.replaceAll(secret, "[secret]");
  return out;
}

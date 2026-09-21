export function sanitize(value: string, secrets: string[] | undefined, token?: string | null): string {
  const list = secrets?.filter(Boolean) ?? [];

  let out = value;
  if (token) out = out.replaceAll(token, "[access token hidden]");
  for (const secret of list) out = out.replaceAll(secret, "[secret]");
  return out;
}

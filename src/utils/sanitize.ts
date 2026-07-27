/** @format */

export function sanitize(value: unknown, secrets: string[] | undefined, token?: string | null): unknown {
  const list = secrets?.filter(Boolean) ?? [];

  const mask = (str: string): string => {
    let out = str;
    if (token) out = out.replaceAll(token, '[access token hidden]');
    for (const secret of list) out = out.replaceAll(secret, '[secret]');
    return out;
  };

  const walk = (val: unknown): unknown => {
    if (typeof val === 'string') return mask(val);
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === 'object') return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, walk(v)]));
    return val;
  };

  return walk(value);
}

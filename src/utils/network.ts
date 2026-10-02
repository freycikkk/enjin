import { isIP } from "node:net";

/**
 * True when an IP points at the local machine or a private network.
 * Used by `curl` so the bot can't be tricked into calling internal services
 * (SSRF), for example http://localhost or http://192.168.x.x.
 *
 * Covers: 10.x, 127.x, 0.x, 169.254.x (link-local), 172.16-31.x, 192.168.x
 * for IPv4 and ::1, ::, fe80:, fc/fd (unique local) for IPv6.
 */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    const octets = ip.split(".").map(Number);
    const a = octets[0] ?? -1;
    const b = octets[1] ?? -1;
    return (
      a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
    );
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    return (
      lower === "::1"
      || lower === "::"
      || lower.startsWith("fe80:")
      || lower.startsWith("fc")
      || lower.startsWith("fd")
      || lower.startsWith("::ffff:127.")
    );
  }

  return false;
}

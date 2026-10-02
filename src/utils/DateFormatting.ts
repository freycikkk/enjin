import type { TimestampStylesString } from "discord.js";

/** Either a Date or a millisecond timestamp, like `Date.now()`. */
type DateLike = Date | number;

/**
 * Builds Discord timestamp markup (`<t:123456:R>`).
 * Discord shows these in the reader's own timezone and language.
 * They only render in normal message text, NOT inside code blocks.
 */
export class DateFormatting {
  /** Discord wants whole seconds, JS gives milliseconds. */
  private static toUnixSeconds(date: DateLike) {
    const ms = date instanceof Date ? date.getTime() : date;
    return Math.floor(ms / 1000);
  }

  /** `<t:unix>` or `<t:unix:style>` when a style (R, f, D, ...) is given. */
  static format(date: DateLike, style?: TimestampStylesString) {
    const unix = this.toUnixSeconds(date);
    return `<t:${unix}${style ? `:${style}` : ""}>`;
  }

  /** Shortcut for the "3 hours ago" style. */
  static relative(date: DateLike) {
    return this.format(date, "R");
  }
}

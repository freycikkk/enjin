/** @format */

import type { TimestampStylesString } from 'discord.js';

type DateLike = Date | number;

export class DateFormatting {
  private static toUnixSeconds(date: DateLike) {
    const ms = date instanceof Date ? date.getTime() : date;
    return Math.floor(ms / 1000);
  }

  static format(date: DateLike, style?: TimestampStylesString) {
    const unix = this.toUnixSeconds(date);
    return `<t:${unix}${style ? `:${style}` : ''}>`;
  }

  static relative(date: DateLike) {
    return this.format(date, 'R');
  }
}

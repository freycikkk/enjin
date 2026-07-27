/** @format */

import type { Message } from 'discord.js';

export interface Context {
  message: Message;
  secrets: string[] | undefined;
}

/** @format */

import dns from 'node:dns/promises';
import { sendResult } from '../utils/respond.js';
import { isPrivateAddress } from '../utils/network.js';

import type { Client } from 'discord.js';
import type { Context } from '../interface/Context.js';

const MAX_BYTES = 1_000_000;

export const curl = async (client: Client, ctx: Context, input: string | undefined) => {
  const { message } = ctx;

  if (!input) {
    await message.reply({ content: '[ Enjin ] Missing url to curl.' });
    return;
  }

  try {
    const url = new URL(input);

    if (!['http:', 'https:'].includes(url.protocol)) {
      await message.reply('[ Enjin ] Only http/https URLs are allowed.');
      return;
    }

    let address: string;
    try {
      ({ address } = await dns.lookup(url.hostname));
    } catch {
      await message.reply('[ Enjin ] Failed to resolve host.');
      return;
    }

    if (isPrivateAddress(address)) {
      await message.reply('[ Enjin ] Access to private networks is blocked.');
      return;
    }

    const res = await fetch(url.toString());

    if (!res.ok) {
      await message.reply(`[ Enjin ] HTTP ${res.status}: ${res.statusText}`);
      return;
    }

    const text = await res.text();

    if (text.length > MAX_BYTES) {
      await message.reply('[ Enjin ] Response too large.');
      return;
    }

    await sendResult(message, text, ctx.secrets, client.token, 'js');
  } catch (err: unknown) {
    await sendResult(message, err, ctx.secrets, client.token, 'js');
  }
};

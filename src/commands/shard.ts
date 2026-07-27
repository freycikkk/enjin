/** @format */

import util from 'node:util';
import { sendResult } from '../utils/respond.js';
import { CodeBlock } from '../utils/codeBlock.js';

import type { Client } from 'discord.js';
import type { Context } from '../interface/Context.js';
import type { EngineClient } from '../interface/EnjinClient.js';

const INSPECT_OPTIONS = { depth: Infinity, maxArrayLength: Infinity, breakLength: 80, compact: false } as const;

export const shard = async (client: Client, ctx: Context, rawCode: string | undefined) => {
  const { message } = ctx;

  if (!rawCode) {
    await message.reply({ content: '[ Enjin ] Missing code to execute.' });
    return;
  }

  const engineClient = client as EngineClient;
  const meta = engineClient.__Enjin;

  if (!meta || meta.shardType === 'none') {
    await message.reply({ content: '[ Enjin ] Shard manager not found.' });
    return;
  }

  const parsed = CodeBlock.parse(rawCode);
  const code = parsed?.content ?? rawCode;

  try {
    const evalFn = Function('client', `"use strict"; return (async () => { return ${code} })();`) as (
      client: Client<boolean>
    ) => Promise<unknown>;

    let results: unknown[];

    if (meta.shardType === 'hybrid') {
      if (!meta.cluster) throw new Error('[ Enjin ] Cluster manager not ready.');
      results = await meta.cluster.broadcastEval(evalFn);
    } else {
      if (!client.shard) throw new Error('[ Enjin ] Shard manager not ready.');
      results = await client.shard.broadcastEval(evalFn);
    }

    const valid = results.filter((v) => v !== undefined);

    let total: unknown = valid;

    if (valid.length && valid.every((v) => typeof v === 'number')) {
      total = valid.reduce((a, b) => (a as number) + (b as number), 0);
    } else if (valid.length && valid.every((v) => Array.isArray(v))) {
      total = valid.flat();
    }

    const unit = meta.shardType === 'hybrid' ? 'CLUSTER' : 'SHARD';

    const output = [
      '// TOTAL',
      util.inspect(total, INSPECT_OPTIONS),
      '',
      ...results.map((value, index) => `// #${index} ${unit}\n` + util.inspect(value, INSPECT_OPTIONS))
    ].join('\n\n');

    await sendResult(message, output, ctx.secrets, client.token, 'js');
  } catch (err: unknown) {
    await sendResult(message, err, ctx.secrets, client.token, 'js');
  }
};

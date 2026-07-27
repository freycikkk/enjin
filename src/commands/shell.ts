/** @format */

import { spawn } from 'node:child_process';
import { CodeBlock } from '../utils/codeBlock.js';
import { Paginator } from '../utils/paginator.js';

import type { Client } from 'discord.js';
import type { Context } from '../interface/Context.js';

const HARD_TIMEOUT = 60_000;

export const shell = async (_client: Client, ctx: Context, rawCode: string | undefined) => {
  const { message } = ctx;

  if (!rawCode) {
    await message.reply({ content: '[ Enjin ] Missing command.' });
    return;
  }

  const shellPath = process.env.SHELL || (process.platform === 'win32' ? 'powershell' : null);

  if (!shellPath) {
    await message.reply('Sorry, we are not able to find your default shell.\nPlease set `process.env.SHELL`.');
    return;
  }

  const parsed = CodeBlock.parse(rawCode);
  let code = parsed?.content ?? rawCode;

  if (process.platform === 'win32') {
    code = code
      .replace(/\bls\b/g, 'Get-ChildItem')
      .replace(/\bcat\b/g, 'Get-Content')
      .replace(/\bpwd\b/g, 'Get-Location');
  }

  const paginator = new Paginator(message, undefined, 'sh', 1900, () => kill(proc));
  await paginator.init();

  paginator.append(`$ ${code}\n`);

  const proc = spawn(
    shellPath,
    process.platform === 'win32' ? ['-NoProfile', '-NonInteractive', '-Command', code] : ['-c', code],
    { stdio: 'pipe' }
  );

  const timeout = setTimeout(() => {
    kill(proc);
  }, HARD_TIMEOUT);

  proc.stdout.on('data', (d: Buffer) => {
    paginator.append(d.toString());
  });

  proc.stderr.on('data', (d: Buffer) => {
    paginator.append(`[stderr]${d.toString()}`);
  });

  proc.on('close', (code) => {
    clearTimeout(timeout);
    paginator.append(`\n[status] process exited with code ${code}`);
    paginator.markProcessKilled();
  });

  proc.on('error', (err) => {
    clearTimeout(timeout);
    paginator.append(`\n[error]\n${String(err)}`);
    paginator.markProcessKilled();
  });
};

function kill(proc: ReturnType<typeof spawn>) {
  if (process.platform === 'win32' && proc.pid) {
    spawn('powershell', ['-Command', `Stop-Process -Id ${proc.pid} -Force`], { stdio: 'ignore' });
  } else {
    proc.kill('SIGINT');
  }
}

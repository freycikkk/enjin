import { spawn } from "node:child_process";
import { CodeBlock } from "../utils/codeBlock.js";
import { Paginator } from "../utils/paginator.js";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

// A command is force stopped after 60 seconds so it can't run forever.
const HARD_TIMEOUT = 60_000;

/**
 * `shell <command>`  (aliases: sh, bash, zsh, ps, powershell, exec)
 * Runs a command in your default shell and streams the output into a message
 * that updates live. Press Stop to kill it.
 *
 * Uses `process.env.SHELL`, or PowerShell on Windows.
 */
export const shell = async (_client: Client, ctx: Context, rawCode: string | undefined) => {
  const { message } = ctx;

  if (!rawCode) {
    await message.reply({ content: "[ Enjin ] Missing command." });
    return;
  }

  const shellPath = process.env.SHELL || (process.platform === "win32" ? "powershell" : null);

  if (!shellPath) {
    await message.reply("Sorry, we are not able to find your default shell.\nPlease set `process.env.SHELL`.");
    return;
  }

  const parsed = CodeBlock.parse(rawCode);
  let code = parsed?.content ?? rawCode;

  // Small convenience for Windows: swap the most common unix commands for their PowerShell names.
  if (process.platform === "win32") {
    code = code
      .replace(/\bls\b/g, "Get-ChildItem")
      .replace(/\bcat\b/g, "Get-Content")
      .replace(/\bpwd\b/g, "Get-Location");
  }

  // Streaming paginator: the Stop button calls kill() on the process below.
  const paginator = new Paginator(message, undefined, "sh", 1900, () => kill(proc));
  await paginator.init();

  paginator.append(`$ ${code}\n`);

  const proc = spawn(
    shellPath,
    process.platform === "win32" ? ["-NoProfile", "-NonInteractive", "-Command", code] : ["-c", code],
    { stdio: "pipe" }
  );

  // Safety net, see HARD_TIMEOUT.
  const timeout = setTimeout(() => {
    kill(proc);
  }, HARD_TIMEOUT);

  proc.stdout.on("data", (d: Buffer) => {
    paginator.append(d.toString());
  });

  // Errors are tagged so they stand out from normal output.
  proc.stderr.on("data", (d: Buffer) => {
    paginator.append(`[stderr]${d.toString()}`);
  });

  // Normal end: show the exit code and remove the Stop button.
  proc.on("close", (code) => {
    clearTimeout(timeout);
    paginator.append(`\n[status] process exited with code ${code}`);
    paginator.markProcessKilled();
  });

  // The process could not even start (shell not found, etc).
  proc.on("error", (err) => {
    clearTimeout(timeout);
    paginator.append(`\n[error]\n${String(err)}`);
    paginator.markProcessKilled();
  });
};

/** Stops the process. Windows has no signals, so PowerShell is used to end it. */
function kill(proc: ReturnType<typeof spawn>) {
  if (process.platform === "win32" && proc.pid) {
    spawn("powershell", ["-Command", `Stop-Process -Id ${proc.pid} -Force`], { stdio: "ignore" });
  } else {
    proc.kill("SIGINT");
  }
}

import { sendReport } from "../utils/respond.js";
import { InfoReport } from "../class/InfoReport.js";
import { bytes, num, yn } from "../utils/format.js";
import os from "node:os";
import v8 from "node:v8";

import type { Client } from "discord.js";
import type { Context } from "../interface/Context.js";

/** Newer Node APIs that older @types/node versions don't know about yet. */
type ModernProcess = NodeJS.Process & {
  availableMemory?: () => number;
  constrainedMemory?: () => number;
};

/** "a as a percentage of b", safe when b is 0. */
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "N/A");

/**
 * `memory`
 *
 * A deep memory report for the current Node process: what the OS sees (RSS),
 * what V8 sees (heap, heap spaces, code), and how much of the machine is used.
 *
 * Quick glossary:
 *   RSS         total RAM the process holds right now
 *   Heap        memory V8 uses for JS objects (strings, objects, closures)
 *   External    memory for C++ objects tied to JS (Buffers live here)
 *   ArrayBuffer part of External, used by Buffer / TypedArray
 */
export const memory = async (client: Client, ctx: Context) => {
  const { message } = ctx;

  const mem = process.memoryUsage();
  const heap = v8.getHeapStatistics();
  const code = v8.getHeapCodeStatistics();
  const spaces = v8.getHeapSpaceStatistics();
  const usage = process.resourceUsage();
  const modern = process as ModernProcess;

  const systemTotal = os.totalmem();
  const systemFree = os.freemem();
  const systemUsed = systemTotal - systemFree;

  // Whatever RSS isn't heap or external is native code, thread stacks, the Node binary itself, etc.
  const native = Math.max(0, mem.rss - mem.heapTotal - mem.external);

  // 0 means "no limit" (not in a container / cgroup).
  const limit = modern.constrainedMemory?.() ?? 0;
  const available = modern.availableMemory?.();

  const report = new InfoReport(`Memory Report (PID ${process.pid})`)
    .section("Process Memory")
    .field("RSS (resident)", `${bytes(mem.rss)} (${mem.rss.toLocaleString("en-US")} bytes)`)
    .field("Peak RSS", bytes(usage.maxRSS * 1024)) // maxRSS is reported in kilobytes
    .field("Heap Total", bytes(mem.heapTotal))
    .field("Heap Used", `${bytes(mem.heapUsed)} (${pct(mem.heapUsed, mem.heapTotal)} of heap total)`)
    .field("Heap Free", bytes(mem.heapTotal - mem.heapUsed))
    .field("External", bytes(mem.external))
    .field("Array Buffers", `${bytes(mem.arrayBuffers)} (inside External)`)
    .field("Native / Other", `${bytes(native)} (RSS - heap - external)`)
    .field("Share Of System RAM", pct(mem.rss, systemTotal))

    .section("V8 Heap Limits")
    .field("Heap Size Limit", bytes(heap.heap_size_limit))
    .field("Used Of Limit", pct(heap.used_heap_size, heap.heap_size_limit))
    .field("Total Heap Size", bytes(heap.total_heap_size))
    .field("Used Heap Size", bytes(heap.used_heap_size))
    .field("Available Heap", bytes(heap.total_available_size))
    .field("Physical Heap", bytes(heap.total_physical_size))
    .field("Executable Heap", bytes(heap.total_heap_size_executable))
    .field("Malloced Memory", bytes(heap.malloced_memory))
    .field("Peak Malloced", bytes(heap.peak_malloced_memory))
    .field("External Memory", bytes(heap.external_memory))
    .field("Global Handles", `${bytes(heap.used_global_handles_size)} / ${bytes(heap.total_global_handles_size)}`)
    .field("Native Contexts", num(heap.number_of_native_contexts))
    // Detached contexts that keep growing are a classic sign of a memory leak.
    .field("Detached Contexts", num(heap.number_of_detached_contexts))
    .field("Zap Garbage", yn(Boolean(heap.does_zap_garbage)));

  // One line per V8 heap space (new_space, old_space, code_space...).
  report.section("Heap Spaces");
  for (const space of spaces) {
    report.field(
      space.space_name,
      `${bytes(space.space_used_size)} / ${bytes(space.space_size)} (${pct(space.space_used_size, space.space_size)}) | free ${bytes(space.space_available_size)} | physical ${bytes(space.physical_space_size)}`
    );
  }

  report
    .section("Compiled Code")
    .field("Code + Metadata", bytes(code.code_and_metadata_size))
    .field("Bytecode + Metadata", bytes(code.bytecode_and_metadata_size))
    .field("External Script Source", bytes(code.external_script_source_size))

    .section("System Memory")
    .field("Total", bytes(systemTotal))
    .field("Used", `${bytes(systemUsed)} (${pct(systemUsed, systemTotal)})`)
    .field("Free", `${bytes(systemFree)} (${pct(systemFree, systemTotal)})`)
    .field("Available To Process", available !== undefined ? bytes(available) : "N/A (Node < 22)")
    .field("Container Limit", limit > 0 ? `${bytes(limit)} (RSS uses ${pct(mem.rss, limit)})` : "None")
    .field(
      "Load Average (1/5/15m)",
      os
        .loadavg()
        .map((n) => n.toFixed(2))
        .join(" / ")
    )

    .section("OS Level Counters")
    .field("Minor Page Faults", num(usage.minorPageFault))
    .field("Major Page Faults", num(usage.majorPageFault))
    .field("Swapped Out", num(usage.swappedOut))
    .field("Shared Memory", bytes(usage.sharedMemorySize * 1024))
    .field("FS Reads / Writes", `${num(usage.fsRead)} / ${num(usage.fsWrite)}`)
    .field(
      "Context Switches",
      `${num(usage.voluntaryContextSwitches)} voluntary / ${num(usage.involuntaryContextSwitches)} forced`
    )

    .section("Notes")
    .field("Manual GC Available", yn(typeof (globalThis as { gc?: unknown }).gc === "function"))
    .field("Scope", client.shard ? `This shard only (ids: ${client.shard.ids.join(", ")})` : "This process only");

  await sendReport(message, report, ctx.secrets, client.token);
};

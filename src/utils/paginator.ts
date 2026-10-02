import { Chunking } from "./Chunking.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";

import type { Message } from "discord.js";

/**
 * Shows long text in a code block with Prev / Next / Stop buttons.
 *
 * It works in two modes, picked by the 2nd constructor argument:
 *   - static:    you pass the finished pages (array) -> used for normal results
 *   - streaming: you pass a language (string) and keep calling `append()` as
 *                new output arrives -> used by the shell command
 *
 * Only the person who ran the command can press the buttons. Buttons turn
 * off after 10 minutes without use (or when Stop is pressed).
 */
export class Paginator {
  /** All text received so far (streaming mode). */
  private content = "";
  /** The text split into pages. */
  private pages: string[] = [];
  /** Page currently shown, starting at 0. */
  private index = 0;
  /** True once the buttons are dead (timeout or Stop pressed). */
  private stopped = false;
  /** The reply message we keep editing. Set in `init()`. */
  private msg!: Message;
  /** True once the running process has ended, so the Stop button is no longer needed. */
  private processKilled = false;
  private readonly streaming: boolean;
  /** Output that arrived but is not on screen yet. */
  private buffer = "";
  private flushTimer: NodeJS.Timeout | null = null;
  /** Minimum ms between message edits. Discord rate limits edits, so we batch. */
  private readonly FLUSH_INTERVAL = 800;
  private prev = new ButtonBuilder().setCustomId("prev").setLabel("Prev").setStyle(ButtonStyle.Danger);
  private stop = new ButtonBuilder().setCustomId("stop").setLabel("Stop").setStyle(ButtonStyle.Secondary);
  private next = new ButtonBuilder().setCustomId("next").setLabel("Next").setStyle(ButtonStyle.Success);

  /**
   * @param sourceMessage the owner's message, we reply to it
   * @param pagesOrLang   array of pages (static mode) or language name (streaming mode)
   * @param lang          code block language, used if `pagesOrLang` is not a string
   * @param limit         max characters of one page
   * @param killProcess   called when Stop is pressed, should stop whatever is producing the output
   * @param idleTimeout   ms of no button use before the buttons are disabled
   */
  constructor(
    private sourceMessage: Message,
    pagesOrLang?: string[] | string,
    private lang = "js",
    private limit = 1900,
    private killProcess?: () => void,
    private idleTimeout = 600000
  ) {
    if (Array.isArray(pagesOrLang)) {
      this.pages = pagesOrLang.length ? pagesOrLang : [" "];
      this.streaming = false;
    } else {
      this.lang = pagesOrLang || this.lang;
      this.pages = [" "];
      this.streaming = true;
    }
  }

  /** Shell output uses "sh", it is the only mode that gets a Stop button. */
  private isShell() {
    return this.lang === "sh";
  }

  /** Re-cuts the whole content into pages (streaming mode). */
  private split() {
    this.pages = Chunking(this.content, this.limit);

    if (!this.pages.length) {
      this.pages = [""];
    }
  }

  /** Builds the message text for the current page: code block + "Page x/y". */
  private format() {
    if (this.streaming) this.split();

    const body = this.pages[this.index] ?? "";
    const footer = `\nPage ${this.index + 1}/${this.pages.length}`;
    const content = `\`\`\`${this.lang}\n${body}\n\`\`\`` + footer;

    // A short notice is better than Discord rejecting a message over 2000 characters.
    return content.length > 2000 ? "```Output too large```" : content;
  }

  /** Sends the first message and starts listening for button clicks. Call once. */
  async init() {
    this.msg = await this.sourceMessage.reply({
      content: this.format(),
      components: this.buildComponents(),
    });

    const collector = this.msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      idle: this.idleTimeout,
    });

    collector.on("collect", async (i) => {
      // Buttons are for the command author only.
      if (i.user.id !== this.sourceMessage.author.id) {
        return i.reply({
          content: "Nice try diddy ;-;",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Stop: kill the running process, then lock the buttons.
      if (i.customId === "stop") {
        this.killProcess?.();
        this.processKilled = true;
        this.stopped = true;
        await i.update({ components: this.buildComponents(true) });
        collector.stop("stopped");
        return;
      }

      // Prev / Next just move the page index, then redraw.
      if (i.customId === "prev" && this.index > 0) this.index--;
      if (i.customId === "next" && this.index < this.pages.length - 1) this.index++;

      await i.update({
        content: this.format(),
        components: this.buildComponents(),
      });
      return;
    });

    // Timeout or Stop: grey out all the buttons.
    collector.on("end", () => {
      this.stopped = true;
      this.msg?.edit({ components: this.buildComponents(true) }).catch(() => {});
    });
  }

  /** Streaming mode: add new output. The screen is updated at most every FLUSH_INTERVAL ms. */
  append(chunk: string) {
    if (!this.streaming || this.stopped) return;

    this.buffer += chunk;

    // First chunk edits right away, the ones that follow wait for the timer to finish.
    if (!this.flushTimer) {
      this.flush();
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
      }, this.FLUSH_INTERVAL);
    }
  }

  /** Moves buffered output into the content and edits the message. */
  private flush() {
    if (!this.buffer || !this.msg) return;

    this.content += this.buffer;
    this.buffer = "";

    this.split();

    // Pages can change when content grows, keep the index inside the valid range.
    this.index = Math.max(0, Math.min(this.index, this.pages.length - 1));

    this.msg
      .edit({
        content: this.format(),
        components: this.buildComponents(this.stopped),
      })
      .catch(() => {});
  }

  /** Static mode: swap in new pages and redraw. */
  updatePages(pages: string[]) {
    if (this.streaming) return;

    this.pages = pages.length ? pages : [""];

    this.index = Math.max(0, Math.min(this.index, this.pages.length - 1));

    this.msg
      ?.edit({
        content: this.format(),
        components: this.buildComponents(this.stopped),
      })
      .catch(() => {});
  }

  /**
   * Builds the button row. No buttons at all for a single page, except in shell mode
   * where Stop is needed even if the output is short.
   */
  private buildComponents(disabled = false) {
    if (this.pages.length <= 1 && !this.isShell()) return [];

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (this.pages.length > 1) {
      row.addComponents(
        ButtonBuilder.from(this.prev).setDisabled(disabled || this.index === 0),
        ButtonBuilder.from(this.next).setDisabled(disabled || this.index === this.pages.length - 1)
      );
    }

    if (this.streaming && !this.processKilled) {
      row.addComponents(ButtonBuilder.from(this.stop).setDisabled(disabled));
    }

    return row.components.length ? [row] : [];
  }

  /** Call when the process finished (or was killed). Shows the last output and removes the Stop button. */
  markProcessKilled() {
    this.processKilled = true;
    this.flush();
    this.msg?.edit({ components: this.buildComponents(this.stopped) }).catch(() => {});
  }
}

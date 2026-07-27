/** @format */

import { Chunking } from './Chunking.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';

import type { Message } from 'discord.js';

export class Paginator {
  private content = '';
  private pages: string[] = [];
  private index = 0;
  private stopped = false;
  private msg!: Message;
  private processKilled = false;
  private readonly streaming: boolean;
  private buffer = '';
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 800;
  private prev = new ButtonBuilder().setCustomId('prev').setLabel('Prev').setStyle(ButtonStyle.Danger);
  private stop = new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Secondary);
  private next = new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Success);

  constructor(
    private sourceMessage: Message,
    pagesOrLang?: string[] | string,
    private lang = 'js',
    private limit = 1900,
    private killProcess?: () => void
  ) {
    if (Array.isArray(pagesOrLang)) {
      this.pages = pagesOrLang.length ? pagesOrLang : [' '];
      this.streaming = false;
    } else {
      this.lang = pagesOrLang || this.lang;
      this.pages = [' '];
      this.streaming = true;
    }
  }

  private isShell() {
    return this.lang === 'sh';
  }

  private split() {
    this.pages = Chunking(this.content || ' ', this.limit);
  }

  private format() {
    if (this.streaming) this.split();

    const body = this.pages[this.index] ?? '';
    const footer = `\nPage ${this.index + 1}/${this.pages.length}`;
    const content = `\`\`\`${this.lang}\n${body}\n\`\`\`` + footer;

    return content.length > 2000 ? '```Output too large```' : content;
  }

  async init() {
    this.msg = await this.sourceMessage.reply({
      content: this.format(),
      components: this.buildComponents()
    });

    const collector = this.msg.createMessageComponentCollector({
      componentType: ComponentType.Button
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== this.sourceMessage.author.id) {
        return i.reply({
          content: 'Nice try diddy ;-;',
          flags: MessageFlags.Ephemeral
        });
      }

      if (i.customId === 'stop') {
        this.killProcess?.();
        this.processKilled = true;
        this.stopped = true;
        collector.stop();
        return i.update({ components: [] });
      }

      if (i.customId === 'prev' && this.index > 0) this.index--;
      if (i.customId === 'next' && this.index < this.pages.length - 1) this.index++;

      await i.update({
        content: this.format(),
        components: this.buildComponents()
      });
      return;
    });
  }

  append(chunk: string) {
    if (!this.streaming || this.stopped) return;

    this.buffer += chunk;

    if (!this.flushTimer) {
      this.flush();
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
      }, this.FLUSH_INTERVAL);
    }
  }

  private flush() {
    if (!this.buffer || !this.msg) return;

    this.content += this.buffer;
    this.buffer = '';

    if (this.index >= this.pages.length - 1) {
      this.index = this.pages.length - 1;
    }

    this.msg
      .edit({
        content: this.format(),
        components: this.buildComponents()
      })
      .catch(() => {});
  }

  updatePages(pages: string[]) {
    if (this.streaming) return;

    this.pages = pages.length ? pages : [' '];
    if (this.index >= this.pages.length) {
      this.index = this.pages.length - 1;
    }

    this.msg
      ?.edit({
        content: this.format(),
        components: this.buildComponents()
      })
      .catch(() => {});
  }

  private buildComponents() {
    if (this.stopped) return [];
    if (this.pages.length <= 1 && !this.isShell()) return [];

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (this.pages.length > 1) {
      row.addComponents(
        ButtonBuilder.from(this.prev).setDisabled(this.index === 0),
        ButtonBuilder.from(this.next).setDisabled(this.index === this.pages.length - 1)
      );
    }

    if (this.streaming && !this.processKilled) {
      row.addComponents(ButtonBuilder.from(this.stop));
    }

    return row.components.length ? [row] : [];
  }

  markProcessKilled() {
    this.processKilled = true;
    this.flush();
    this.msg?.edit({ components: this.buildComponents() }).catch(() => {});
  }
}

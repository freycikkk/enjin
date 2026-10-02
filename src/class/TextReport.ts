/**
 * Tiny builder for the compact status message (the default `!enjin` reply).
 * Every line is written in Discord's small "subtext" style (`-# `), so the
 * whole report takes little space in the chat.
 *
 * For long "key : value" reports use InfoReport instead.
 */
class TextReport {
  private readonly lines: string[] = [];

  /** Adds one line of small text. Chainable. */
  line(text: string) {
    this.lines.push(`-# ${text}`);
    return this;
  }

  /** Adds an empty line to separate groups. Chainable. */
  blank() {
    this.lines.push("");
    return this;
  }

  /** Joins everything into the final message text. */
  render() {
    return this.lines.join("\n");
  }
}

export { TextReport };

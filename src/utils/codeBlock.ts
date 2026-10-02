/** Helpers for markdown code blocks. */
export class CodeBlock {
  /**
   * Takes the code out of a fenced block:
   *   ```js
   *   console.log(1)
   *   ```
   * gives `{ lang: "js", content: "console.log(1)" }`.
   * Returns null if the text isn't one single fenced block, so callers can use the raw text instead.
   */
  static parse(input: string) {
    const match = input.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
    if (!match) return null;

    const lang = match[1] ?? "";
    const content = match[2];

    return { lang, content };
  }
}

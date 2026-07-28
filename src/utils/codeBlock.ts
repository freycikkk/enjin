export class CodeBlock {
  static parse(input: string) {
    const match = input.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
    if (!match) return null;

    const lang = match[1] ?? "";
    const content = match[2];

    return { lang, content };
  }
}

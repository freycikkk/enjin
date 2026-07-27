/** @format */

class TextReport {
  private readonly lines: string[] = [];

  line(text: string) {
    this.lines.push(`-# ${text}`);
    return this;
  }

  blank() {
    this.lines.push('');
    return this;
  }

  render() {
    return this.lines.join('\n');
  }
}

export { TextReport };

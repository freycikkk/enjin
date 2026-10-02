/**
 * Builds the "key: value" reports used by the info commands.
 *
 * Usage:
 *   new InfoReport("Guild")
 *     .section("General")
 *     .field("Name", guild.name)
 *     .field("Members", 120)
 *     .render();
 *
 * Keys inside one section are padded so the values line up, which keeps the
 * output readable inside a Discord code block.
 */

type Row = { type: "field"; key: string; value: string } | { type: "section"; title: string } | { type: "blank" };

class InfoReport {
  private readonly rows: Row[] = [];

  constructor(private readonly title?: string) {}

  /** Starts a new titled block. A blank line is inserted before it automatically. */
  section(title: string) {
    if (this.rows.length) this.rows.push({ type: "blank" });
    this.rows.push({ type: "section", title });
    return this;
  }

  /** Adds one "key: value" row. Null/undefined values are shown as "N/A". */
  field(key: string, value: string | number | bigint | boolean | null | undefined) {
    const text = value === null || value === undefined ? "N/A" : String(value);
    this.rows.push({ type: "field", key, value: text });
    return this;
  }

  /** Same as `field`, but the row is skipped entirely when the value is empty. */
  optional(key: string, value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return this;
    return this.field(key, value);
  }

  render() {
    const out: string[] = [];
    if (this.title) out.push(`# ${this.title}`);

    // A "block" is everything from one section header to the next.
    // Each block gets its own key width so short sections don't get huge gaps.
    // Fields that appear before the first section use the width of that leading block.
    let width = this.blockWidth(0);

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      if (!row) continue;

      if (row.type === "section") {
        width = this.blockWidth(i + 1);
        out.push(`[${row.title}]`);
      } else if (row.type === "blank") {
        out.push("");
      } else {
        out.push(`${row.key.padEnd(width)} : ${row.value}`);
      }
    }

    return out.join("\n");
  }

  /** Widest key from `start` until the next section header (or the end). */
  private blockWidth(start: number) {
    let width = 0;
    for (let i = start; i < this.rows.length; i++) {
      const row = this.rows[i];
      if (row?.type === "section") break;
      if (row?.type === "field") width = Math.max(width, row.key.length);
    }
    return width;
  }
}

export { InfoReport };

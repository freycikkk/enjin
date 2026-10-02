// Discord stops messages at 2000 characters. We stay below that to leave room
// for the code block fences and the "Page x/y" footer.
const MAX_PAGE_SIZE = 1900;

/**
 * Splits text into pages that fit in one Discord message.
 * It cuts on line breaks so lines are never broken in half, unless a single
 * line is longer than a page (then that line gets a page of its own).
 */
export function Chunking(text: string, maxSize = MAX_PAGE_SIZE) {
  if (!text) return [""];

  // Normalise Windows line endings first so the split below is consistent.
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];

  let buffer = "";

  for (const line of lines) {
    const next = buffer ? `${buffer}\n${line}` : line;

    // Giant single line: push what we have, then give the line its own page.
    if (line.length >= maxSize) {
      if (buffer.trim().length) {
        chunks.push(buffer.trimEnd());
        buffer = "";
      }

      chunks.push(line);
      continue;
    }

    // Adding this line would overflow the page: close the current page and start a new one.
    if (next.length > maxSize) {
      if (buffer.trim().length) {
        chunks.push(buffer.trimEnd());
      }

      buffer = line;
      continue;
    }

    buffer = next;
  }

  if (buffer.trim().length) {
    chunks.push(buffer.trimEnd());
  }

  // Always return at least one page.
  return chunks.length ? chunks : [""];
}

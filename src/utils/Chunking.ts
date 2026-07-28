const MAX_PAGE_SIZE = 1900;

export function Chunking(text: string, maxSize = MAX_PAGE_SIZE) {
  if (!text) return [""];

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];

  let buffer = "";

  for (const line of lines) {
    const next = buffer ? `${buffer}\n${line}` : line;

    if (line.length >= maxSize) {
      if (buffer.trim().length) {
        chunks.push(buffer.trimEnd());
        buffer = "";
      }

      chunks.push(line);
      continue;
    }

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

const normalizeText = (text) => text.replace(/\s+/g, " ").trim();

const splitNormalizedText = (normalized, chunkSize, chunkOverlap) => {
  const step = Math.max(1, chunkSize - chunkOverlap);
  const chunks = [];

  for (let start = 0; start < normalized.length; start += step) {
    const rawChunk = normalized.slice(start, start + chunkSize);
    const leadingWhitespace = rawChunk.length - rawChunk.trimStart().length;
    const chunk = rawChunk.trim();

    if (chunk) {
      chunks.push({
        text: chunk,
        start: start + leadingWhitespace,
        end: start + leadingWhitespace + chunk.length,
      });
    }

    if (start + chunkSize >= normalized.length) break;
  }

  return chunks;
};

/**
 * Splits extracted text into the existing overlapping character windows.
 * @param {string} text - Raw input text
 * @param {number} chunkSize - Maximum characters per chunk (default: 1000)
 * @param {number} chunkOverlap - Overlapping characters between chunks (default: 120)
 * @returns {string[]} Array of text chunks
 */
export const splitText = (text, chunkSize = 1000, chunkOverlap = 120) => {
  if (typeof text !== "string") {
    return [];
  }

  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  return splitNormalizedText(normalized, chunkSize, chunkOverlap).map(
    ({ text: chunk }) => chunk,
  );
};

export const splitTextWithPages = (
  pages,
  chunkSize = 1000,
  chunkOverlap = 120,
) => {
  if (!Array.isArray(pages)) return [];

  let normalized = "";
  const pageRanges = [];

  for (const page of pages) {
    if (typeof page.text !== "string" || !Number.isSafeInteger(page.pageNumber)) {
      continue;
    }

    const pageText = normalizeText(page.text);
    if (!pageText) continue;

    if (normalized) normalized += " ";
    const start = normalized.length;
    normalized += pageText;
    pageRanges.push({ pageNumber: page.pageNumber, start, end: normalized.length });
  }

  return splitNormalizedText(normalized, chunkSize, chunkOverlap).map(
    ({ text, start, end }) => ({
      text,
      pageNumbers: pageRanges
        .filter((page) => page.start < end && page.end > start)
        .map((page) => page.pageNumber),
    }),
  );
};
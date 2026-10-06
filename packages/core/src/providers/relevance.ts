/**
 * Stock libraries return loose matches (search "dark hallway", get an ocean). We only accept a clip
 * whose own description/tags contain the words we searched for.
 */
const STOP = new Set(["a", "an", "the", "of", "in", "on", "at", "with", "and", "or", "to", "by", "for", "from", "into", "up", "close", "view", "shot"]);

function stem(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/(ing|ies|es|s)$/, "")
    .slice(0, 6);
}

export function contentWords(text: string): string[] {
  return [...new Set(text.split(/[\s,/-]+/).filter((w) => w && !STOP.has(w.toLowerCase())).map(stem).filter((w) => w.length > 1))];
}

/** How many of the query's content words appear in the clip's description. */
export function relevance(query: string, description: string): { hits: number; needed: number } {
  const wanted = contentWords(query);
  const have = new Set(contentWords(description));
  const hits = wanted.filter((w) => have.has(w)).length;
  // One-word queries need their word; longer ones need at least two words (or all, if only two).
  return { hits, needed: Math.min(wanted.length, 2) };
}

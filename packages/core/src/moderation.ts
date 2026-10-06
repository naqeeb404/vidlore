/**
 * Cheap first-line filter for clearly harmful topics. Gemini's safety settings are the second line.
 * Deliberately narrow: horror and history topics legitimately mention death, war, ghosts, etc.
 */
const BLOCKED = [
  /\b(child|kid|minor|underage)s?\b.*\b(sex|nude|naked|porn)/i,
  /\b(sex|nude|naked|porn|nsfw|hentai|onlyfans)\b/i,
  /\b(how to|guide to|steps to)\b.*\b(make|build|cook|synthesi[sz]e)\b.*\b(bomb|explosive|meth|nerve agent|bioweapon|poison)/i,
  /\b(kill|shoot|stab)\b.*\b(myself|yourself)\b/i,
  /\b(suicide|self[- ]harm)\b.*\b(method|how)/i,
  /\b(nazi|white power|heil hitler|kkk)\b.*\b(great|glory|support|join)/i,
  /\b(n[i1]gg|f[a@]gg?ot|k[i1]ke|tr[a@]nny)/i,
];

export function isBlockedTopic(text: string): boolean {
  return BLOCKED.some((re) => re.test(text));
}

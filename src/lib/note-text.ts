/** Begin van een regel in een puntenlijst. */
export const BULLET = "• ";
/** Eén niveau inspringen in een puntenlijst (Tab), zoals sublijsten in Apple Notes. */
export const INDENT = "  ";
/** Diepste niveau (0 = bovenste). */
export const MAX_LEVEL = 3;

/** Regel met een bolletje: inspringing, en de tekst erachter. */
const BULLET_LINE = /^([ \t]*)• (.*)$/;

/** "- " en "* " aan het begin van een regel worden een echt bolletje; inspringing blijft. */
export function withBullets(text: string) {
  return text.replace(/^([ \t]*)[-*][ \t]+/gm, `$1${BULLET}`);
}

/** Niveau van een regel met een bolletje, of null als het geen lijstregel is. */
export function bulletLevel(line: string): number | null {
  const match = BULLET_LINE.exec(line);
  if (!match) return null;
  const indent = match[1].replace(/\t/g, INDENT).length;
  return Math.min(Math.floor(indent / INDENT.length), MAX_LEVEL);
}

export type ListItem = { text: string; level: number };
export type NoteBlock = { type: "text"; text: string } | { type: "list"; items: ListItem[] };

/**
 * Tekst in alinea-regels en puntenlijsten (opeenvolgende regels met een bolletje, elk met
 * een niveau). keepEmpty: lege regels blijven als lege tekstblokken staan (witruimte in de
 * volledige weergave).
 */
export function noteBlocks(text: string, { keepEmpty = false } = {}): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  for (const line of withBullets(text).split("\n")) {
    const last = blocks.at(-1);
    const level = bulletLevel(line);
    if (level !== null) {
      const item = { text: BULLET_LINE.exec(line)![2], level };
      if (last?.type === "list") last.items.push(item);
      else blocks.push({ type: "list", items: [item] });
    } else if (line.trim() || keepEmpty) {
      blocks.push({ type: "text", text: line });
    }
  }
  return blocks;
}

/** Alleen de eerste `maxLines` regels (alinea's en lijstpunten), voor een voorproefje. */
export function previewBlocks(text: string, maxLines: number): NoteBlock[] {
  const result: NoteBlock[] = [];
  let left = maxLines;
  for (const block of noteBlocks(text)) {
    if (left <= 0) break;
    if (block.type === "text") {
      result.push(block);
      left -= 1;
    } else {
      const items = block.items.slice(0, left);
      result.push({ type: "list", items });
      left -= items.length;
    }
  }
  return result;
}

export type TextPart = { type: "text"; text: string } | { type: "link"; text: string; href: string };

// Laatste teken van een link: geen leesteken, zodat een punt achter de zin er niet bij hoort
const END = String.raw`[^\s<>".,;:!?)\]']`;
// Kale domeinnamen (avn.nl/orders) alleen met een bekende extensie, zodat "bijv.nl" of
// "bestand.ts" geen link worden. Niet direct na @ (e-mailadressen) of een ander woordteken.
const TLDS = "nl|com|net|org|io|dev|app|be|de|eu|co|ai|uk|fr|info|tech|cloud|site|online|shop|me|so|ly";
const URL_PATTERN = new RegExp(
  String.raw`\b(?:https?:\/\/|www\.)[^\s<>"]*${END}` +
    String.raw`|(?<![@\w.\/-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:${TLDS})\b(?:\/(?:[^\s<>"]*${END})?)?`,
  "gi",
);

/** Tekst opgeknipt in gewone tekst en links. Alleen http(s), dus nooit javascript:-links. */
export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0];
    if (match.index > last) parts.push({ type: "text", text: text.slice(last, match.index) });
    parts.push({ type: "link", text: url, href: /^https?:\/\//i.test(url) ? url : `https://${url}` });
    last = match.index + url.length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

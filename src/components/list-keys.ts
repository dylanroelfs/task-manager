import { BULLET, listLine, listPrefix, MAX_LEVEL, renumber } from "@/lib/note-text";

/**
 * Lijsten tijdens het typen in een tekstvak, zoals in Apple Notes:
 * - "- " of "* " aan het begin van een regel wordt een bolletje; "1. " begint een genummerde lijst;
 * - Enter op een lijstregel begint een nieuw punt op hetzelfde niveau (met het volgende nummer);
 * - Enter op een leeg punt springt eerst terug, en stopt bovenaan de lijst;
 * - Tab maakt van een punt een subpunt, Shift+Tab zet het een niveau terug.
 * Tab buiten een lijst doet gewoon wat het altijd doet (naar het volgende veld).
 */
export function listKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.nativeEvent.isComposing) return;
  const el = e.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = el;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const beforeCursor = value.slice(lineStart, start);

  if (e.key === "Tab") {
    if (indentLines(el, e.shiftKey ? -1 : 1)) {
      e.preventDefault();
      renumberField(el);
    }
    return;
  }
  if (start !== end && e.key !== "Enter") return;

  const marker = /^([ \t]*)[-*]$/.exec(beforeCursor);
  if (e.key === " " && marker) {
    e.preventDefault();
    el.setRangeText(marker[1] + BULLET, lineStart, start, "end");
    return;
  }

  const item = listLine(beforeCursor);
  if (e.key === "Enter" && !e.shiftKey && item) {
    e.preventDefault();
    const lineEnd = value.indexOf("\n", end);
    const restOfLine = value.slice(end, lineEnd === -1 ? value.length : lineEnd);
    if (!item.text && !restOfLine.trim() && start === end) {
      // Leeg punt: een niveau terug, of bovenaan de lijst stoppen
      const up = item.level > 0 ? listPrefix(item.level - 1, item.number === null ? null : 1) : "";
      el.setRangeText(up, lineStart, start, "end");
    } else {
      const next = item.number === null ? null : item.number + 1;
      el.setRangeText(`\n${listPrefix(item.level, next)}`, start, end, "end");
    }
    renumberField(el);
  }
}

/**
 * Springt de lijstregels in de selectie (of de regel van de cursor) een niveau in of terug.
 * Een genummerd punt begint op zijn nieuwe niveau bij 1; renumberField telt daarna door.
 * Geeft false als er geen lijstregel bij zit; dan doet Tab gewoon zijn normale werk.
 */
function indentLines(el: HTMLTextAreaElement, direction: 1 | -1) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const to = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(from, to).split("\n");
  if (!lines.some((l) => listLine(l))) return false;

  let firstShift = 0;
  let totalShift = 0;
  const next = lines.map((line, i) => {
    const item = listLine(line);
    if (!item) return line;
    const level = Math.max(0, Math.min(MAX_LEVEL, item.level + direction));
    if (level === item.level) return line;
    const result = listPrefix(level, item.number === null ? null : 1) + item.text;
    const shift = result.length - line.length;
    if (i === 0) firstShift = shift;
    totalShift += shift;
    return result;
  });

  el.setRangeText(next.join("\n"), from, to);
  // Cursor (of selectie) blijft op dezelfde plek in de tekst staan
  el.setSelectionRange(Math.max(from, start + firstShift), end + totalShift);
  return true;
}

/** Nummert de genummerde lijsten in het tekstvak door; de cursor blijft bij dezelfde tekst. */
function renumberField(el: HTMLTextAreaElement) {
  const lines = el.value.split("\n");
  const next = renumber(lines);

  // Per gewijzigde regel: vanaf het eind van het oude nummer schuift alles op
  const shifts: { at: number; by: number }[] = [];
  let pos = 0;
  lines.forEach((line, i) => {
    if (next[i] !== line) shifts.push({ at: pos + line.length - listLine(line)!.text.length, by: next[i].length - line.length });
    pos += line.length + 1;
  });
  if (!shifts.length) return;

  const map = (p: number) => shifts.reduce((q, s) => (p >= s.at ? q + s.by : q), p);
  const { selectionStart: start, selectionEnd: end } = el;
  el.setRangeText(next.join("\n"), 0, el.value.length);
  el.setSelectionRange(map(start), map(end));
}

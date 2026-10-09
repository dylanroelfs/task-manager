import { linkParts, noteBlocks, previewBlocks, type NoteBlock } from "@/lib/note-text";

/** Tekst met klikbare links; links openen in een nieuw tabblad. */
function Linked({ text }: { text: string }) {
  return linkParts(text).map((part, i) =>
    part.type === "link" ? (
      <a
        key={i}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
      >
        {part.text}
      </a>
    ) : (
      part.text
    ),
  );
}

const MARKERS = ["•", "◦", "▪", "–"];

function Blocks({ blocks, truncate }: { blocks: NoteBlock[]; truncate: boolean }) {
  const line = truncate ? "min-w-0 truncate" : "min-w-0 [overflow-wrap:anywhere]";
  return blocks.map((block, i) =>
    block.type === "text" ? (
      // Lege regel (alleen in de volledige weergave): witruimte tussen alinea's
      <p key={i} className={block.text.trim() ? (truncate ? "truncate" : "[overflow-wrap:anywhere]") : "h-3"}>
        <Linked text={block.text} />
      </p>
    ) : (
      // Eigen bolletje: een list-disc-marker valt weg door de overflow van truncate.
      // Sublijsten springen in en krijgen per niveau een ander bolletje, zoals in Apple Notes.
      <ul key={i} className="pl-1">
        {block.items.map((item, j) => (
          <li key={j} className="flex gap-2" style={{ paddingLeft: `${item.level * 1.25}rem` }}>
            <span aria-hidden className="w-2 shrink-0 text-center text-ink-3">
              {MARKERS[item.level % MARKERS.length]}
            </span>
            <span className={line}>
              <Linked text={item.text} />
            </span>
          </li>
        ))}
      </ul>
    ),
  );
}

/** De eerste drie regels, voor op het kaartje. */
export function NotePreview({ body }: { body: string }) {
  return (
    <div className="mt-1 space-y-0.5 text-sm leading-relaxed text-ink-2">
      <Blocks blocks={previewBlocks(body, 3)} truncate />
    </div>
  );
}

/** De hele notitie, in de popup. */
export function NoteBody({ body }: { body: string }) {
  return (
    <div className="space-y-0.5 text-sm leading-relaxed text-ink-2">
      <Blocks blocks={noteBlocks(body, { keepEmpty: true })} truncate={false} />
    </div>
  );
}

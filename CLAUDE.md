@AGENTS.md

# Task manager

Takenlijst voor een klein team: projecten → onderdelen (sections) → taken, met toewijzen aan
collega's, status en deadlines. Next.js 16 (App Router) + React 19 + Supabase (auth + Postgres)
+ Tailwind 4. UI-teksten, comments en foutmeldingen zijn in het Nederlands; houd dat zo.

## Commando's

- `npm run dev` — dev-server op http://localhost:3000
- `npm run build` — productiebuild (moet ook slagen zonder Supabase-variabelen)
- `npm run lint` — ESLint

Er zijn geen tests. Controleer wijzigingen met `npm run lint` en `npm run build`.

## Opzet

- `src/app/(dashboard)/` — ingelogde pagina's: `/` (home met kaarten en grafieken), `/open`,
  `/afgerond`, `/notities` (lijst met zoekbalk). `layout.tsx` laadt gebruiker, tellingen en projecten voor de sidebar.
- `src/app/login/` — de enige publieke route.
- `src/proxy.ts` + `src/lib/supabase/proxy.ts` — in Next 16 heet middleware `proxy`. Ververst
  de sessie en stuurt niet-ingelogden naar `/login`. Echte afscherming van data is RLS.
- `src/lib/tasks.ts` — alle leesqueries (server-only) en het omzetten naar view-types
  (`TaskItemData`, `Project`, …). Datums in tijdzone `Europe/Amsterdam`.
- `src/lib/actions/` — Server Functions (`"use server"`) voor taken, projecten en auth.
  Valideer FormData zelf, geef bij formulieren een foutmelding-string of `null` terug, en sluit
  af met `revalidatePath("/", "layout")`.
- `src/lib/auth.ts` — `getCurrentUser()` (gecachet per request, redirect naar `/login`).
- `src/lib/supabase/` — `server.ts` (server-only client), `client.ts` (browser), `env.ts`.
  `database.types.ts` is **handgeschreven**: bij een schemawijziging zelf bijwerken.
- `src/components/` — UI-componenten; `use-backdrop-close.ts` voor dialogen.

## Database en migraties

- Migraties staan in `supabase/migrations/` als `NNN_naam.sql`. Al toegepaste migraties
  staan in `supabase/migrations/applied/`; open migraties in de map erboven.
- Schrijf een nieuwe migratie als bestand en laat de gebruiker hem toepassen (bij voorkeur
  handmatig via de Supabase SQL Editor, of via de `migrator`-agent). Voer zelf nooit
  migraties uit; een hook blokkeert `mcp__supabase__*` buiten de `migrator`-agent.
- Elke tabel heeft RLS. Eigenaar (`user_id`) mag alles; een toegewezen medewerker
  (`assignee_id`) mag een taak zien en de status wijzigen, niet bewerken of verwijderen.
  Dat bewaakt de trigger `tasks_guard_update` — pas die aan bij nieuwe taakkolommen.
- `done` en `completed_at` worden door een trigger afgeleid van `status`; zet ze niet zelf.
- Een `section_id` mag alleen bij een taak met `project_id` en hoort bij hetzelfde project
  (samengestelde foreign key).

## Styling

- Kleuren via tokens in `src/app/globals.css` (`bg-page`, `bg-surface`, `text-ink-2`,
  `border-line`, `text-accent`, …). Geen losse hex-kleuren in componenten.
- Bouwstenen uit `globals.css`: `card` (vlak met rand en zachte schaduw) en `icon-button`
  (kleine knop met alleen een icoon, zoals plus en filter). Schaduwen via `shadow-card` en
  `shadow-pop` (uitklapmenu's). Pagina's staan in `AppPanel` naast de sidebar.
- Thema staat standaard op licht; donker via `data-theme="dark"` op `<html>` (knop in de
  topbar, bewaard in `localStorage`). Gebruik de `dark:`-variant, niet `prefers-color-scheme`.

## Omgeving

- `.env.local` met `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (zie `.env.example`). Nooit de service_role/secret key gebruiken.
- `.claude/` en `.mcp.json` zijn afgeschermd voor bewerken door Claude.

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { logout } from "@/lib/actions/auth";
import { createProject } from "@/lib/actions/projects";
import type { CurrentUser } from "@/lib/auth";
import type { Project } from "@/lib/tasks";
import { CheckCircleIcon, CloseIcon, HomeIcon, ListIcon, LogoutIcon, MenuIcon, NoteIcon, PlusIcon } from "./icons";
import { ProjectDot } from "./project-dot";

export function Sidebar({
  user,
  openCount,
  doneCount,
  projects,
  noteCount,
}: {
  user: CurrentUser | null;
  openCount: number;
  doneCount: number;
  projects: Project[];
  noteCount: number;
}) {
  const pathname = usePathname();
  const activeProject = useSearchParams().get("project");
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/", label: "Home", icon: HomeIcon, count: undefined },
    { href: "/open", label: "Open taken", icon: ListIcon, count: openCount },
    { href: "/afgerond", label: "Afgeronde taken", icon: CheckCircleIcon, count: doneCount },
    { href: "/notities", label: "Notities", icon: NoteIcon, count: noteCount },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="icon-button fixed left-4 top-3 z-30 lg:hidden"
        aria-label="Menu openen"
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        // Op mobiel een uitschuifpaneel; vanaf lg staat hij op de achtergrond naast het paneel
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-page transition-transform duration-200 max-lg:shadow-pop lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            {/* Zelfde opmaak als de icoonvlakjes op Home: lichtgrijs met een dunne rand */}
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-ink-2 ring-1 ring-inset ring-line">
              <CheckCircleIcon width={17} height={17} strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Task Manager</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-2 lg:hidden"
            aria-label="Menu sluiten"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-0.5" onClick={() => setOpen(false)}>
            {nav.map(({ href, label, icon: Icon, count }) => (
              <NavLink
                key={href}
                href={href}
                // Op Home met ?project= is het project actief, niet Home
                active={pathname === href && (href !== "/" || !activeProject)}
                icon={<Icon />}
                label={label}
                count={count}
              />
            ))}
          </ul>

          <p className="px-3 pb-2 pt-7 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Projecten
          </p>
          <ul className="space-y-0.5" onClick={() => setOpen(false)}>
            {projects.map((p) => (
              <NavLink
                key={p.id}
                href={`/?project=${p.id}`}
                active={pathname === "/" && activeProject === p.id}
                icon={
                  <span className="grid h-[18px] w-[18px] place-items-center">
                    <ProjectDot color={p.color} />
                  </span>
                }
                label={p.name}
                count={p.openCount}
              />
            ))}
          </ul>
          <NewProject />
        </nav>

        {user && (
          <div className="m-3 flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 shadow-card">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-surface-2"
              />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-medium text-ink-2 ring-1 ring-inset ring-line">
                {user.initials}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-ink-3">{user.email}</p>
            </div>
            <form
              action={logout}
              // Eerst bevestigen; bij Annuleren gaat de form action niet door
              onSubmit={(e) => {
                if (!confirm("Weet je zeker dat je wilt uitloggen?")) e.preventDefault();
              }}
            >
              <button
                type="submit"
                title="Uitloggen"
                aria-label="Uitloggen"
                className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <LogoutIcon width={17} height={17} />
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}

function NavLink({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-lg px-3 py-[7px] text-sm transition-all ${
          active
            ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line"
            : "text-ink-2 hover:bg-surface/60 hover:text-ink"
        }`}
      >
        <span className={active ? "text-ink" : "text-ink-3 group-hover:text-ink-2"}>{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count ? (
          <span className="min-w-5 rounded-full bg-surface-2 px-1.5 py-px text-center text-[11px] font-medium tabular-nums text-ink-2 ring-1 ring-inset ring-line">
            {count}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function NewProject() {
  const [adding, setAdding] = useState(false);
  const [error, formAction, pending] = useActionState(createProject, null);

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-[7px] text-sm text-ink-3 hover:bg-surface/60 hover:text-ink-2"
      >
        <PlusIcon />
        Nieuw project
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-1 px-1">
      <input
        name="name"
        autoFocus
        required
        maxLength={60}
        placeholder="Naam van het project"
        aria-label="Naam van het project"
        disabled={pending}
        onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
        onBlur={(e) => !e.currentTarget.value && setAdding(false)}
        className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm outline-none placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft"
      />
      {error && <p className="px-1 pt-1.5 text-xs text-bad">{error}</p>}
      <p className="px-1 pt-1.5 text-[11px] text-ink-3">Enter om op te slaan, Esc om te annuleren</p>
    </form>
  );
}

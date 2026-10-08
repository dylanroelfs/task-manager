"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mailadres
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="naam@bedrijf.nl"
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-lg bg-ink text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Bezig met inloggen…" : "Inloggen"}
      </button>
    </form>
  );
}

import type { Metadata } from "next";
import { CheckCircleIcon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Inloggen · Task Manager",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-surface">
            <CheckCircleIcon width={20} height={20} />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Welkom terug</h1>
          <p className="mt-1.5 text-sm text-ink-2">Log in om naar je taken te gaan.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

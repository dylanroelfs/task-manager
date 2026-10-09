import type { Metadata } from "next";
import { CheckCircleIcon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Inloggen · Task Manager",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-ink-2 ring-1 ring-inset ring-line">
            <CheckCircleIcon width={21} height={21} strokeWidth={2} />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Welkom terug</h1>
          <p className="mt-1.5 text-sm text-ink-2">Log in om naar je taken te gaan.</p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

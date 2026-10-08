/** Profielfoto's per e-mailadres, uit public/avatars. Zonder foto tonen we initialen. */
const AVATARS: Record<string, string> = {
  "dylan@promptgorillas.com": "/avatars/dylan-full.jpg",
};

export function avatarOf(email: string): string | null {
  return AVATARS[email.toLowerCase()] ?? null;
}

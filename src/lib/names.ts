/** Volledige naam als die er is, anders het deel vóór de @ ("dylan@…" → "Dylan"). */
export function displayName(email: string, fullName?: unknown) {
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

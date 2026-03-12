export function initialsFromName(name) {
  if (!name) return "?";
  const trimmed = String(name).trim();
  if (!trimmed) return "?";
  const first = [...trimmed][0]; // unicode-safe
  return first.toUpperCase();
}

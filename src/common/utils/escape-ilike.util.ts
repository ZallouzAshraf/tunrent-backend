/** Escapes `%`, `_` and `\` for safe use inside SQL ILIKE patterns. */
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

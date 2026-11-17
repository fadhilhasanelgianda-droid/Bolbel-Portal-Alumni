const camelKey = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * snake_case row -> camelCase object matching the domain types:
 * timestamps become ISO strings, NULLs are omitted (domain types use optional fields).
 * jsonb values (e.g. profile_snapshot) are kept as stored, already camelCase.
 */
export function rowTo<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue;
    out[camelKey(k)] = v instanceof Date ? v.toISOString() : v;
  }
  return out as T;
}

export const rowsTo = <T>(rows: Record<string, unknown>[]): T[] => rows.map((r) => rowTo<T>(r));

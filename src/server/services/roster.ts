import { z } from 'zod';
import type { AlumniRosterEntry } from '../../domain/types.ts';
import { query, tx } from '../db.ts';
import { HttpError } from '../http.ts';
import { rowsTo } from '../mappers.ts';

export const rosterImportSchema = z.object({
  entries: z
    .array(
      z.object({
        email: z.string().trim().max(254).email().transform((e) => e.toLowerCase()),
        fullName: z.string().trim().min(1).max(200),
        program: z.string().trim().min(1).max(200),
        batch: z.string().trim().min(1).max(100),
        eligibility: z.enum(['eligible', 'pending', 'revoked']),
      })
    )
    .min(1)
    .max(1000),
});

export const eligibilitySchema = z.object({ eligibility: z.enum(['eligible', 'pending', 'revoked']) });

export async function listRoster(): Promise<AlumniRosterEntry[]> {
  const { rows } = await query('SELECT * FROM roster_entries ORDER BY invited_at DESC, email');
  return rowsTo<AlumniRosterEntry>(rows);
}

/** Inserts new emails, silently skipping ones already on the roster. Returns how many were added. */
export async function importRoster(input: z.infer<typeof rosterImportSchema>): Promise<{ added: number; skipped: number }> {
  const e = input.entries;
  const { rowCount } = await query(
    `INSERT INTO roster_entries (email, full_name, program, batch, eligibility)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
     ON CONFLICT ((lower(email))) DO NOTHING`,
    [e.map((x) => x.email), e.map((x) => x.fullName), e.map((x) => x.program), e.map((x) => x.batch), e.map((x) => x.eligibility)]
  );
  const added = rowCount ?? 0;
  return { added, skipped: e.length - added };
}

/**
 * Eligibility is the source of truth for who may use the portal: anything but 'eligible'
 * deactivates the linked account and ends its sessions immediately.
 */
export async function setEligibility(rosterId: string, eligibility: 'eligible' | 'pending' | 'revoked'): Promise<void> {
  await tx(async (client) => {
    const { rowCount } = await client.query('UPDATE roster_entries SET eligibility = $2 WHERE id = $1', [rosterId, eligibility]);
    if (!rowCount) throw new HttpError(404, 'Data roster tidak ditemukan.');
    await client.query('UPDATE users SET active = $2 WHERE roster_id = $1', [rosterId, eligibility === 'eligible']);
    if (eligibility !== 'eligible') {
      await client.query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE roster_id = $1)', [rosterId]);
    }
  });
}

import type { CVDocument } from '../../domain/types.ts';
import { query, tx } from '../db.ts';
import { HttpError } from '../http.ts';
import { rowsTo } from '../mappers.ts';

export async function listCvs(ownerId: string): Promise<CVDocument[]> {
  const { rows } = await query('SELECT * FROM cv_documents WHERE owner_id = $1 ORDER BY uploaded_at DESC', [ownerId]);
  return rowsTo<CVDocument>(rows);
}

export async function setActiveCv(ownerId: string, cvId: string): Promise<void> {
  await tx(async (client) => {
    const { rowCount } = await client.query('SELECT 1 FROM cv_documents WHERE id = $1 AND owner_id = $2 FOR UPDATE', [
      cvId,
      ownerId,
    ]);
    if (!rowCount) throw new HttpError(404, 'CV tidak ditemukan.');
    // Deactivate first: the partial unique index allows only one active CV per owner
    await client.query('UPDATE cv_documents SET is_current_active = false WHERE owner_id = $1 AND is_current_active', [
      ownerId,
    ]);
    await client.query('UPDATE cv_documents SET is_current_active = true WHERE id = $1', [cvId]);
  });
}

export async function deleteCv(ownerId: string, cvId: string): Promise<void> {
  // FK is ON DELETE RESTRICT: a CV used by any process/consent can't be deleted
  try {
    const { rowCount } = await query('DELETE FROM cv_documents WHERE id = $1 AND owner_id = $2', [cvId, ownerId]);
    if (!rowCount) throw new HttpError(404, 'CV tidak ditemukan.');
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '23001' || code === '23503') {
      throw new HttpError(409, 'CV ini sudah dipakai pada lamaran/persetujuan dan tidak dapat dihapus.');
    }
    throw err;
  }
}

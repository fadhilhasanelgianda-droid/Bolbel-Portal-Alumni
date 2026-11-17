import { randomUUID } from 'node:crypto';
import type { CVDocument } from '../../domain/types.ts';
import type { SessionUser } from '../auth.ts';
import { query, tx } from '../db.ts';
import { HttpError } from '../http.ts';
import { rowTo, rowsTo } from '../mappers.ts';
import { fileStorage } from '../storage.ts';

/**
 * Upload limit. The database allows 5 MB, but a Vercel Function rejects request bodies above 4.5 MB, so the real
 * ceiling for a server-side upload is just under that.
 */
export const MAX_CV_BYTES = 4 * 1024 * 1024;
/** Cap on stored versions per alumnus, so storage cannot grow without bound. */
export const MAX_CVS_PER_OWNER = 10;

export async function listCvs(ownerId: string): Promise<CVDocument[]> {
  const { rows } = await query('SELECT * FROM cv_documents WHERE owner_id = $1 ORDER BY uploaded_at DESC', [ownerId]);
  return rowsTo<CVDocument>(rows);
}

/** Admin view for candidate search: each alumnus's current active CV (the only one the UI uses). */
export async function listAllCvs(): Promise<CVDocument[]> {
  const { rows } = await query('SELECT * FROM cv_documents WHERE is_current_active ORDER BY uploaded_at DESC');
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
    const { rows } = await query('DELETE FROM cv_documents WHERE id = $1 AND owner_id = $2 RETURNING storage_key', [cvId, ownerId]);
    if (!rows[0]) throw new HttpError(404, 'CV tidak ditemukan.');
    // The row is gone either way; a leftover file is only wasted space, so don't fail the request over it
    await fileStorage().del(rows[0].storage_key).catch((e) => console.error('[storage] could not delete file:', e instanceof Error ? e.message : e));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '23001' || code === '23503') {
      throw new HttpError(409, 'CV ini sudah dipakai pada lamaran/persetujuan dan tidak dapat dihapus.');
    }
    throw err;
  }
}

/** "C:\\docs\\Budi CV (final).pdf" -> "Budi CV (final).pdf": no paths, no control characters, bounded length, always .pdf. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '').replace(/\s+/g, ' ').trim();
  const stem = cleaned.replace(/\.pdf$/i, '').slice(0, 100).trim() || 'CV';
  return `${stem}.pdf`;
}

/** Stores a PDF privately and makes it the owner's active CV. The file type is checked from the content, not the name. */
export async function uploadCv(user: SessionUser, originalName: string, bytes: Buffer): Promise<CVDocument> {
  if (bytes.length === 0) throw new HttpError(400, 'File kosong.');
  if (bytes.length > MAX_CV_BYTES) throw new HttpError(413, 'Ukuran file melebihi 4 MB.');
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw new HttpError(400, 'File harus berformat PDF.');

  const { rows: count } = await query('SELECT count(*)::int AS n FROM cv_documents WHERE owner_id = $1', [user.id]);
  if (count[0].n >= MAX_CVS_PER_OWNER) {
    throw new HttpError(409, `Maksimal ${MAX_CVS_PER_OWNER} versi CV. Hapus versi lama yang tidak terpakai dulu.`);
  }

  const storageKey = `cvs/${user.id}/${randomUUID()}.pdf`;
  const storage = fileStorage();
  await storage.put(storageKey, bytes, 'application/pdf');
  try {
    return await tx(async (client) => {
      // Deactivate first: the partial unique index allows only one active CV per owner
      await client.query('UPDATE cv_documents SET is_current_active = false WHERE owner_id = $1 AND is_current_active', [user.id]);
      const { rows } = await client.query(
        `INSERT INTO cv_documents (owner_id, file_name, file_size_bytes, file_type, is_current_active, storage_key)
         VALUES ($1,$2,$3,'application/pdf',true,$4) RETURNING *`,
        [user.id, cleanFileName(originalName), bytes.length, storageKey]
      );
      return rowTo<CVDocument>(rows[0]);
    });
  } catch (err) {
    await storage.del(storageKey).catch(() => undefined); // don't leave an orphan file behind
    throw err;
  }
}

/** Alumni can open their own CVs; admins can open any. Everyone else gets a 404, never a hint that the CV exists. */
export async function openCvFile(user: SessionUser, cvId: string) {
  const { rows } = await query('SELECT * FROM cv_documents WHERE id = $1', [cvId]);
  const cv = rows[0] ? rowTo<CVDocument>(rows[0]) : null;
  if (!cv || (user.role !== 'admin' && cv.ownerId !== user.id)) throw new HttpError(404, 'CV tidak ditemukan.');
  const file = await fileStorage().get(cv.storageKey);
  if (!file) throw new HttpError(404, 'File CV tidak ditemukan di penyimpanan. Unggah ulang CV-nya.');
  return { cv, file };
}

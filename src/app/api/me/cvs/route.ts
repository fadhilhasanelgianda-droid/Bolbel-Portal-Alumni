import { HttpError, created, route } from '@/server/http';
import { MAX_CV_BYTES, listCvs, uploadCv } from '@/server/services/cvs';

export const GET = route({ role: 'alumni' }, async ({ user }) => ({ cvs: await listCvs(user.id) }));

/** multipart/form-data with one PDF in the "file" field. Becomes the alumnus's active CV. */
export const POST = route({ role: 'alumni' }, async ({ user, req }) => {
  // Refuse oversized bodies before buffering them (multipart adds a little overhead on top of the file)
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_CV_BYTES + 64 * 1024) throw new HttpError(413, 'Ukuran file melebihi 4 MB.');

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'Pilih file PDF untuk diunggah.');
  const cv = await uploadCv(user, file.name, Buffer.from(await file.arrayBuffer()));
  return created({ cv });
});

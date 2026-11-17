export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** JSON fetch against our own API. Throws ApiError carrying the server's (Indonesian) message. */
export async function api<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Terjadi kesalahan. Coba lagi.');
  return data as T;
}

/** multipart upload (the browser sets the boundary header itself). Throws ApiError with the server's message. */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: 'POST', body: form, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Hosting platforms reject oversized bodies with a non-JSON 413 before our code runs
    if (res.status === 413) throw new ApiError(413, data?.error ?? 'Ukuran file melebihi 4 MB.');
    throw new ApiError(res.status, data?.error ?? 'Terjadi kesalahan. Coba lagi.');
  }
  return data as T;
}

/** Same-origin URL that streams a CV (access is checked on the server with the session cookie). */
export const cvDownloadUrl = (cvId: string): string => `/api/cvs/${encodeURIComponent(cvId)}/file`;

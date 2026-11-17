import { route } from '@/server/http';
import { openCvFile } from '@/server/services/cvs';

/** Streams a CV after checking access (own CV for alumni, any CV for admins). Never cached, never publicly addressable. */
export const GET = route<undefined, { id: string }>({}, async ({ user, params }) => {
  const { cv, file } = await openCvFile(user, params.id);
  const ascii = cv.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return new Response(file.stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cv.fileName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
});

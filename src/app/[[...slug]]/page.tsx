import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { TAB_PATH, resolveRoute } from '@/components/routes';

// One page serves every in-app URL (/lowongan, /lamaran/<id>, /admin/pipeline, ...). Auth and role checks happen in the
// client AuthGate/AppShell, so unknown paths 404 here and wrong-role paths are redirected there.
// Prerender the fixed pages so they are served from the CDN; /lamaran/<id> style URLs render on demand.
export function generateStaticParams() {
  return [{ slug: [] }, ...Object.values(TAB_PATH).map((path) => ({ slug: path.split('/').filter(Boolean) }))];
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (slug && slug.length > 0 && !resolveRoute(slug)) notFound();
  return <AppShell />;
}

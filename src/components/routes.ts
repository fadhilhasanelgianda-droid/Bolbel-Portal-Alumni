/**
 * URL <-> tab mapping for the signed-in app. Pure data, safe to import from server and client code.
 * Tab ids are the stable internal names; paths are what people see, bookmark and receive in emails.
 */
export type TabId =
  | 'jobs' | 'applications' | 'profile'
  | 'admin-dashboard' | 'admin-candidates' | 'admin-jobs' | 'admin-pipeline' | 'admin-tasks' | 'admin-import';

export const TAB_PATH: Record<TabId, string> = {
  jobs: '/lowongan',
  applications: '/lamaran',
  profile: '/profil',
  'admin-dashboard': '/admin',
  'admin-candidates': '/admin/kandidat',
  'admin-jobs': '/admin/lowongan',
  'admin-pipeline': '/admin/pipeline',
  'admin-tasks': '/admin/tindak-lanjut',
  'admin-import': '/admin/roster',
};

export const TAB_TITLE: Record<TabId, string> = {
  jobs: 'Lowongan Terkurasi',
  applications: 'Lamaran Saya',
  profile: 'Profil & CV Saya',
  'admin-dashboard': 'Ringkasan',
  'admin-candidates': 'Kandidat',
  'admin-jobs': 'Lowongan & Company',
  'admin-pipeline': 'Pipeline Proses',
  'admin-tasks': 'Tindak Lanjut',
  'admin-import': 'Roster & Privasi',
};

export const ADMIN_TABS: TabId[] = ['admin-dashboard', 'admin-candidates', 'admin-jobs', 'admin-pipeline', 'admin-tasks', 'admin-import'];
export const ALUMNI_TABS: TabId[] = ['jobs', 'applications', 'profile'];

export const homeTab = (role: 'admin' | 'alumni'): TabId => (role === 'admin' ? 'admin-dashboard' : 'jobs');
export const homePath = (role: 'admin' | 'alumni'): string => TAB_PATH[homeTab(role)];
export const tabsFor = (role: 'admin' | 'alumni'): TabId[] => (role === 'admin' ? ADMIN_TABS : ALUMNI_TABS);

/** Tabs whose URL may carry one process id: /lamaran/<id> and /admin/pipeline/<id>. */
const DETAIL_TABS = new Set<TabId>(['applications', 'admin-pipeline']);

export const processPath = (tab: 'applications' | 'admin-pipeline', id: string): string => `${TAB_PATH[tab]}/${encodeURIComponent(id)}`;

const BY_PATH = new Map<string, TabId>((Object.entries(TAB_PATH) as [TabId, string][]).map(([tab, path]) => [path, tab]));

export interface Route {
  tab: TabId;
  /** Process id from a detail URL, if any. */
  processId?: string;
}

/** Resolves URL segments (['admin','pipeline','<id>']) to a route, or null when the path is unknown. */
export function resolveRoute(segments: readonly string[] | undefined): Route | null {
  const parts = (segments ?? []).filter(Boolean);
  const tab = BY_PATH.get('/' + parts.join('/'));
  if (tab) return { tab };
  const last = parts[parts.length - 1];
  const base = BY_PATH.get('/' + parts.slice(0, -1).join('/'));
  if (base && DETAIL_TABS.has(base) && last) {
    try {
      return { tab: base, processId: decodeURIComponent(last) };
    } catch {
      return null;
    }
  }
  return null;
}

/** Same as resolveRoute but takes a pathname like "/lamaran/abc". The bare root resolves to an empty route list. */
export const resolvePathname = (pathname: string): Route | null => resolveRoute(pathname.split('/'));

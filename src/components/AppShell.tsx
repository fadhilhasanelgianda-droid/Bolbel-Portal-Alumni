'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDataStore } from '../domain/dataStore.tsx';
import { AuthGate } from './auth/AuthGate.tsx';
import { Navbar } from './Navbar.tsx';
import { JobList } from './alumni/JobList.tsx';
import { MyApplications } from './alumni/MyApplications.tsx';
import { ProfileAndCV } from './alumni/ProfileAndCV.tsx';
import { AdminDashboard } from './admin/AdminDashboard.tsx';
import { CandidateSearch } from './admin/CandidateSearch.tsx';
import { JobManagement } from './admin/JobManagement.tsx';
import { ProcessPipeline } from './admin/ProcessPipeline.tsx';
import { FollowUpTasks } from './admin/FollowUpTasks.tsx';
import { DataImportAndAudit } from './admin/DataImportAndAudit.tsx';
import { type TabId, TAB_PATH, TAB_TITLE, homePath, homeTab, resolvePathname, tabsFor } from './routes.ts';

const AppContent: React.FC = () => {
  const { currentUser } = useDataStore();
  const router = useRouter();
  const pathname = usePathname();

  const route = resolvePathname(pathname);
  const allowed = route !== null && tabsFor(currentUser.role).includes(route.tab);
  const currentTab: TabId = allowed ? route.tab : homeTab(currentUser.role);
  const processId = allowed ? route?.processId : undefined;
  const go = (tab: TabId) => router.push(TAB_PATH[tab]);

  // "/" (and another role's pages) land on this user's home page. Keep the query string: "/?reset=..." links still work.
  useEffect(() => {
    if (!allowed && !window.location.search) router.replace(homePath(currentUser.role));
  }, [allowed, currentUser.role, router]);

  useEffect(() => {
    document.title = `${TAB_TITLE[currentTab]} · Portal Karier Alumni Boleh Belajar`;
  }, [currentTab]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7] text-[#242424]">
      {/* Navigation Bar */}
      <Navbar currentTab={currentTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alumni Views */}
        {currentTab === 'jobs' && <JobList onGoToProfile={() => go('profile')} onGoToApplications={() => go('applications')} />}
        {currentTab === 'applications' && <MyApplications routeProcessId={processId} />}
        {currentTab === 'profile' && <ProfileAndCV />}

        {/* Admin Views */}
        {currentTab === 'admin-dashboard' && <AdminDashboard onNavigate={(tabId) => go(tabId as TabId)} />}
        {currentTab === 'admin-candidates' && <CandidateSearch />}
        {currentTab === 'admin-jobs' && <JobManagement />}
        {currentTab === 'admin-pipeline' && <ProcessPipeline routeProcessId={processId} />}
        {currentTab === 'admin-tasks' && <FollowUpTasks />}
        {currentTab === 'admin-import' && <DataImportAndAudit />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#D9D9D9] bg-white py-6 text-xs text-[#595959]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#BD214C]">Boleh Belajar</span>
            <span>•</span>
            <span>Portal Karier Alumni</span>
          </div>

          <div className="text-xs">
            <span>Butuh bantuan? Hubungi talent@bolehbelajar.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function AppShell() {
  return (
    <AuthGate>
      <AppContent />
    </AuthGate>
  );
}

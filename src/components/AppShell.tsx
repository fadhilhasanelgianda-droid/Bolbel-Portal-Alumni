'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { DataStoreProvider, useDataStore } from '../domain/dataStore.tsx';
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
import { ShieldCheck, Heart, Mail } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser } = useDataStore();
  const [currentTab, setCurrentTab] = useState<string>(() =>
    currentUser.role === 'admin' ? 'admin-dashboard' : 'jobs'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7] text-[#242424]">
      {/* Navigation Bar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alumni Views */}
        {currentTab === 'jobs' && <JobList />}
        {currentTab === 'applications' && <MyApplications />}
        {currentTab === 'profile' && <ProfileAndCV />}

        {/* Admin Views */}
        {currentTab === 'admin-dashboard' && (
          <AdminDashboard onNavigate={(tabId) => setCurrentTab(tabId)} />
        )}
        {currentTab === 'admin-candidates' && <CandidateSearch />}
        {currentTab === 'admin-jobs' && <JobManagement />}
        {currentTab === 'admin-pipeline' && <ProcessPipeline />}
        {currentTab === 'admin-tasks' && <FollowUpTasks />}
        {currentTab === 'admin-import' && <DataImportAndAudit />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#D9D9D9] bg-white py-6 text-xs text-[#595959]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#BD214C]">Boleh Belajar</span>
            <span>•</span>
            <span>Portal Karier Alumni MVP v1.0</span>
            <span>•</span>
            <span className="hidden md:inline">Gifari Talent Management System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Hubungi Talent Lead: talent@bolehbelajar.com</span>
            <span>•</span>
            <span className="text-stone-400">Palet Resmi: #BD214C, #EA5543, #F9EDDE</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const subscribeNoop = () => () => {};

export function AppShell() {
  // The prototype store reads localStorage on init, so only render after hydration
  // to avoid a server/client mismatch. Goes away once the store talks to the API.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!mounted) return null;
  return (
    <DataStoreProvider>
      <AppContent />
    </DataStoreProvider>
  );
}

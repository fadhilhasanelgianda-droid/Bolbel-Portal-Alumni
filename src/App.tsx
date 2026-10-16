import React, { useState } from 'react';
import { DataStoreProvider, useDataStore } from './domain/dataStore.tsx';
import { Navbar } from './components/Navbar.tsx';
import { JobList } from './components/alumni/JobList.tsx';
import { MyApplications } from './components/alumni/MyApplications.tsx';
import { ProfileAndCV } from './components/alumni/ProfileAndCV.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { CandidateSearch } from './components/admin/CandidateSearch.tsx';
import { JobManagement } from './components/admin/JobManagement.tsx';
import { ProcessPipeline } from './components/admin/ProcessPipeline.tsx';
import { FollowUpTasks } from './components/admin/FollowUpTasks.tsx';
import { DataImportAndAudit } from './components/admin/DataImportAndAudit.tsx';
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

export default function App() {
  return (
    <DataStoreProvider>
      <AppContent />
    </DataStoreProvider>
  );
}

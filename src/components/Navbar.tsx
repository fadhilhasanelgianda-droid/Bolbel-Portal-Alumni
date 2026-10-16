import React, { useState } from 'react';
import {
  Briefcase,
  UserCheck,
  FileText,
  LayoutDashboard,
  Users,
  Building2,
  GitPullRequest,
  CheckSquare,
  UploadCloud,
  ChevronDown,
  Menu,
  X,
  Bell,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useDataStore } from '../domain/dataStore.tsx';
import type { UserRole } from '../domain/types.ts';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { currentUser, switchUserRole, users, processes, tasks, resetAllToSeed } = useDataStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Unread/action counts
  const pendingProposalsCount = processes.filter(
    (p) => p.alumniId === currentUser.id && p.currentStage === 'menunggu_persetujuan' && p.outcome === 'aktif'
  ).length;

  const urgentAdminTasksCount = tasks.filter(
    (t) => t.status === 'pending' && new Date(t.dueAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000
  ).length;

  const alumniTabs = [
    { id: 'jobs', label: 'Lowongan Terkurasi', icon: Briefcase },
    {
      id: 'applications',
      label: 'Lamaran Saya',
      icon: FileText,
      badge: pendingProposalsCount > 0 ? pendingProposalsCount : undefined,
    },
    { id: 'profile', label: 'Profil & CV Saya', icon: UserCheck },
  ];

  const adminTabs = [
    { id: 'admin-dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'admin-candidates', label: 'Kandidat', icon: Users },
    { id: 'admin-jobs', label: 'Lowongan & Company', icon: Building2 },
    { id: 'admin-pipeline', label: 'Pipeline Proses', icon: GitPullRequest },
    {
      id: 'admin-tasks',
      label: 'Tindak Lanjut',
      icon: CheckSquare,
      badge: urgentAdminTasksCount > 0 ? urgentAdminTasksCount : undefined,
    },
    { id: 'admin-import', label: 'Impor & Privasi', icon: UploadCloud },
  ];

  const currentTabs = currentUser.role === 'admin' ? adminTabs : alumniTabs;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#D9D9D9] shadow-xs">
      {/* Top Banner for Demo & Role Notice */}
      <div className="bg-[#F9EDDE] text-[#242424] px-4 py-1.5 text-xs font-medium border-b border-[#E8D6BF] flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#BD214C]/10 text-[#BD214C] font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" /> MVP Prototype
          </span>
          <span className="hidden sm:inline text-[#595959]">
            Portal Karier Alumni Boleh Belajar — Beroperasi dengan 2 peran: Alumni & Admin (Gifari).
          </span>
          <button
            onClick={resetAllToSeed}
            className="ml-auto flex items-center gap-1 text-[11px] text-[#595959] hover:text-[#BD214C] underline transition-colors"
            title="Kembalikan data ke kondisi awal"
          >
            <RefreshCw className="w-3 h-3" /> Reset Data Demo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab(currentUser.role === 'admin' ? 'admin-dashboard' : 'jobs')}
              className="flex items-center gap-2.5 text-left focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-[#BD214C] flex items-center justify-center text-white font-bold text-lg shadow-xs">
                BB
              </div>
              <div>
                <span className="font-bold text-[#BD214C] text-lg leading-tight tracking-tight block">
                  Boleh Belajar
                </span>
                <span className="text-[11px] text-[#595959] tracking-wider uppercase font-semibold block">
                  Portal Karier Alumni
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {currentTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#BD214C] text-white shadow-xs'
                      : 'text-[#595959] hover:text-[#242424] hover:bg-[#F7F7F7]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#595959]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                        isActive ? 'bg-white text-[#BD214C]' : 'bg-[#EA5543] text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Role Switcher & Profile */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#D9D9D9] bg-white hover:border-[#BD214C] transition-colors text-left"
                aria-haspopup="true"
                aria-expanded={roleDropdownOpen}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentUser.role === 'admin'
                      ? 'bg-[#EA5543] text-white'
                      : 'bg-[#BD214C]/10 text-[#BD214C]'
                  }`}
                >
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-[#242424] leading-tight flex items-center gap-1.5">
                    {currentUser.fullName}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider ${
                        currentUser.role === 'admin'
                          ? 'bg-[#EA5543] text-white'
                          : 'bg-[#BD214C] text-white'
                      }`}
                    >
                      {currentUser.role === 'admin' ? 'Admin' : 'Alumni'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#595959] truncate max-w-[140px]">{currentUser.email}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#595959]" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-[#D9D9D9] shadow-lg py-2 z-50">
                  <div className="px-3 py-2 border-b border-[#D9D9D9] bg-[#F7F7F7]">
                    <div className="text-xs font-semibold text-[#595959] uppercase tracking-wider">
                      Simulasi Sesi Pengguna
                    </div>
                    <div className="text-xs text-[#242424] mt-0.5">
                      Pilih peran untuk menguji pengalaman aplikasi:
                    </div>
                  </div>

                  <div className="p-1 space-y-1">
                    {users.map((u) => {
                      const isCurrent = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUserRole(u.role, u.id);
                            setRoleDropdownOpen(false);
                            if (u.role === 'admin') {
                              setCurrentTab('admin-dashboard');
                            } else {
                              setCurrentTab('jobs');
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                            isCurrent
                              ? 'bg-[#F9EDDE] text-[#242424] font-semibold'
                              : 'hover:bg-[#F7F7F7] text-[#595959]'
                          }`}
                        >
                          <div>
                            <div className="font-medium text-[#242424] flex items-center gap-1.5">
                              {u.fullName}
                              {isCurrent && <span className="text-[10px] text-[#BD214C]">✓ Aktif</span>}
                            </div>
                            <div className="text-[11px] text-[#595959]">{u.email}</div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-[#EA5543] text-white' : 'bg-[#BD214C] text-white'
                            }`}
                          >
                            {u.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7]"
              aria-label="Buka menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#D9D9D9] bg-white px-4 pt-2 pb-4 space-y-1">
          {currentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#BD214C] text-white' : 'text-[#595959] hover:bg-[#F7F7F7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EA5543] text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

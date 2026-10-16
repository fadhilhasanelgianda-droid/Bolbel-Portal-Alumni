'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  X,
  Filter,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import type { FollowUpTask, FollowUpTaskType } from '../../domain/types.ts';
import { formatDateIndo } from '../../domain/stateMachine.ts';

export const FollowUpTasks: React.FC = () => {
  const { tasks, toggleTaskStatus, createFollowUpTask } = useDataStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'due_today' | 'overdue' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<FollowUpTaskType>('followup_company');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newOwner, setNewOwner] = useState('Gifari');

  const nowTime = Date.now();

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'completed') return t.status === 'completed';
    if (t.status === 'completed') return activeFilter === 'all';

    const isOverdue = new Date(t.dueAt).getTime() < nowTime;
    const diffHours = (new Date(t.dueAt).getTime() - nowTime) / (1000 * 60 * 60);
    const isDueToday = diffHours >= 0 && diffHours <= 24;

    if (activeFilter === 'overdue') return isOverdue;
    if (activeFilter === 'due_today') return isDueToday;
    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    createFollowUpTask({
      title: newTitle,
      description: newDesc,
      taskType: newType,
      ownerName: newOwner,
      dueAt: newDueDate,
    });

    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Daftar Tugas Tindak Lanjut (Follow-Up Tasks)
          </h1>
          <p className="text-xs sm:text-sm text-[#595959] mt-0.5">
            Default operasional Gifari: Review lamaran baru maksimal 2 hari kerja, dan follow-up progres company tiap
            7 hari kalender.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tambah Tugas
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
            activeFilter === 'all'
              ? 'bg-[#BD214C] text-white border-[#BD214C]'
              : 'bg-white text-[#595959] border-[#D9D9D9] hover:bg-[#F7F7F7]'
          }`}
        >
          Semua ({tasks.length})
        </button>
        <button
          onClick={() => setActiveFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
            activeFilter === 'overdue'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
          }`}
        >
          Terlambat ({tasks.filter((t) => t.status === 'pending' && new Date(t.dueAt).getTime() < nowTime).length})
        </button>
        <button
          onClick={() => setActiveFilter('due_today')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
            activeFilter === 'due_today'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
          }`}
        >
          Jatuh Tempo Hari Ini (
          {
            tasks.filter((t) => {
              if (t.status !== 'pending') return false;
              const diffHours = (new Date(t.dueAt).getTime() - nowTime) / (1000 * 60 * 60);
              return diffHours >= 0 && diffHours <= 24;
            }).length
          }
          )
        </button>
        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
            activeFilter === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          Selesai ({tasks.filter((t) => t.status === 'completed').length})
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl border border-[#D9D9D9] divide-y divide-[#D9D9D9] shadow-xs">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#595959] italic">
            Tidak ada tugas yang sesuai pada filter ini.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = !isCompleted && new Date(task.dueAt).getTime() < nowTime;

            return (
              <div
                key={task.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  isCompleted ? 'bg-stone-50/70 opacity-70' : 'hover:bg-[#F9EDDE]/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => toggleTaskStatus(task.id)}
                    className="mt-1 w-4 h-4 rounded text-[#BD214C] focus:ring-[#BD214C] border-[#D9D9D9] cursor-pointer"
                  />
                  <div>
                    <h3
                      className={`text-sm font-bold text-[#242424] leading-snug ${
                        isCompleted ? 'line-through text-[#595959]' : ''
                      }`}
                    >
                      {task.title}
                    </h3>
                    <p className="text-xs text-[#595959] mt-0.5">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-[#F7F7F7] border border-[#D9D9D9] text-[#242424] font-medium uppercase">
                        {task.taskType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[#595959]">Penanggung Jawab: {task.ownerName}</span>
                      {isCompleted && task.completedAt && (
                        <span className="text-emerald-700 font-semibold">
                          ✓ Selesai pada {formatDateIndo(task.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isCompleted ? 'Selesai' : isOverdue ? 'Terlambat' : 'Jatuh Tempo'}
                  </span>
                  <div className="text-[11px] text-[#595959] mt-1 flex items-center justify-end gap-1">
                    <Calendar className="w-3 h-3" /> {formatDateIndo(task.dueAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-lg text-[#595959] hover:bg-[#F7F7F7]"
              aria-label="Tutup form tugas baru"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-[#BD214C] uppercase tracking-wider">
                Tugas Follow-Up Baru (FR09)
              </span>
              <h3 className="text-lg font-bold text-[#242424] mt-0.5">Tambah Catatan Tugas Admin</h3>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="create-task-title" className="block font-bold text-[#242424] mb-1">
                  Judul Tugas <span className="text-[#BD214C]">*</span>
                </label>
                <input
                  id="create-task-title"
                  type="text"
                  required
                  placeholder="Contoh: Follow-up hasil screening ke HR Tiket.com"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div>
                <label htmlFor="create-task-desc" className="block font-bold text-[#242424] mb-1">Deskripsi &amp; Tindakan</label>
                <textarea
                  id="create-task-desc"
                  rows={2}
                  placeholder="Detail yang perlu dicek atau ditanyakan..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-task-type" className="block font-bold text-[#242424] mb-1">Tipe Tugas</label>
                  <select
                    id="create-task-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as FollowUpTaskType)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-white text-[#242424]"
                  >
                    <option value="followup_company">Follow-up Company</option>
                    <option value="review_new_application">Review Lamaran Masuk</option>
                    <option value="forward_cv">Kirimkan CV ke HR</option>
                    <option value="monitor_consent">Pantau Izin Alumni</option>
                    <option value="review_alumni_report">Review Laporan Alumni</option>
                    <option value="closed_job_cleanup">Penutupan Lowongan</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-task-duedate" className="block font-bold text-[#242424] mb-1">
                    Batas Waktu (Due Date) <span className="text-[#BD214C]">*</span>
                  </label>
                  <input
                    id="create-task-duedate"
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9D9D9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D9D9D9] text-xs font-semibold text-[#595959]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold shadow-xs"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

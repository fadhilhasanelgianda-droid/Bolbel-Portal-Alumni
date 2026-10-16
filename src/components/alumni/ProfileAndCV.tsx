'use client';

import React, { useState, useRef } from 'react';
import {
  User,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  ShieldCheck,
  Download,
  Trash2,
  Calendar,
  Phone,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { useDataStore } from '../../domain/dataStore.tsx';
import type {
  EmploymentStatus,
  OpennessStatus,
  StartReadiness,
  ExperienceBand,
  WorkType,
  WorkModel,
  AlumniProfile,
} from '../../domain/types.ts';
import { isProfileFresh, formatDateIndo } from '../../domain/stateMachine.ts';

export const ProfileAndCV: React.FC = () => {
  const {
    currentUser,
    currentProfile,
    updateProfile,
    confirmAvailability,
    cvs,
    activeCv,
    uploadCV,
    setActiveCV,
    deleteCV,
  } = useDataStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Profile form state
  const [formData, setFormData] = useState<AlumniProfile>(() => {
    if (currentProfile) return { ...currentProfile };
    return {
      userId: currentUser.id,
      fullName: currentUser.fullName,
      email: currentUser.email,
      phone: '',
      whatsappContact: true,
      linkedinUrl: '',
      portfolioUrl: '',
      program: 'Full Course',
      batch: 'Batch 10',
      employmentStatus: 'belum_bekerja',
      opennessStatus: 'aktif_mencari',
      startReadiness: 'segera',
      targetRoles: ['Digital Marketing Specialist'],
      targetWorkTypes: ['full_time'],
      targetWorkModels: ['hybrid', 'remote'],
      domicile: 'Jakarta Selatan',
      targetLocations: ['Jakarta'],
      experienceBand: '1-2_tahun',
      allowProactiveContact: true,
      availabilityConfirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Freshness check (PRD FR02: > 30 days triggers "Perlu konfirmasi")
  const freshness = isProfileFresh(currentProfile?.availabilityConfirmedAt);
  const userCvs = cvs.filter((c) => c.ownerId === currentUser.id);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const res = await uploadCV(file);
      if (res.success) {
        setUploadSuccess(`CV "${file.name}" berhasil diunggah dan diset sebagai CV aktif.`);
      } else {
        setUploadError(res.error || 'Gagal mengunggah CV.');
      }
    } catch {
      setUploadError('Terjadi kendala saat upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleQuickConfirmAvailability = () => {
    confirmAvailability(currentUser.id);
    setFormData((prev) => ({
      ...prev,
      availabilityConfirmedAt: new Date().toISOString(),
    }));
  };

  const handleAddRole = () => {
    if (roleInput.trim() && !formData.targetRoles.includes(roleInput.trim())) {
      setFormData({
        ...formData,
        targetRoles: [...formData.targetRoles, roleInput.trim()],
      });
      setRoleInput('');
    }
  };

  const handleRemoveRole = (role: string) => {
    setFormData({
      ...formData,
      targetRoles: formData.targetRoles.filter((r) => r !== role),
    });
  };

  const handleAddLocation = () => {
    if (locationInput.trim() && !formData.targetLocations.includes(locationInput.trim())) {
      setFormData({
        ...formData,
        targetLocations: [...formData.targetLocations, locationInput.trim()],
      });
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setFormData({
      ...formData,
      targetLocations: formData.targetLocations.filter((l) => l !== loc),
    });
  };

  const toggleWorkType = (type: WorkType) => {
    const exists = formData.targetWorkTypes.includes(type);
    setFormData({
      ...formData,
      targetWorkTypes: exists
        ? formData.targetWorkTypes.filter((t) => t !== type)
        : [...formData.targetWorkTypes, type],
    });
  };

  const toggleWorkModel = (model: WorkModel) => {
    const exists = formData.targetWorkModels.includes(model);
    setFormData({
      ...formData,
      targetWorkModels: exists
        ? formData.targetWorkModels.filter((m) => m !== model)
        : [...formData.targetWorkModels, model],
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Availability Confirmation Banner (FR02) */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          freshness.isFresh
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-amber-50 border-amber-300 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                freshness.isFresh ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {freshness.isFresh ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#242424]">
                  Status Kesegaran Ketersediaan Alumni
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    freshness.isFresh
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-200 text-amber-900 animate-pulse'
                  }`}
                >
                  {freshness.isFresh ? 'Ketersediaan Segar' : 'Perlu Konfirmasi'}
                </span>
              </div>
              <p className="text-xs text-[#595959] mt-0.5 leading-relaxed">
                {freshness.isFresh
                  ? `Terakhir dikonfirmasi ${freshness.daysAgo} hari yang lalu (${formatDateIndo(
                      currentProfile?.availabilityConfirmedAt
                    )}). Profilmu aktif diprioritaskan saat pencarian talent.`
                  : `Sudah ${freshness.daysAgo} hari kamu belum mengonfirmasi ketersediaan kerja. Harap perbarui agar tim BolBel mengetahui status ketersediaanmu.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleQuickConfirmAvailability}
            className="self-start sm:self-auto px-4 py-2 bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold rounded-lg transition-all shadow-xs shrink-0"
          >
            Konfirmasi Ketersediaan Sekarang
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: CV Management (FR03) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-[#D9D9D9] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#242424]">Pengelolaan CV Berversi</h3>
                <p className="text-xs text-[#595959]">
                  Dokumen privat (PDF maks 5 MB). Penggantian CV tidak mengubah versi pada lamaran yang sudah dikirim.
                </p>
              </div>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D9D9D9] hover:border-[#BD214C] rounded-xl p-5 text-center cursor-pointer bg-[#F7F7F7] hover:bg-white transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-[#595959] group-hover:text-[#BD214C] mx-auto mb-2 transition-colors" />
              <div className="text-xs font-bold text-[#242424]">
                {isUploading ? 'Sedang Memeriksa File...' : 'Klik untuk Unggah CV Baru'}
              </div>
              <p className="text-[11px] text-[#595959] mt-0.5">Format PDF saja, maksimal 5 MB</p>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* List of CV Versions */}
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#595959] block">
                Daftar Versi CV ({userCvs.length})
              </span>

              {userCvs.length === 0 ? (
                <div className="text-xs text-[#595959] italic py-2">Belum ada CV yang diunggah.</div>
              ) : (
                userCvs.map((cv) => (
                  <div
                    key={cv.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      cv.isCurrentActive
                        ? 'bg-white border-[#BD214C] shadow-xs ring-1 ring-[#BD214C]'
                        : 'bg-[#F7F7F7] border-[#D9D9D9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <FileText
                        className={`w-4 h-4 shrink-0 ${cv.isCurrentActive ? 'text-[#BD214C]' : 'text-[#595959]'}`}
                      />
                      <div className="truncate">
                        <div className="font-bold text-[#242424] truncate">{cv.fileName}</div>
                        <div className="text-[11px] text-[#595959]">
                          {(cv.fileSizeBytes / 1024 / 1024).toFixed(2)} MB • {formatDateIndo(cv.uploadedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {cv.isCurrentActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#BD214C] text-white">
                          Aktif
                        </span>
                      ) : (
                        <button
                          onClick={() => setActiveCV(cv.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border border-[#D9D9D9] hover:border-[#BD214C] text-[#242424]"
                        >
                          Pilih Aktif
                        </button>
                      )}

                      <button
                        onClick={() => alert(`Simulasi unduh privat untuk ${cv.fileName} (Link berlaku 5 menit)`)}
                        title="Unduh CV (URL Privat berlaku 5 menit)"
                        className="p-1 text-[#595959] hover:text-[#BD214C]"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {!cv.isCurrentActive && (
                        <button
                          onClick={() => deleteCV(cv.id)}
                          title="Hapus versi lama"
                          className="p-1 text-[#595959] hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preferences & Career Profile Form (FR02) */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-xl border border-[#D9D9D9] p-6 shadow-xs space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D9]">
              <div>
                <h3 className="text-lg font-bold text-[#242424]">Profil & Preferensi Karier</h3>
                <p className="text-xs text-[#595959]">
                  Digunakan untuk verifikasi ketersediaan dan kriteria pencarian kandidat oleh admin.
                </p>
              </div>

              {saveSuccess && (
                <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
                </span>
              )}
            </div>

            {/* Identitas Terverifikasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#242424] mb-1">Nama Lengkap (Dari Roster)</label>
                <input
                  type="text"
                  value={formData.fullName}
                  disabled
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] text-[#595959] cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-bold text-[#242424] mb-1">Email Terverifikasi</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] text-[#595959] cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-bold text-[#242424] mb-1">Program & Batch</label>
                <input
                  type="text"
                  value={`${formData.program} - ${formData.batch}`}
                  disabled
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] text-[#595959] cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="user-phone" className="block font-bold text-[#242424] mb-1">Nomor WhatsApp</label>
                <input
                  id="user-phone"
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                />
              </div>
            </div>

            {/* Status Bekerja & Keterbukaan Peluang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-[#F7F7F7]">
              <div>
                <label htmlFor="employment-status-select" className="block font-bold text-[#242424] mb-1">
                  Status Bekerja Saat Ini <span className="text-[#BD214C]">*</span>
                </label>
                <select
                  id="employment-status-select"
                  value={formData.employmentStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, employmentStatus: e.target.value as EmploymentStatus })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                >
                  <option value="belum_bekerja">Belum Bekerja</option>
                  <option value="bekerja">Sedang Bekerja</option>
                  <option value="tidak_disebutkan">Tidak Ingin Menyebutkan</option>
                </select>
              </div>

              <div>
                <label htmlFor="openness-status-select" className="block font-bold text-[#242424] mb-1">
                  Keterbukaan Terhadap Peluang <span className="text-[#BD214C]">*</span>
                </label>
                <select
                  id="openness-status-select"
                  value={formData.opennessStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, opennessStatus: e.target.value as OpennessStatus })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                >
                  <option value="aktif_mencari">Aktif Mencari Peluang</option>
                  <option value="terbuka">Terbuka Jika Ada yang Sesuai</option>
                  <option value="tidak_mencari">Tidak Sedang Mencari</option>
                </select>
              </div>

              <div>
                <label htmlFor="start-readiness-select" className="block font-bold text-[#242424] mb-1">
                  Kesiapan Mulai Bekerja <span className="text-[#BD214C]">*</span>
                </label>
                <select
                  id="start-readiness-select"
                  value={formData.startReadiness}
                  onChange={(e) =>
                    setFormData({ ...formData, startReadiness: e.target.value as StartReadiness })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                >
                  <option value="segera">Segera (Immediate)</option>
                  <option value="notice_period">Perlu Notice Period</option>
                  <option value="diskusi">Perlu Diskusi Lebih Lanjut</option>
                </select>
              </div>

              <div>
                <label htmlFor="experience-band-select" className="block font-bold text-[#242424] mb-1">Pengalaman Relevan yang Dilaporkan</label>
                <select
                  id="experience-band-select"
                  value={formData.experienceBand}
                  onChange={(e) =>
                    setFormData({ ...formData, experienceBand: e.target.value as ExperienceBand })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] bg-white focus:outline-hidden focus:border-[#BD214C]"
                >
                  <option value="<1_tahun">&lt; 1 Tahun / Fresh Graduate</option>
                  <option value="1-2_tahun">1 - 2 Tahun</option>
                  <option value="2-4_tahun">2 - 4 Tahun</option>
                  <option value=">4_tahun">&gt; 4 Tahun</option>
                </select>
              </div>
            </div>

            {/* Target Role & Preferensi */}
            <div className="space-y-4 pt-2 border-t border-[#F7F7F7] text-xs">
              <div>
                <label htmlFor="target-role-input" className="block font-bold text-[#242424] mb-1">Target Posisi / Role</label>
                <div className="flex gap-2">
                  <input
                    id="target-role-input"
                    type="text"
                    placeholder="Contoh: Performance Marketing Specialist"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                    className="flex-1 p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    className="px-4 py-2 bg-[#BD214C] text-white rounded-lg font-bold"
                  >
                    Tambah
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.targetRoles.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-md bg-[#F9EDDE] border border-[#EADBCE] text-[#242424] font-medium flex items-center gap-1.5"
                    >
                      {r}
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(r)}
                        className="text-[#595959] hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Work Models */}
              <div>
                <label className="block font-bold text-[#242424] mb-1">Model Kerja yang Dipertimbangkan</label>
                <div className="flex flex-wrap gap-2">
                  {(['wfo', 'hybrid', 'remote'] as WorkModel[]).map((m) => {
                    const active = formData.targetWorkModels.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleWorkModel(m)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase ${
                          active
                            ? 'bg-[#BD214C] text-white border-[#BD214C]'
                            : 'bg-white text-[#595959] border-[#D9D9D9]'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Domicile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="user-domicile" className="block font-bold text-[#242424] mb-1">Domisili Saat Ini <span className="text-[#BD214C]">*</span></label>
                  <input
                    id="user-domicile"
                    type="text"
                    value={formData.domicile}
                    onChange={(e) => setFormData({ ...formData, domicile: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="linkedin-url-input" className="block font-bold text-[#242424] mb-1">Tautan LinkedIn (Opsional)</label>
                  <input
                    id="linkedin-url-input"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedinUrl || ''}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[#D9D9D9] text-[#242424] focus:outline-hidden focus:border-[#BD214C]"
                  />
                </div>
              </div>

              {/* Proactive Contact Toggle (FR07) */}
              <div className="p-3.5 rounded-xl border border-[#D9D9D9] bg-[#F7F7F7]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowProactiveContact}
                    onChange={(e) => setFormData({ ...formData, allowProactiveContact: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-[#BD214C] focus:ring-[#BD214C] border-[#D9D9D9]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#242424] block">
                      Izinkan Penawaran Peluang Proaktif dari Tim BolBel (FR07)
                    </span>
                    <span className="text-[#595959] block mt-0.5">
                      Jika aktif, Gifari dapat merekomendasikan profilmu ke lowongan yang relevan. Setiap rekomendasi
                      tetap membutuhkan persetujuan aktifmu sebelum CV diteruskan ke company.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-[#D9D9D9] flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#BD214C] hover:bg-[#a61b42] text-white text-xs font-bold transition-all shadow-xs"
              >
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

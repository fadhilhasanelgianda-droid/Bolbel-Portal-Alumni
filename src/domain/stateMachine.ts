/**
 * Domain Logic & Validation Rules for Portal Karier Alumni Boleh Belajar
 * Compliant with PRD v1.0
 */

import type {
  SelectionStage,
  ProcessOutcome,
  Job,
  AlumniProfile,
  CVDocument,
  CandidateProcess,
  ApplyChannel,
  CsvRosterImportRow,
} from './types.ts';

export const STAGE_CONFIG: Record<
  SelectionStage,
  { label: string; description: string; stepOrder: number }
> = {
  menunggu_persetujuan: {
    label: 'Menunggu Persetujuan',
    description: 'Admin mengajukan peluang; menunggu persetujuan alumni sebelum CV diteruskan.',
    stepOrder: 1,
  },
  masuk_bolbel: {
    label: 'Masuk BolBel',
    description: 'Lamaran diterima tim BolBel dan sedang diverifikasi kelengkapannya.',
    stepOrder: 2,
  },
  dilaporkan_apply_eksternal: {
    label: 'Dilaporkan Apply Eksternal',
    description: 'Alumni melaporkan telah melamar mandiri di situs resmi company.',
    stepOrder: 2,
  },
  diteruskan_ke_company: {
    label: 'Diteruskan ke Company',
    description: 'CV dan profil telah resmi dikirimkan Gifari/BolBel ke PIC recruitment.',
    stepOrder: 3,
  },
  screening: {
    label: 'Screening',
    description: 'Tahap screening administrasi atau tes oleh tim HR company.',
    stepOrder: 4,
  },
  interview: {
    label: 'Interview',
    description: 'Tahap wawancara HR, user, atau technical review.',
    stepOrder: 5,
  },
  offer: {
    label: 'Offer',
    description: 'Kandidat menerima penawaran kerja resmi dari company.',
    stepOrder: 6,
  },
  offer_diterima: {
    label: 'Offer Diterima',
    description: 'Alumni mengonfirmasi menyetujui penawaran kerja.',
    stepOrder: 7,
  },
  mulai_kerja: {
    label: 'Mulai Kerja',
    description: 'Alumni resmi aktif mulai bertugas di company.',
    stepOrder: 8,
  },
};

export const OUTCOME_CONFIG: Record<
  ProcessOutcome,
  { label: string; isTerminal: boolean; badgeColor: string }
> = {
  aktif: { label: 'Aktif Berjalan', isTerminal: false, badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ditolak: { label: 'Tidak Lolos / Ditolak', isTerminal: true, badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  mengundurkan_diri: { label: 'Mengundurkan Diri', isTerminal: true, badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  menolak_offer: { label: 'Menolak Offer', isTerminal: true, badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  dibatalkan_company: { label: 'Dibatalkan Company', isTerminal: true, badgeColor: 'bg-stone-100 text-stone-700 border-stone-200' },
  tidak_menyetujui_pengajuan: { label: 'Pengajuan Ditolak Alumni', isTerminal: true, badgeColor: 'bg-stone-100 text-stone-700 border-stone-200' },
  selesai_mulai_kerja: { label: 'Selesai & Mulai Kerja', isTerminal: true, badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
};

/**
 * Check if an alumni profile's availability is fresh (<= 30 days)
 * PRD FR02: "setelah 30 hari tanpa konfirmasi, tampilkan 'Perlu konfirmasi'."
 */
export function isProfileFresh(confirmedAt: string | undefined | null, thresholdDays = 30): { isFresh: boolean; daysAgo: number } {
  if (!confirmedAt) {
    return { isFresh: false, daysAgo: 999 };
  }
  const confirmedTime = new Date(confirmedAt).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - confirmedTime) / (1000 * 60 * 60 * 24));
  return {
    isFresh: diffDays <= thresholdDays,
    daysAgo: Math.max(0, diffDays),
  };
}

/**
 * Validates whether profile meets minimum requirements to apply (PRD FR02)
 */
export function isMinimumProfileComplete(
  profile: AlumniProfile | null,
  activeCvCount: number
): { isComplete: boolean; missingFields: string[] } {
  const missing: string[] = [];
  if (!profile) {
    return { isComplete: false, missingFields: ['Profil belum diisi'] };
  }
  if (!profile.employmentStatus) missing.push('Status Bekerja');
  if (!profile.opennessStatus) missing.push('Keterbukaan Peluang');
  if (!profile.startReadiness) missing.push('Kesiapan Mulai Kerja');
  if (!profile.targetRoles || profile.targetRoles.length === 0) missing.push('Target Role');
  if (!profile.targetWorkTypes || profile.targetWorkTypes.length === 0) missing.push('Jenis Pekerjaan');
  if (!profile.targetWorkModels || profile.targetWorkModels.length === 0) missing.push('Cara Kerja (WFO/Hybrid/Remote)');
  if (!profile.domicile || profile.domicile.trim() === '') missing.push('Domisili');
  if (activeCvCount <= 0) missing.push('CV Aktif (PDF <= 5MB)');

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Validates whether a candidate can apply to a job
 * PRD FR04 & FR05:
 * - Lowongan status harus 'published'
 * - Tenggat waktu belum lewat
 * - Tidak boleh duplicate active application
 */
export function checkCanApply(
  job: Job,
  profile: AlumniProfile | null,
  activeCv: CVDocument | null,
  existingProcess: CandidateProcess | null
): { canApply: boolean; reason?: string } {
  if (existingProcess) {
    return {
      canApply: false,
      reason: `Kamu sudah memiliki catatan lamaran/pengajuan untuk lowongan ini (${STAGE_CONFIG[existingProcess.currentStage]?.label || existingProcess.currentStage}).`,
    };
  }

  if (job.status !== 'published') {
    return {
      canApply: false,
      reason: `Lowongan sedang tidak menerima lamaran (status: ${job.status}).`,
    };
  }

  if (job.deadlineDate) {
    const deadline = new Date(job.deadlineDate + 'T23:59:59').getTime();
    if (Date.now() > deadline) {
      return {
        canApply: false,
        reason: 'Tenggat waktu pendaftaran lowongan ini telah berakhir.',
      };
    }
  }

  if (job.applyChannel === 'bolbel') {
    if (!activeCv) {
      return {
        canApply: false,
        reason: 'Harap unggah CV aktif dalam format PDF (maksimal 5 MB) sebelum melamar via BolBel.',
      };
    }
  }

  const profileCheck = isMinimumProfileComplete(profile, activeCv ? 1 : 0);
  if (!profileCheck.isComplete) {
    return {
      canApply: false,
      reason: `Data profil minimum belum lengkap: ${profileCheck.missingFields.join(', ')}.`,
    };
  }

  return { canApply: true };
}

/**
 * Checks if stage transition is valid based on PRD Section 7 & Section 11
 */
export function canTransitionStage(
  currentStage: SelectionStage,
  newStage: SelectionStage,
  hasValidConsent: boolean,
  channel: ApplyChannel
): { allowed: boolean; reason?: string } {
  // If staying on same stage, allowed (e.g. updating notes or schedule)
  if (currentStage === newStage) {
    return { allowed: true };
  }

  // To forward to company on BolBel channel, explicit consent MUST be active
  if (newStage === 'diteruskan_ke_company') {
    if (channel === 'bolbel' && !hasValidConsent) {
      return {
        allowed: false,
        reason: 'Penerusan CV ke company diblokir karena belum ada persetujuan (consent) aktif dari alumni untuk lowongan ini.',
      };
    }
  }

  // Waiting for approval can only move to masuk_bolbel if consent is given
  if (currentStage === 'menunggu_persetujuan' && newStage !== 'masuk_bolbel') {
    if (!hasValidConsent) {
      return {
        allowed: false,
        reason: 'Kandidat belum memberikan persetujuan untuk pengajuan ini.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Parse & Validate CSV Roster text for initial import (FR10)
 */
export function parseAndValidateRosterCsv(
  csvContent: string,
  existingEmails: string[]
): CsvRosterImportRow[] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const normalizedExisting = new Set(existingEmails.map((e) => e.trim().toLowerCase()));
  const seenInBatch = new Set<string>();

  const results: CsvRosterImportRow[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    const email = parts[0]?.toLowerCase() || '';
    const fullName = parts[1] || '';
    const program = parts[2] || 'Full Course';
    const batch = parts[3] || 'Batch 12';
    const eligibilityRaw = (parts[4] || 'eligible').toLowerCase();

    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push('Format email tidak valid');
    }

    if (!fullName) {
      errors.push('Nama lengkap wajib diisi');
    }

    const isDuplicate = normalizedExisting.has(email) || seenInBatch.has(email);
    if (isDuplicate) {
      errors.push('Email sudah ada dalam roster terdaftar');
    } else if (email) {
      seenInBatch.add(email);
    }

    results.push({
      email,
      fullName,
      program,
      batch,
      eligibility: eligibilityRaw === 'revoked' ? 'revoked' : eligibilityRaw === 'pending' ? 'pending' : 'eligible',
      isValid: errors.length === 0,
      errors,
      isDuplicate,
    });
  }

  return results;
}

/**
 * Format currency to IDR
 */
export function formatCurrencyIDR(val?: number): string {
  if (val === undefined || val === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Format date to standard Indonesian format: "16 Okt 2026"
 */
export function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

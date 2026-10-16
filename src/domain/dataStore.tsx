'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  User,
  UserRole,
  AlumniProfile,
  CVDocument,
  Company,
  Job,
  CandidateProcess,
  ConsentRecord,
  ProcessEvent,
  AlumniReport,
  FollowUpTask,
  AlumniRosterEntry,
  SelectionStage,
  ProcessOutcome,
} from './types.ts';
import { isTerminalOutcome, validateProcessUpdate, OUTCOME_CONFIG } from './stateMachine.ts';

// Initial Seed Data
const INITIAL_USERS: User[] = [
  {
    id: 'user-alumni-1',
    email: 'fadhil@bolehdicoba.com',
    role: 'alumni',
    fullName: 'Fadhil Pratama',
    rosterId: 'roster-1',
    active: true,
  },
  {
    id: 'user-admin-1',
    email: 'gifari@bolehbelajar.com',
    role: 'admin',
    fullName: 'Gifari (Talent Lead BolBel)',
    active: true,
  },
  {
    id: 'user-alumni-2',
    email: 'sarah.annisa@alumni.com',
    role: 'alumni',
    fullName: 'Sarah Annisa',
    rosterId: 'roster-2',
    active: true,
  },
  {
    id: 'user-alumni-3',
    email: 'dimas.w@alumni.com',
    role: 'alumni',
    fullName: 'Dimas Wicaksono',
    rosterId: 'roster-3',
    active: true,
  },
];

const INITIAL_ROSTER: AlumniRosterEntry[] = [
  {
    id: 'roster-1',
    email: 'fadhil@bolehdicoba.com',
    fullName: 'Fadhil Pratama',
    program: 'Full Course',
    batch: 'Batch 10',
    eligibility: 'eligible',
    invitedAt: '2026-09-01T08:00:00Z',
    activatedAt: '2026-09-02T10:15:00Z',
  },
  {
    id: 'roster-2',
    email: 'sarah.annisa@alumni.com',
    fullName: 'Sarah Annisa',
    program: 'Performance Marketing Specialization',
    batch: 'Batch 8',
    eligibility: 'eligible',
    invitedAt: '2026-08-15T08:00:00Z',
    activatedAt: '2026-08-16T09:30:00Z',
  },
  {
    id: 'roster-3',
    email: 'dimas.w@alumni.com',
    fullName: 'Dimas Wicaksono',
    program: 'Digital Marketing Intensive',
    batch: 'Batch 12',
    eligibility: 'eligible',
    invitedAt: '2026-09-10T08:00:00Z',
    activatedAt: '2026-09-12T14:20:00Z',
  },
  {
    id: 'roster-4',
    email: 'budi.santoso@alumni.com',
    fullName: 'Budi Santoso',
    program: 'Career Prep',
    batch: 'Batch 9',
    eligibility: 'pending',
    invitedAt: '2026-10-01T08:00:00Z',
  },
];

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const daysAhead = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const INITIAL_PROFILES: Record<string, AlumniProfile> = {
  'user-alumni-1': {
    userId: 'user-alumni-1',
    fullName: 'Fadhil Pratama',
    email: 'fadhil@bolehdicoba.com',
    phone: '081298765432',
    whatsappContact: true,
    linkedinUrl: 'https://linkedin.com/in/fadhilpratama',
    portfolioUrl: 'https://fadhil-portfolio.notion.site',
    program: 'Full Course',
    batch: 'Batch 10',
    employmentStatus: 'belum_bekerja',
    opennessStatus: 'aktif_mencari',
    startReadiness: 'segera',
    targetRoles: ['Performance Marketing Specialist', 'Digital Marketing Specialist', 'Paid Ads Associate'],
    targetWorkTypes: ['full_time', 'contract'],
    targetWorkModels: ['hybrid', 'remote', 'wfo'],
    domicile: 'Jakarta Selatan',
    targetLocations: ['Jakarta', 'Tangerang', 'Bandung'],
    experienceBand: '1-2_tahun',
    allowProactiveContact: true,
    availabilityConfirmedAt: daysAgo(4), // Fresh (< 30 days)
    updatedAt: daysAgo(4),
  },
  'user-alumni-2': {
    userId: 'user-alumni-2',
    fullName: 'Sarah Annisa',
    email: 'sarah.annisa@alumni.com',
    phone: '081345678901',
    whatsappContact: true,
    linkedinUrl: 'https://linkedin.com/in/sarahannisa',
    program: 'Performance Marketing Specialization',
    batch: 'Batch 8',
    employmentStatus: 'bekerja',
    opennessStatus: 'terbuka',
    startReadiness: 'notice_period',
    noticePeriodDays: 30,
    targetRoles: ['Paid Ads Lead', 'Growth Marketing Specialist'],
    targetWorkTypes: ['full_time'],
    targetWorkModels: ['hybrid', 'remote'],
    domicile: 'Jakarta Barat',
    targetLocations: ['Jakarta'],
    experienceBand: '2-4_tahun',
    allowProactiveContact: true,
    availabilityConfirmedAt: daysAgo(42), // STALE (> 30 days) -> triggers "Perlu konfirmasi"
    updatedAt: daysAgo(42),
  },
  'user-alumni-3': {
    userId: 'user-alumni-3',
    fullName: 'Dimas Wicaksono',
    email: 'dimas.w@alumni.com',
    phone: '087788990011',
    whatsappContact: false,
    program: 'Digital Marketing Intensive',
    batch: 'Batch 12',
    employmentStatus: 'belum_bekerja',
    opennessStatus: 'aktif_mencari',
    startReadiness: 'segera',
    targetRoles: ['Social Media Specialist', 'Digital Marketing Associate'],
    targetWorkTypes: ['full_time', 'internship'],
    targetWorkModels: ['remote', 'hybrid'],
    domicile: 'Bandung',
    targetLocations: ['Bandung', 'Jakarta'],
    experienceBand: '<1_tahun',
    allowProactiveContact: false, // Refuses proactive contact, applies manually only
    availabilityConfirmedAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },
};

const INITIAL_CVS: CVDocument[] = [
  {
    id: 'cv-fadhil-1',
    ownerId: 'user-alumni-1',
    fileName: 'CV_Fadhil_Pratama_2026.pdf',
    fileSizeBytes: 1420000,
    fileType: 'application/pdf',
    uploadedAt: daysAgo(5),
    isCurrentActive: true,
    storageKey: 'cvs/fadhil_current.pdf',
  },
  {
    id: 'cv-fadhil-old',
    ownerId: 'user-alumni-1',
    fileName: 'CV_Fadhil_Pratama_Batch10_v1.pdf',
    fileSizeBytes: 1200000,
    fileType: 'application/pdf',
    uploadedAt: daysAgo(40),
    isCurrentActive: false,
    storageKey: 'cvs/fadhil_old.pdf',
  },
  {
    id: 'cv-sarah-1',
    ownerId: 'user-alumni-2',
    fileName: 'CV_Sarah_Annisa_Performance.pdf',
    fileSizeBytes: 2100000,
    fileType: 'application/pdf',
    uploadedAt: daysAgo(45),
    isCurrentActive: true,
    storageKey: 'cvs/sarah_current.pdf',
  },
  {
    id: 'cv-dimas-1',
    ownerId: 'user-alumni-3',
    fileName: 'CV_Dimas_Wicaksono.pdf',
    fileSizeBytes: 950000,
    fileType: 'application/pdf',
    uploadedAt: daysAgo(15),
    isCurrentActive: true,
    storageKey: 'cvs/dimas_current.pdf',
  },
];

const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    name: 'Tiket.com',
    industry: 'Online Travel Agent (OTA)',
    websiteUrl: 'https://www.tiket.com',
    relationshipSource: 'company_inbound',
    internalPicName: 'Clarissa (Talent Acquisition Specialist)',
    internalPicContact: 'clarissa.ta@tiket.com / WA: 08128889991',
    internalNotes: 'Mencari talent yang kuat di Meta Ads & Google Ads, terbiasa analisis ROAS harian.',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'comp-2',
    name: 'Boleh Dicoba Digital (BDD)',
    industry: 'Digital Growth Agency',
    websiteUrl: 'https://bolehdicoba.com',
    relationshipSource: 'company_inbound',
    internalPicName: 'Reza (People Operations Lead)',
    internalPicContact: 'reza@bolehdicoba.com',
    internalNotes: 'Prioritas utama alumni Boleh Belajar dengan pemahaman tracking dashboard dan creative copy.',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'comp-3',
    name: 'GoTo Financial',
    industry: 'Fintech & Digital Payments',
    websiteUrl: 'https://careers.goto.com',
    relationshipSource: 'gifari_sourcing',
    internalPicName: 'Andra (HR Tech Sourcing)',
    internalPicContact: 'andra@gotofinancial.com',
    internalNotes: 'Jalur eksternal resmi lewat portal karier GoTo, Gifari berkoordinasi langsung dengan HR Sourcing.',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'comp-4',
    name: 'Finnet Indonesia',
    industry: 'Financial Technology',
    websiteUrl: 'https://finnet.co.id',
    relationshipSource: 'gifari_sourcing',
    internalPicName: 'Danang (Recruiter)',
    internalPicContact: 'recruitment@finnet.co.id',
    internalNotes: 'Sedang pembukaan posisi CRM Marketing.',
    createdAt: '2026-09-15T00:00:00Z',
  },
];

const INITIAL_JOBS: Job[] = [
  {
    id: 'job-1',
    companyId: 'comp-1',
    companyName: 'Tiket.com',
    title: 'Performance Marketing Specialist',
    summary: 'Mengelola dan mengoptimasi kampanye berbayar Meta Ads & Google Ads untuk kategori Flight and Hotel.',
    responsibilities: [
      'Menyusun strategi bidding dan alokasi budget bulanan lintas channel Google Ads & Meta Ads.',
      'Melakukan A/B testing materi kreatif, copy iklan, serta landing page funnel konversi.',
      'Menganalisis matriks performa harian (ROAS, CAC, CTR, CPA) menggunakan Looker Studio dan Google Analytics 4.',
      'Berkoordinasi dengan tim Brand & Creative untuk penyusunan aset visual mingguan.',
    ],
    requirements: [
      'Alumni Boleh Belajar (Full Course atau Performance Specialization diutamakan).',
      'Pengalaman praktis mengelola budget iklan digital minimal 1 tahun atau portofolio project bootcamp yang tervalidasi.',
      'Menguasai Meta Ads Manager, Google Ads (Search, Performance Max), and GA4.',
      'Kemampuan analisis data kuantitatif yang solid dan teliti.',
    ],
    experienceLevel: 'junior',
    workType: 'full_time',
    workModel: 'hybrid',
    location: 'Jakarta Selatan',
    openingsCount: 2,
    salaryType: 'range',
    salaryMin: 9000000,
    salaryMax: 13000000,
    salaryPeriod: 'bulan',
    applyChannel: 'bolbel',
    status: 'published',
    processOwner: 'Gifari',
    deadlineDate: daysAhead(20),
    publishedAt: daysAgo(5),
    createdAt: daysAgo(6),
    updatedAt: daysAgo(5),
  },
  {
    id: 'job-2',
    companyId: 'comp-2',
    companyName: 'Boleh Dicoba Digital (BDD)',
    title: 'Paid Ads Specialist (Meta & TikTok)',
    summary: 'Menangani multi-brand e-commerce clients di BDD dalam perancangan strategi paid media dan scaling omzet.',
    responsibilities: [
      'Handle 3-5 brand client untuk strategi paid social (Meta Ads & TikTok Ads).',
      'Briefing script video kreatif UGC dan hook promosi kepada tim video creator.',
      'Evaluasi scaling strategi dan pixel event optimization pada website Shopify/WooCommerce.',
      'Reporting mingguan langsung ke Account Director dan Brand Owner.',
    ],
    requirements: [
      'Alumni Boleh Belajar dengan nilai project memuaskan.',
      'Familiar dengan funnel digital marketing AIDA dan e-commerce conversion benchmarks.',
      'Disiplin, komunikatif, dan terbiasa bekerja dengan target ROAS yang terukur.',
    ],
    experienceLevel: 'junior',
    workType: 'full_time',
    workModel: 'remote',
    location: 'Bandung / Remote Indonesia',
    openingsCount: 3,
    salaryType: 'range',
    salaryMin: 7500000,
    salaryMax: 11000000,
    salaryPeriod: 'bulan',
    applyChannel: 'bolbel',
    status: 'published',
    processOwner: 'Gifari',
    deadlineDate: daysAhead(14),
    publishedAt: daysAgo(3),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },
  {
    id: 'job-3',
    companyId: 'comp-3',
    companyName: 'GoTo Financial',
    title: 'Growth Marketing Associate',
    summary: 'Mendorong akuisisi merchant dan user baru produk pembayaran digital melalui inisiatif kolaborasi dan channel digital.',
    responsibilities: [
      'Mengeksekusi kampanye akuisisi merchant bersama tim Business Development.',
      'Melakukan eksperimen channel promosi berbiaya rendah dan referral engine.',
      'Memantau funnel pendaftaran pengguna dan mengidentifikasi drop-off point.',
    ],
    requirements: [
      'Pendidikan Sarjana atau alumni bootcamp Boleh Belajar bidang Marketing / Business.',
      'Memahami fundamental user journey dan metrics konversi digital.',
      'Proaktif dan memiliki analytical mindset.',
    ],
    experienceLevel: 'junior',
    workType: 'full_time',
    workModel: 'wfo',
    location: 'Pasar Raya Blok M, Jakarta Selatan',
    openingsCount: 1,
    salaryType: 'uninformed',
    applyChannel: 'external',
    externalApplyUrl: 'https://careers.goto.com/jobs/growth-marketing-assoc',
    status: 'published',
    processOwner: 'Gifari',
    deadlineDate: daysAhead(10),
    publishedAt: daysAgo(7),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(7),
  },
  {
    id: 'job-4',
    companyId: 'comp-4',
    companyName: 'Finnet Indonesia',
    title: 'CRM & Retention Specialist',
    summary: 'Membangun workflow otomatisasi email, push notification, dan program loyalty pengguna aktif.',
    responsibilities: [
      'Mengelola automated customer journey menggunakan tools CRM.',
      'Segmentasi basis data pengguna berdasarkan RFM (Recency, Frequency, Monetary).',
    ],
    requirements: [
      'Pengalaman di CRM / Retention Marketing minimal 1 tahun.',
      'Familiar dengan tools automation (MoEngage / Braze / CleverTap / Mailchimp).',
    ],
    experienceLevel: 'mid',
    workType: 'full_time',
    workModel: 'hybrid',
    location: 'Jakarta Pusat',
    openingsCount: 1,
    salaryType: 'confidential',
    applyChannel: 'bolbel',
    status: 'paused',
    closedReason: 'Dalam proses review kandidat batch 1 oleh direksi.',
    processOwner: 'Gifari',
    deadlineDate: daysAhead(5),
    publishedAt: daysAgo(15),
    createdAt: daysAgo(16),
    updatedAt: daysAgo(2),
  },
  {
    id: 'job-5',
    companyId: 'comp-2',
    companyName: 'Boleh Dicoba Digital (BDD)',
    title: 'Senior SEO Strategist',
    summary: 'Memimpin arsitektur website dan konten organik brand tech.',
    responsibilities: ['Technical SEO audit', 'Content cluster planning'],
    requirements: ['Pengalaman minimal 3 tahun di bidang Search Engine Optimization.'],
    experienceLevel: 'senior',
    workType: 'full_time',
    workModel: 'remote',
    location: 'Remote',
    openingsCount: 1,
    salaryType: 'range',
    salaryMin: 14000000,
    salaryMax: 19000000,
    applyChannel: 'bolbel',
    status: 'closed',
    closedReason: 'Posisi telah resmi terisi oleh kandidat terpilih.',
    processOwner: 'Gifari',
    publishedAt: daysAgo(30),
    createdAt: daysAgo(32),
    updatedAt: daysAgo(1),
  },
];

const INITIAL_PROCESSES: CandidateProcess[] = [
  // Process 1: Fadhil -> Tiket.com (Active, Screening)
  {
    id: 'proc-fadhil-tiket',
    alumniId: 'user-alumni-1',
    alumniName: 'Fadhil Pratama',
    alumniEmail: 'fadhil@bolehdicoba.com',
    jobId: 'job-1',
    jobTitle: 'Performance Marketing Specialist',
    companyId: 'comp-1',
    companyName: 'Tiket.com',
    origin: 'internal_apply',
    currentStage: 'screening',
    outcome: 'aktif',
    documentVersionId: 'cv-fadhil-1',
    documentName: 'CV_Fadhil_Pratama_2026.pdf',
    profileSnapshot: {
      fullName: 'Fadhil Pratama',
      email: 'fadhil@bolehdicoba.com',
      phone: '081298765432',
      domicile: 'Jakarta Selatan',
      employmentStatus: 'belum_bekerja',
      opennessStatus: 'aktif_mencari',
      startReadiness: 'segera',
      experienceBand: '1-2_tahun',
      targetRoles: ['Performance Marketing Specialist'],
    },
    consentGrantedAt: daysAgo(4),
    version: 3,
    lastStageUpdatedAt: daysAgo(1),
    lastFollowUpDate: daysAgo(1),
    createdAt: daysAgo(4),
  },
  // Process 2: Sarah -> BDD (Active, Interview)
  {
    id: 'proc-sarah-bdd',
    alumniId: 'user-alumni-2',
    alumniName: 'Sarah Annisa',
    alumniEmail: 'sarah.annisa@alumni.com',
    jobId: 'job-2',
    jobTitle: 'Paid Ads Specialist (Meta & TikTok)',
    companyId: 'comp-2',
    companyName: 'Boleh Dicoba Digital (BDD)',
    origin: 'internal_apply',
    currentStage: 'interview',
    outcome: 'aktif',
    documentVersionId: 'cv-sarah-1',
    documentName: 'CV_Sarah_Annisa_Performance.pdf',
    profileSnapshot: {
      fullName: 'Sarah Annisa',
      email: 'sarah.annisa@alumni.com',
      phone: '081345678901',
      domicile: 'Jakarta Barat',
      employmentStatus: 'bekerja',
      opennessStatus: 'terbuka',
      startReadiness: 'notice_period',
      experienceBand: '2-4_tahun',
      targetRoles: ['Paid Ads Lead'],
    },
    consentGrantedAt: daysAgo(10),
    interviewSchedule: '2026-10-21 14:00 WIB (Google Meet)',
    version: 4,
    lastStageUpdatedAt: daysAgo(2),
    lastFollowUpDate: daysAgo(2),
    createdAt: daysAgo(10),
  },
  // Process 3: Dimas -> GoTo (External Report)
  {
    id: 'proc-dimas-goto',
    alumniId: 'user-alumni-3',
    alumniName: 'Dimas Wicaksono',
    alumniEmail: 'dimas.w@alumni.com',
    jobId: 'job-3',
    jobTitle: 'Growth Marketing Associate',
    companyId: 'comp-3',
    companyName: 'GoTo Financial',
    origin: 'external_report',
    currentStage: 'dilaporkan_apply_eksternal',
    outcome: 'aktif',
    documentVersionId: 'cv-dimas-1',
    documentName: 'CV_Dimas_Wicaksono.pdf',
    profileSnapshot: {
      fullName: 'Dimas Wicaksono',
      email: 'dimas.w@alumni.com',
      domicile: 'Bandung',
      employmentStatus: 'belum_bekerja',
      opennessStatus: 'aktif_mencari',
      startReadiness: 'segera',
      experienceBand: '<1_tahun',
      targetRoles: ['Social Media Specialist'],
    },
    reportedApplyDate: daysAgo(2).split('T')[0],
    version: 1,
    lastStageUpdatedAt: daysAgo(2),
    createdAt: daysAgo(2),
  },
  // Process 4: Proactive proposal by admin to Fadhil -> BDD (Menunggu Persetujuan Alumni)
  {
    id: 'proc-fadhil-bdd-prop',
    alumniId: 'user-alumni-1',
    alumniName: 'Fadhil Pratama',
    alumniEmail: 'fadhil@bolehdicoba.com',
    jobId: 'job-2',
    jobTitle: 'Paid Ads Specialist (Meta & TikTok)',
    companyId: 'comp-2',
    companyName: 'Boleh Dicoba Digital (BDD)',
    origin: 'admin_proactive',
    currentStage: 'menunggu_persetujuan',
    outcome: 'aktif',
    documentVersionId: 'cv-fadhil-1',
    documentName: 'CV_Fadhil_Pratama_2026.pdf',
    profileSnapshot: {
      fullName: 'Fadhil Pratama',
      email: 'fadhil@bolehdicoba.com',
      domicile: 'Jakarta Selatan',
      employmentStatus: 'belum_bekerja',
      opennessStatus: 'aktif_mencari',
      startReadiness: 'segera',
      experienceBand: '1-2_tahun',
      targetRoles: ['Performance Marketing Specialist'],
    },
    version: 1,
    lastStageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(1),
  },
];

const INITIAL_CONSENTS: ConsentRecord[] = [
  {
    id: 'consent-1',
    processId: 'proc-fadhil-tiket',
    alumniId: 'user-alumni-1',
    jobId: 'job-1',
    companyName: 'Tiket.com',
    jobTitle: 'Performance Marketing Specialist',
    documentVersionId: 'cv-fadhil-1',
    documentName: 'CV_Fadhil_Pratama_2026.pdf',
    scopeDescription: 'Persetujuan membagikan data profil dan CV kepada tim recruitment Tiket.com.',
    policyVersion: 'v1.0-2026',
    grantedAt: daysAgo(4),
  },
  {
    id: 'consent-2',
    processId: 'proc-sarah-bdd',
    alumniId: 'user-alumni-2',
    jobId: 'job-2',
    companyName: 'Boleh Dicoba Digital (BDD)',
    jobTitle: 'Paid Ads Specialist (Meta & TikTok)',
    documentVersionId: 'cv-sarah-1',
    documentName: 'CV_Sarah_Annisa_Performance.pdf',
    scopeDescription: 'Persetujuan membagikan data profil dan CV kepada tim recruitment Boleh Dicoba Digital.',
    policyVersion: 'v1.0-2026',
    grantedAt: daysAgo(10),
  },
];

const INITIAL_EVENTS: ProcessEvent[] = [
  {
    id: 'ev-1',
    processId: 'proc-fadhil-tiket',
    eventType: 'consent_granted',
    newStage: 'masuk_bolbel',
    actorId: 'user-alumni-1',
    actorName: 'Fadhil Pratama',
    actorRole: 'alumni',
    sourceType: 'alumni_report',
    occurredAt: daysAgo(4),
    recordedAt: daysAgo(4),
    publicMessage: 'Lamaran tersimpan di BolBel. Tim akan meninjau sebelum meneruskannya ke company.',
  },
  {
    id: 'ev-2',
    processId: 'proc-fadhil-tiket',
    eventType: 'forwarded_to_company',
    previousStage: 'masuk_bolbel',
    newStage: 'diteruskan_ke_company',
    actorId: 'user-admin-1',
    actorName: 'Gifari',
    actorRole: 'admin',
    sourceType: 'admin_official',
    occurredAt: daysAgo(3),
    recordedAt: daysAgo(3),
    publicMessage: 'CV dan profil kamu telah resmi diteruskan oleh Gifari ke tim Talent Acquisition Tiket.com.',
    internalNotes: 'Dikirim via email ke Clarissa (TA Tiket.com) bersama cover summary.',
  },
  {
    id: 'ev-3',
    processId: 'proc-fadhil-tiket',
    eventType: 'status_change',
    previousStage: 'diteruskan_ke_company',
    newStage: 'screening',
    actorId: 'user-admin-1',
    actorName: 'Gifari',
    actorRole: 'admin',
    sourceType: 'company_update',
    occurredAt: daysAgo(1),
    recordedAt: daysAgo(1),
    publicMessage: 'Kandidat masuk tahap screening administrasi dan review portofolio oleh user team Tiket.com.',
    internalNotes: 'Konfirmasi WhatsApp dari Clarissa: profile Fadhil sedang di-review oleh Head of Performance Marketing.',
  },
];

const INITIAL_REPORTS: AlumniReport[] = [
  {
    id: 'rep-1',
    processId: 'proc-dimas-goto',
    alumniId: 'user-alumni-3',
    reportType: 'already_applied_external',
    reportDate: daysAgo(2).split('T')[0],
    details: 'Sudah submit formulir di portal karir GoTo Financial dengan CV versi bootcamp.',
    status: 'pending_review',
    createdAt: daysAgo(2),
  },
];

const INITIAL_TASKS: FollowUpTask[] = [
  {
    id: 'task-1',
    processId: 'proc-fadhil-tiket',
    jobId: 'job-1',
    alumniId: 'user-alumni-1',
    title: 'Follow-up screening Tiket.com (Fadhil Pratama)',
    description: 'Cek kabar hasil screening ke Clarissa via WhatsApp setelah 4 hari kerja.',
    taskType: 'followup_company',
    ownerName: 'Gifari',
    dueAt: daysAhead(2),
    status: 'pending',
    createdAt: daysAgo(1),
  },
  {
    id: 'task-2',
    processId: 'proc-sarah-bdd',
    jobId: 'job-2',
    alumniId: 'user-alumni-2',
    title: 'Koordinasi jadwal interview Sarah Annisa di BDD',
    description: 'Pastikan link Google Meet dan kesiapan kandidat terkonfirmasi.',
    taskType: 'followup_company',
    ownerName: 'Gifari',
    dueAt: daysAgo(1), // OVERDUE
    status: 'pending',
    createdAt: daysAgo(3),
  },
  {
    id: 'task-3',
    processId: 'proc-dimas-goto',
    jobId: 'job-3',
    alumniId: 'user-alumni-3',
    title: 'Tinjau laporan lamaran eksternal Dimas Wicaksono',
    description: 'Cek kesesuaian role dan verifikasi apakah perlu dibantu follow-up ke HR GoTo.',
    taskType: 'review_alumni_report',
    ownerName: 'Gifari',
    dueAt: daysAhead(0), // DUE TODAY
    status: 'pending',
    createdAt: daysAgo(2),
  },
  {
    id: 'task-4',
    jobId: 'job-5',
    title: 'Pemberitahuan penutupan posisi SEO Strategist',
    description: 'Arsipkan catatan lowongan yang sudah terisi dan beri kabar kandidat terkait.',
    taskType: 'closed_job_cleanup',
    ownerName: 'Gifari',
    dueAt: daysAgo(2),
    completedAt: daysAgo(1),
    status: 'completed',
    createdAt: daysAgo(3),
  },
];

interface DataStoreContextType {
  currentUser: User;
  switchUserRole: (role: UserRole, targetUserId?: string) => void;
  users: User[];
  roster: AlumniRosterEntry[];
  profiles: Record<string, AlumniProfile>;
  currentProfile: AlumniProfile | null;
  updateProfile: (profile: AlumniProfile) => void;
  confirmAvailability: (userId: string) => void;
  cvs: CVDocument[];
  activeCv: CVDocument | null;
  uploadCV: (file: File) => Promise<{ success: boolean; error?: string }>;
  setActiveCV: (cvId: string) => void;
  deleteCV: (cvId: string) => void;
  companies: Company[];
  addCompany: (comp: Omit<Company, 'id' | 'createdAt'>) => void;
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateJobStatus: (jobId: string, status: Job['status'], reason?: string) => void;
  processes: CandidateProcess[];
  events: ProcessEvent[];
  consents: ConsentRecord[];
  reports: AlumniReport[];
  tasks: FollowUpTask[];
  // Actions
  applyViaBolBel: (jobId: string, consentAccepted: boolean) => Promise<{ success: boolean; error?: string; processId?: string }>;
  reportExternalApply: (jobId: string, applyDate: string, notes: string) => Promise<{ success: boolean; error?: string }>;
  approveAdminProposal: (processId: string) => Promise<{ success: boolean; error?: string }>;
  rejectAdminProposal: (processId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  withdrawApplication: (processId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  forwardCVToCompany: (processId: string, internalNotes: string, publicMessage?: string) => Promise<{ success: boolean; error?: string }>;
  updateCandidateStage: (
    processId: string,
    newStage: SelectionStage,
    newOutcome: ProcessOutcome,
    sourceType: 'admin_official' | 'company_update',
    occurredAt: string,
    publicMessage?: string,
    internalNotes?: string,
    interviewSchedule?: string,
    actualStartDate?: string
  ) => Promise<{ success: boolean; error?: string }>;
  createProactiveProposal: (alumniId: string, jobId: string) => Promise<{ success: boolean; error?: string }>;
  toggleTaskStatus: (taskId: string) => void;
  createFollowUpTask: (task: Omit<FollowUpTask, 'id' | 'createdAt' | 'status'>) => void;
  importRosterBatch: (newEntries: Omit<AlumniRosterEntry, 'id' | 'invitedAt'>[]) => number;
  resetAllToSeed: () => void;
}

const DataStoreContext = createContext<DataStoreContextType | null>(null);

const STORAGE_KEY = 'bolbel_career_portal_state_v1';

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load or fallback to seed
  const loadInitial = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  };

  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_current_user_id`) || 'user-alumni-1';
    } catch {
      return 'user-alumni-1';
    }
  });

  const [roster, setRoster] = useState<AlumniRosterEntry[]>(() => loadInitial('roster', INITIAL_ROSTER));
  const [profiles, setProfiles] = useState<Record<string, AlumniProfile>>(() => loadInitial('profiles', INITIAL_PROFILES));
  const [cvs, setCvs] = useState<CVDocument[]>(() => loadInitial('cvs', INITIAL_CVS));
  const [companies, setCompanies] = useState<Company[]>(() => loadInitial('companies', INITIAL_COMPANIES));
  const [jobs, setJobs] = useState<Job[]>(() => loadInitial('jobs', INITIAL_JOBS));
  const [processes, setProcesses] = useState<CandidateProcess[]>(() => loadInitial('processes', INITIAL_PROCESSES));
  const [consents, setConsents] = useState<ConsentRecord[]>(() => loadInitial('consents', INITIAL_CONSENTS));
  const [events, setEvents] = useState<ProcessEvent[]>(() => loadInitial('events', INITIAL_EVENTS));
  const [reports, setReports] = useState<AlumniReport[]>(() => loadInitial('reports', INITIAL_REPORTS));
  const [tasks, setTasks] = useState<FollowUpTask[]>(() => loadInitial('tasks', INITIAL_TASKS));

  // Sync back to local storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_current_user_id`, currentUserId);
    localStorage.setItem(`${STORAGE_KEY}_roster`, JSON.stringify(roster));
    localStorage.setItem(`${STORAGE_KEY}_profiles`, JSON.stringify(profiles));
    localStorage.setItem(`${STORAGE_KEY}_cvs`, JSON.stringify(cvs));
    localStorage.setItem(`${STORAGE_KEY}_companies`, JSON.stringify(companies));
    localStorage.setItem(`${STORAGE_KEY}_jobs`, JSON.stringify(jobs));
    localStorage.setItem(`${STORAGE_KEY}_processes`, JSON.stringify(processes));
    localStorage.setItem(`${STORAGE_KEY}_consents`, JSON.stringify(consents));
    localStorage.setItem(`${STORAGE_KEY}_events`, JSON.stringify(events));
    localStorage.setItem(`${STORAGE_KEY}_reports`, JSON.stringify(reports));
    localStorage.setItem(`${STORAGE_KEY}_tasks`, JSON.stringify(tasks));
  }, [currentUserId, roster, profiles, cvs, companies, jobs, processes, consents, events, reports, tasks]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const currentProfile = profiles[currentUserId] || null;
  const activeCv = cvs.find((c) => c.ownerId === currentUserId && c.isCurrentActive) || null;

  const switchUserRole = (role: UserRole, targetUserId?: string) => {
    if (targetUserId) {
      setCurrentUserId(targetUserId);
      return;
    }
    if (role === 'admin') {
      setCurrentUserId('user-admin-1');
    } else {
      setCurrentUserId('user-alumni-1');
    }
  };

  const updateProfile = (newProfile: AlumniProfile) => {
    setProfiles((prev) => ({
      ...prev,
      [newProfile.userId]: {
        ...newProfile,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const confirmAvailability = (userId: string) => {
    const prof = profiles[userId];
    if (!prof) return;
    const nowIso = new Date().toISOString();
    setProfiles((prev) => ({
      ...prev,
      [userId]: {
        ...prof,
        availabilityConfirmedAt: nowIso,
        updatedAt: nowIso,
      },
    }));
  };

  const uploadCV = async (file: File): Promise<{ success: boolean; error?: string }> => {
    if (file.type !== 'application/pdf') {
      return { success: false, error: 'Hanya dokumen berformat PDF yang diperbolehkan.' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Ukuran file melebihi batas maksimum 5 MB.' };
    }

    const newCvId = `cv-${Date.now()}`;
    const newCv: CVDocument = {
      id: newCvId,
      ownerId: currentUserId,
      fileName: file.name,
      fileSizeBytes: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      isCurrentActive: true,
      storageKey: `cvs/${currentUserId}_${Date.now()}.pdf`,
    };

    // Mark existing active CVs as inactive
    setCvs((prev) => [
      newCv,
      ...prev.map((c) => (c.ownerId === currentUserId ? { ...c, isCurrentActive: false } : c)),
    ]);

    return { success: true };
  };

  const setActiveCV = (cvId: string) => {
    setCvs((prev) =>
      prev.map((c) => {
        if (c.ownerId !== currentUserId) return c;
        return { ...c, isCurrentActive: c.id === cvId };
      })
    );
  };

  const deleteCV = (cvId: string) => {
    setCvs((prev) => prev.filter((c) => c.id !== cvId));
  };

  const addCompany = (comp: Omit<Company, 'id' | 'createdAt'>) => {
    const newComp: Company = {
      ...comp,
      id: `comp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCompanies((prev) => [newComp, ...prev]);
  };

  const addJob = (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
      publishedAt: jobData.status === 'published' ? nowIso : undefined,
    };
    setJobs((prev) => [newJob, ...prev]);
  };

  const updateJobStatus = (jobId: string, status: Job['status'], reason?: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          status,
          closedReason: status === 'closed' ? reason : j.closedReason,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Apply via BolBel (FR05)
  const applyViaBolBel = async (
    jobId: string,
    consentAccepted: boolean
  ): Promise<{ success: boolean; error?: string; processId?: string }> => {
    if (!consentAccepted) {
      return { success: false, error: 'Persetujuan (consent) pembagian CV dan profil wajib dicentang secara aktif.' };
    }

    const job = jobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'Lowongan tidak ditemukan.' };

    const prof = profiles[currentUserId];
    if (!prof) return { success: false, error: 'Lengkapi profilmu terlebih dahulu sebelum melamar.' };

    const cv = cvs.find((c) => c.ownerId === currentUserId && c.isCurrentActive);
    if (!cv) return { success: false, error: 'Unggah CV aktif terlebih dahulu (format PDF maks 5 MB).' };

    const existing = processes.find((p) => p.alumniId === currentUserId && p.jobId === jobId);
    if (existing) {
      return {
        success: false,
        error: `Kamu sudah memiliki lamaran/pengajuan terdaftar untuk lowongan ini (${existing.currentStage}).`,
      };
    }

    const processId = `proc-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newProcess: CandidateProcess = {
      id: processId,
      alumniId: currentUserId,
      alumniName: prof.fullName,
      alumniEmail: prof.email,
      jobId: job.id,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      origin: 'internal_apply',
      currentStage: 'masuk_bolbel',
      outcome: 'aktif',
      documentVersionId: cv.id,
      documentName: cv.fileName,
      profileSnapshot: {
        fullName: prof.fullName,
        email: prof.email,
        phone: prof.phone,
        domicile: prof.domicile,
        employmentStatus: prof.employmentStatus,
        opennessStatus: prof.opennessStatus,
        startReadiness: prof.startReadiness,
        experienceBand: prof.experienceBand,
        targetRoles: prof.targetRoles,
      },
      consentGrantedAt: nowIso,
      version: 1,
      lastStageUpdatedAt: nowIso,
      createdAt: nowIso,
    };

    const newConsent: ConsentRecord = {
      id: `consent-${Date.now()}`,
      processId,
      alumniId: currentUserId,
      jobId: job.id,
      companyName: job.companyName,
      jobTitle: job.title,
      documentVersionId: cv.id,
      documentName: cv.fileName,
      scopeDescription: `Persetujuan pembagian CV (${cv.fileName}) dan ringkasan profil kepada ${job.companyName} untuk posisi ${job.title}.`,
      policyVersion: 'v1.0-2026',
      grantedAt: nowIso,
    };

    const newEvent: ProcessEvent = {
      id: `ev-${Date.now()}`,
      processId,
      eventType: 'consent_granted',
      newStage: 'masuk_bolbel',
      actorId: currentUserId,
      actorName: prof.fullName,
      actorRole: 'alumni',
      sourceType: 'alumni_report',
      occurredAt: nowIso,
      recordedAt: nowIso,
      publicMessage: 'Lamaran tersimpan di BolBel. Tim akan meninjau sebelum meneruskannya ke company.',
    };

    // Auto-create task for Gifari to review application within 2 business days
    const reviewTask: FollowUpTask = {
      id: `task-${Date.now()}`,
      processId,
      jobId: job.id,
      alumniId: currentUserId,
      title: `Tinjau lamaran baru: ${prof.fullName} - ${job.title}`,
      description: `Periksa kesesuaian profil ${prof.fullName} untuk diteruskan ke ${job.companyName}.`,
      taskType: 'review_new_application',
      ownerName: 'Gifari',
      dueAt: daysAhead(2),
      status: 'pending',
      createdAt: nowIso,
    };

    setProcesses((prev) => [newProcess, ...prev]);
    setConsents((prev) => [newConsent, ...prev]);
    setEvents((prev) => [newEvent, ...prev]);
    setTasks((prev) => [reviewTask, ...prev]);

    return { success: true, processId };
  };

  // Report External Apply (FR06)
  const reportExternalApply = async (
    jobId: string,
    applyDate: string,
    notes: string
  ): Promise<{ success: boolean; error?: string }> => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'Lowongan tidak ditemukan.' };

    const prof = profiles[currentUserId];
    if (!prof) return { success: false, error: 'Lengkapi profilmu terlebih dahulu.' };

    const existing = processes.find((p) => p.alumniId === currentUserId && p.jobId === jobId);
    if (existing) {
      return {
        success: false,
        error: `Kamu sudah memiliki catatan lamaran untuk lowongan ini (${existing.currentStage}).`,
      };
    }

    const processId = `proc-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const cv = cvs.find((c) => c.ownerId === currentUserId && c.isCurrentActive);

    const newProcess: CandidateProcess = {
      id: processId,
      alumniId: currentUserId,
      alumniName: prof.fullName,
      alumniEmail: prof.email,
      jobId: job.id,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      origin: 'external_report',
      currentStage: 'dilaporkan_apply_eksternal',
      outcome: 'aktif',
      documentVersionId: cv?.id || 'none',
      documentName: cv?.fileName || 'Tidak diunggah ke portal (Apply mandiri)',
      profileSnapshot: {
        fullName: prof.fullName,
        email: prof.email,
        phone: prof.phone,
        domicile: prof.domicile,
        employmentStatus: prof.employmentStatus,
        opennessStatus: prof.opennessStatus,
        startReadiness: prof.startReadiness,
        experienceBand: prof.experienceBand,
        targetRoles: prof.targetRoles,
      },
      reportedApplyDate: applyDate,
      version: 1,
      lastStageUpdatedAt: nowIso,
      createdAt: nowIso,
    };

    const newEvent: ProcessEvent = {
      id: `ev-${Date.now()}`,
      processId,
      eventType: 'alumni_report',
      newStage: 'dilaporkan_apply_eksternal',
      actorId: currentUserId,
      actorName: prof.fullName,
      actorRole: 'alumni',
      sourceType: 'alumni_report',
      occurredAt: applyDate,
      recordedAt: nowIso,
      publicMessage: `Alumni melaporkan telah melamar mandiri di situs resmi ${job.companyName} pada tanggal ${applyDate}.`,
      internalNotes: notes,
    };

    const reportItem: AlumniReport = {
      id: `rep-${Date.now()}`,
      processId,
      alumniId: currentUserId,
      reportType: 'already_applied_external',
      reportDate: applyDate,
      details: notes,
      status: 'pending_review',
      createdAt: nowIso,
    };

    setProcesses((prev) => [newProcess, ...prev]);
    setEvents((prev) => [newEvent, ...prev]);
    setReports((prev) => [reportItem, ...prev]);

    return { success: true };
  };

  // Approve Admin Proactive Proposal (FR07)
  const approveAdminProposal = async (processId: string): Promise<{ success: boolean; error?: string }> => {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return { success: false, error: 'Proses tidak ditemukan.' };
    if (proc.currentStage !== 'menunggu_persetujuan') {
      return { success: false, error: 'Proses ini tidak dalam status menunggu persetujuan.' };
    }
    if (proc.alumniId !== currentUserId) {
      return { success: false, error: 'Hanya alumni terkait yang dapat menyetujui pengajuan ini.' };
    }
    if (proc.outcome !== 'aktif') {
      return { success: false, error: 'Pengajuan ini sudah tidak aktif.' };
    }

    const nowIso = new Date().toISOString();
    const newConsent: ConsentRecord = {
      id: `consent-${Date.now()}`,
      processId,
      alumniId: proc.alumniId,
      jobId: proc.jobId,
      companyName: proc.companyName,
      jobTitle: proc.jobTitle,
      documentVersionId: proc.documentVersionId,
      documentName: proc.documentName,
      scopeDescription: `Persetujuan alumni atas rekomendasi lowongan oleh admin BolBel kepada ${proc.companyName}.`,
      policyVersion: 'v1.0-2026',
      grantedAt: nowIso,
    };

    const newEvent: ProcessEvent = {
      id: `ev-${Date.now()}`,
      processId,
      eventType: 'consent_granted',
      previousStage: 'menunggu_persetujuan',
      newStage: 'masuk_bolbel',
      actorId: currentUserId,
      actorName: currentUser.fullName,
      actorRole: 'alumni',
      sourceType: 'alumni_report',
      occurredAt: nowIso,
      recordedAt: nowIso,
      publicMessage: 'Persetujuan pengajuan diberikan. Tim BolBel siap meneruskan CV ke company.',
    };

    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p;
        return {
          ...p,
          currentStage: 'masuk_bolbel',
          consentGrantedAt: nowIso,
          version: p.version + 1,
          lastStageUpdatedAt: nowIso,
        };
      })
    );

    setConsents((prev) => [newConsent, ...prev]);
    setEvents((prev) => [newEvent, ...prev]);

    // Create task for Gifari to forward CV
    setTasks((prev) => [
      {
        id: `task-${Date.now()}`,
        processId,
        jobId: proc.jobId,
        alumniId: proc.alumniId,
        title: `Kirimkan CV ${proc.alumniName} ke ${proc.companyName}`,
        description: 'Alumni telah menyetujui pengajuan. Kirimkan CV via email ke PIC.',
        taskType: 'forward_cv',
        ownerName: 'Gifari',
        dueAt: daysAhead(1),
        status: 'pending',
        createdAt: nowIso,
      },
      ...prev,
    ]);

    return { success: true };
  };

  // Reject Admin Proactive Proposal
  const rejectAdminProposal = async (processId: string, reason = 'Alumni menolak penawaran peluang ini.'): Promise<{ success: boolean; error?: string }> => {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return { success: false, error: 'Proses tidak ditemukan.' };
    if (proc.alumniId !== currentUserId) {
      return { success: false, error: 'Hanya alumni terkait yang dapat menolak pengajuan ini.' };
    }
    if (proc.currentStage !== 'menunggu_persetujuan' || proc.outcome !== 'aktif') {
      return { success: false, error: 'Pengajuan ini tidak lagi menunggu persetujuan.' };
    }

    const nowIso = new Date().toISOString();
    const newEvent: ProcessEvent = {
      id: `ev-${Date.now()}`,
      processId,
      eventType: 'status_change',
      previousStage: 'menunggu_persetujuan',
      newOutcome: 'tidak_menyetujui_pengajuan',
      actorId: currentUserId,
      actorName: currentUser.fullName,
      actorRole: 'alumni',
      sourceType: 'alumni_report',
      occurredAt: nowIso,
      recordedAt: nowIso,
      publicMessage: `Kandidat memilih untuk tidak melanjutkan penawaran ini: ${reason}`,
    };

    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p;
        return {
          ...p,
          outcome: 'tidak_menyetujui_pengajuan',
          version: p.version + 1,
          lastStageUpdatedAt: nowIso,
        };
      })
    );

    setEvents((prev) => [newEvent, ...prev]);
    return { success: true };
  };

  // Withdraw Application (also revokes consent)
  const withdrawApplication = async (processId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return { success: false, error: 'Proses tidak ditemukan.' };
    if (proc.alumniId !== currentUserId) {
      return { success: false, error: 'Hanya alumni terkait yang dapat menarik lamaran ini.' };
    }
    if (isTerminalOutcome(proc.outcome)) {
      return {
        success: false,
        error: `Proses sudah berstatus akhir (${OUTCOME_CONFIG[proc.outcome].label}) dan tidak dapat ditarik.`,
      };
    }

    const nowIso = new Date().toISOString();
    const hadConsent = Boolean(proc.consentGrantedAt && !proc.consentRevokedAt);

    const statusEvent: ProcessEvent = {
      id: newId('ev'),
      processId,
      eventType: 'status_change',
      previousStage: proc.currentStage,
      newStage: proc.currentStage,
      previousOutcome: proc.outcome,
      newOutcome: 'mengundurkan_diri',
      actorId: currentUserId,
      actorName: currentUser.fullName,
      actorRole: 'alumni',
      sourceType: 'alumni_report',
      occurredAt: nowIso,
      recordedAt: nowIso,
      publicMessage: `Alumni menarik diri dari proses seleksi. Alasan: ${reason}`,
      internalNotes: 'Penarikan diri tercatat. Mohon infokan company jika CV sudah sempat dikirim.',
    };

    const newEvents: ProcessEvent[] = [statusEvent];
    if (hadConsent) {
      newEvents.unshift({
        id: newId('ev'),
        processId,
        eventType: 'consent_revoked',
        previousStage: proc.currentStage,
        newStage: proc.currentStage,
        actorId: currentUserId,
        actorName: currentUser.fullName,
        actorRole: 'alumni',
        sourceType: 'alumni_report',
        occurredAt: nowIso,
        recordedAt: nowIso,
        publicMessage: 'Persetujuan pembagian CV dan profil dicabut oleh alumni.',
      });
    }

    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p;
        return {
          ...p,
          outcome: 'mengundurkan_diri',
          consentRevokedAt: hadConsent ? nowIso : p.consentRevokedAt,
          version: p.version + 1,
          lastStageUpdatedAt: nowIso,
        };
      })
    );

    if (hadConsent) {
      setConsents((prev) =>
        prev.map((c) => (c.processId === processId && !c.revokedAt ? { ...c, revokedAt: nowIso } : c))
      );
    }

    // Events are prepended, so reverse to keep consent_revoked displayed before the status change
    setEvents((prev) => [...newEvents.slice().reverse(), ...prev]);

    // If CV may already be with the company, create task for Gifari to notify company HR
    if (proc.currentStage !== 'masuk_bolbel' && proc.currentStage !== 'menunggu_persetujuan') {
      setTasks((prev) => [
        {
          id: newId('task'),
          processId,
          jobId: proc.jobId,
          alumniId: proc.alumniId,
          title: `Beri kabar ${proc.companyName}: ${proc.alumniName} Mengundurkan Diri`,
          description: `Kandidat menarik diri (${reason}). Informasikan kepada PIC HR ${proc.companyName}.`,
          taskType: 'followup_company',
          ownerName: 'Gifari',
          dueAt: daysAhead(1),
          status: 'pending',
          createdAt: nowIso,
        },
        ...prev,
      ]);
    }

    return { success: true };
  };

  // Forward CV to Company (Admin Action FR08)
  const forwardCVToCompany = async (
    processId: string,
    internalNotes: string,
    publicMessage?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'admin') return { success: false, error: 'Hanya admin yang dapat meneruskan CV.' };
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return { success: false, error: 'Proses tidak ditemukan.' };

    const job = jobs.find((j) => j.id === proc.jobId);
    const channel = job?.applyChannel || 'bolbel';

    // Verify consent
    const hasConsent = Boolean(proc.consentGrantedAt && !proc.consentRevokedAt);
    const transitionCheck = validateProcessUpdate(
      proc,
      { stage: 'diteruskan_ke_company', outcome: proc.outcome },
      hasConsent,
      channel
    );
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason };
    }

    const nowIso = new Date().toISOString();
    const newEvent: ProcessEvent = {
      id: `ev-${Date.now()}`,
      processId,
      eventType: 'forwarded_to_company',
      previousStage: proc.currentStage,
      newStage: 'diteruskan_ke_company',
      actorId: currentUserId,
      actorName: currentUser.fullName,
      actorRole: 'admin',
      sourceType: 'admin_official',
      occurredAt: nowIso,
      recordedAt: nowIso,
      publicMessage: publicMessage || `CV (${proc.documentName}) dan ringkasan profil telah resmi diteruskan oleh Gifari kepada tim recruitment ${proc.companyName}.`,
      internalNotes,
    };

    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p;
        return {
          ...p,
          currentStage: 'diteruskan_ke_company',
          version: p.version + 1,
          lastStageUpdatedAt: nowIso,
          lastFollowUpDate: nowIso,
        };
      })
    );

    setEvents((prev) => [newEvent, ...prev]);

    // Schedule 7-day follow up task
    setTasks((prev) => [
      {
        id: `task-${Date.now()}`,
        processId,
        jobId: proc.jobId,
        alumniId: proc.alumniId,
        title: `Follow-up 7 hari: ${proc.companyName} (${proc.alumniName})`,
        description: `Tanyakan hasil review CV atau jadwal screening kepada PIC recruitment ${proc.companyName}.`,
        taskType: 'followup_company',
        ownerName: 'Gifari',
        dueAt: daysAhead(7),
        status: 'pending',
        createdAt: nowIso,
      },
      ...prev,
    ]);

    return { success: true };
  };

  // Update Candidate Stage (Admin Action FR08)
  const updateCandidateStage = async (
    processId: string,
    newStage: SelectionStage,
    newOutcome: ProcessOutcome,
    sourceType: 'admin_official' | 'company_update',
    occurredAt: string,
    publicMessage?: string,
    internalNotes?: string,
    interviewSchedule?: string,
    actualStartDate?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'admin') return { success: false, error: 'Hanya admin yang dapat memperbarui tahap proses.' };
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return { success: false, error: 'Proses tidak ditemukan.' };

    const job = jobs.find((j) => j.id === proc.jobId);
    const hasConsent = Boolean(proc.consentGrantedAt && !proc.consentRevokedAt);
    const check = validateProcessUpdate(
      proc,
      { stage: newStage, outcome: newOutcome },
      hasConsent,
      job?.applyChannel || 'bolbel'
    );
    if (!check.allowed) return { success: false, error: check.reason };

    const nowIso = new Date().toISOString();
    const newEvent: ProcessEvent = {
      id: `ev-${Date.now()}`,
      processId,
      eventType: 'status_change',
      previousStage: proc.currentStage,
      newStage,
      previousOutcome: proc.outcome,
      newOutcome,
      actorId: currentUserId,
      actorName: currentUser.fullName,
      actorRole: 'admin',
      sourceType,
      occurredAt: occurredAt || nowIso,
      recordedAt: nowIso,
      publicMessage: publicMessage || `Tahap seleksi diperbarui menjadi ${newStage}.`,
      internalNotes,
    };

    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p;
        return {
          ...p,
          currentStage: newStage,
          outcome: newOutcome,
          interviewSchedule: interviewSchedule || p.interviewSchedule,
          actualStartDate: actualStartDate || p.actualStartDate,
          version: p.version + 1,
          lastStageUpdatedAt: nowIso,
        };
      })
    );

    setEvents((prev) => [newEvent, ...prev]);
    return { success: true };
  };

  // Create Proactive Proposal (FR07)
  const createProactiveProposal = async (alumniId: string, jobId: string): Promise<{ success: boolean; error?: string }> => {
    const prof = profiles[alumniId];
    if (!prof) return { success: false, error: 'Profil alumni tidak ditemukan.' };

    if (!prof.allowProactiveContact) {
      return {
        success: false,
        error: 'Alumni ini tidak mengaktifkan izin penawaran proaktif. Alumni hanya dapat melamar mandiri.',
      };
    }

    const job = jobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'Lowongan tidak ditemukan.' };

    const existing = processes.find((p) => p.alumniId === alumniId && p.jobId === jobId);
    if (existing) {
      return { success: false, error: 'Kandidat sudah memiliki catatan proses pada lowongan ini.' };
    }

    const cv = cvs.find((c) => c.ownerId === alumniId && c.isCurrentActive);
    if (!cv) {
      return { success: false, error: 'Alumni belum memiliki CV aktif yang terverifikasi.' };
    }

    const processId = `proc-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newProcess: CandidateProcess = {
      id: processId,
      alumniId,
      alumniName: prof.fullName,
      alumniEmail: prof.email,
      jobId: job.id,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      origin: 'admin_proactive',
      currentStage: 'menunggu_persetujuan',
      outcome: 'aktif',
      documentVersionId: cv.id,
      documentName: cv.fileName,
      profileSnapshot: {
        fullName: prof.fullName,
        email: prof.email,
        phone: prof.phone,
        domicile: prof.domicile,
        employmentStatus: prof.employmentStatus,
        opennessStatus: prof.opennessStatus,
        startReadiness: prof.startReadiness,
        experienceBand: prof.experienceBand,
        targetRoles: prof.targetRoles,
      },
      version: 1,
      lastStageUpdatedAt: nowIso,
      createdAt: nowIso,
    };

    const newEvent: ProcessEvent = {
      id: `ev-${Date.now()}`,
      processId,
      eventType: 'status_change',
      newStage: 'menunggu_persetujuan',
      actorId: currentUserId,
      actorName: currentUser.fullName,
      actorRole: 'admin',
      sourceType: 'admin_official',
      occurredAt: nowIso,
      recordedAt: nowIso,
      publicMessage: `Tim BolBel mengajukan penawaran posisi ${job.title} di ${job.companyName}. Menunggu persetujuan alumni.`,
    };

    setProcesses((prev) => [newProcess, ...prev]);
    setEvents((prev) => [newEvent, ...prev]);

    return { success: true };
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newStatus = t.status === 'pending' ? 'completed' : 'pending';
        return {
          ...t,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  const createFollowUpTask = (taskData: Omit<FollowUpTask, 'id' | 'createdAt' | 'status'>) => {
    const newTask: FollowUpTask = {
      ...taskData,
      id: `task-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const importRosterBatch = (newEntries: Omit<AlumniRosterEntry, 'id' | 'invitedAt'>[]): number => {
    let addedCount = 0;
    const nowIso = new Date().toISOString();
    const created: AlumniRosterEntry[] = [];

    newEntries.forEach((entry, idx) => {
      // Check if already in roster
      const exists = roster.some((r) => r.email.toLowerCase() === entry.email.toLowerCase());
      if (!exists) {
        created.push({
          ...entry,
          id: `roster-${Date.now()}-${idx}`,
          invitedAt: nowIso,
        });
        addedCount++;
      }
    });

    if (created.length > 0) {
      setRoster((prev) => [...created, ...prev]);
    }
    return addedCount;
  };

  const resetAllToSeed = () => {
    localStorage.clear();
    setCurrentUserId('user-alumni-1');
    setRoster(INITIAL_ROSTER);
    setProfiles(INITIAL_PROFILES);
    setCvs(INITIAL_CVS);
    setCompanies(INITIAL_COMPANIES);
    setJobs(INITIAL_JOBS);
    setProcesses(INITIAL_PROCESSES);
    setConsents(INITIAL_CONSENTS);
    setEvents(INITIAL_EVENTS);
    setReports(INITIAL_REPORTS);
    setTasks(INITIAL_TASKS);
  };

  return (
    <DataStoreContext.Provider
      value={{
        currentUser,
        switchUserRole,
        users,
        roster,
        profiles,
        currentProfile,
        updateProfile,
        confirmAvailability,
        cvs,
        activeCv,
        uploadCV,
        setActiveCV,
        deleteCV,
        companies,
        addCompany,
        jobs,
        addJob,
        updateJobStatus,
        processes,
        events,
        consents,
        reports,
        tasks,
        applyViaBolBel,
        reportExternalApply,
        approveAdminProposal,
        rejectAdminProposal,
        withdrawApplication,
        forwardCVToCompany,
        updateCandidateStage,
        createProactiveProposal,
        toggleTaskStatus,
        createFollowUpTask,
        importRosterBatch,
        resetAllToSeed,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
};

export const useDataStore = () => {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used within DataStoreProvider');
  return ctx;
};

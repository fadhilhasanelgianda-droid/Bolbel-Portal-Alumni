import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isProfileFresh,
  isMinimumProfileComplete,
  checkCanApply,
  canTransitionStage,
  parseAndValidateRosterCsv,
} from './stateMachine.ts';
import type { AlumniProfile, CVDocument, Job, CandidateProcess } from './types.ts';

test('isProfileFresh returns correct status based on 30 days threshold', () => {
  const now = new Date();
  const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(isProfileFresh(recentDate).isFresh, true);
  assert.equal(isProfileFresh(oldDate).isFresh, false);
  assert.equal(isProfileFresh(undefined).isFresh, false);
});

test('isMinimumProfileComplete verifies required application fields', () => {
  const dummyProfile: AlumniProfile = {
    userId: 'u1',
    fullName: 'Fadhil Pratama',
    email: 'fadhil@bolehdicoba.com',
    program: 'Full Course',
    batch: 'Batch 10',
    employmentStatus: 'belum_bekerja',
    opennessStatus: 'aktif_mencari',
    startReadiness: 'segera',
    targetRoles: ['Digital Marketing Specialist'],
    targetWorkTypes: ['full_time'],
    targetWorkModels: ['hybrid'],
    domicile: 'Jakarta Selatan',
    targetLocations: ['Jakarta', 'Bandung'],
    experienceBand: '1-2_tahun',
    allowProactiveContact: true,
    whatsappContact: true,
    availabilityConfirmedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validCheck = isMinimumProfileComplete(dummyProfile, 1);
  assert.equal(validCheck.isComplete, true);
  assert.equal(validCheck.missingFields.length, 0);

  const missingCvCheck = isMinimumProfileComplete(dummyProfile, 0);
  assert.equal(missingCvCheck.isComplete, false);
  assert.ok(missingCvCheck.missingFields.includes('CV Aktif (PDF <= 5MB)'));

  const emptyProfileCheck = isMinimumProfileComplete(null, 1);
  assert.equal(emptyProfileCheck.isComplete, false);
});

test('checkCanApply enforces job status, deadline, and prevents duplicate applications', () => {
  const dummyJob: Job = {
    id: 'job-1',
    companyId: 'comp-1',
    companyName: 'Tiket.com',
    title: 'Performance Marketing Specialist',
    summary: 'Lead paid ads growth.',
    responsibilities: ['Manage paid search'],
    requirements: ['2 years experience'],
    experienceLevel: 'junior',
    workType: 'full_time',
    workModel: 'hybrid',
    location: 'Jakarta',
    openingsCount: 1,
    salaryType: 'range',
    salaryMin: 8000000,
    salaryMax: 12000000,
    applyChannel: 'bolbel',
    status: 'published',
    processOwner: 'Gifari',
    deadlineDate: '2026-12-31',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dummyProfile: AlumniProfile = {
    userId: 'u1',
    fullName: 'Fadhil Pratama',
    email: 'fadhil@bolehdicoba.com',
    program: 'Full Course',
    batch: 'Batch 10',
    employmentStatus: 'belum_bekerja',
    opennessStatus: 'aktif_mencari',
    startReadiness: 'segera',
    targetRoles: ['Digital Marketing Specialist'],
    targetWorkTypes: ['full_time'],
    targetWorkModels: ['hybrid'],
    domicile: 'Jakarta Selatan',
    targetLocations: ['Jakarta'],
    experienceBand: '1-2_tahun',
    allowProactiveContact: true,
    whatsappContact: true,
    availabilityConfirmedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dummyCv: CVDocument = {
    id: 'cv-1',
    ownerId: 'u1',
    fileName: 'CV_Fadhil_Pratama.pdf',
    fileSizeBytes: 1024 * 1024,
    fileType: 'application/pdf',
    uploadedAt: new Date().toISOString(),
    isCurrentActive: true,
    storageKey: 'cvs/u1_cv1.pdf',
  };

  // Valid apply
  const validRes = checkCanApply(dummyJob, dummyProfile, dummyCv, null);
  assert.equal(validRes.canApply, true);

  // Closed job
  const closedJob = { ...dummyJob, status: 'closed' as const };
  const closedRes = checkCanApply(closedJob, dummyProfile, dummyCv, null);
  assert.equal(closedRes.canApply, false);

  // Past deadline job
  const expiredJob = { ...dummyJob, deadlineDate: '2025-01-01' };
  const expiredRes = checkCanApply(expiredJob, dummyProfile, dummyCv, null);
  assert.equal(expiredRes.canApply, false);

  // Duplicate application
  const existingProcess: CandidateProcess = {
    id: 'proc-1',
    alumniId: 'u1',
    alumniName: 'Fadhil Pratama',
    alumniEmail: 'fadhil@bolehdicoba.com',
    jobId: 'job-1',
    jobTitle: 'Performance Marketing Specialist',
    companyId: 'comp-1',
    companyName: 'Tiket.com',
    origin: 'internal_apply',
    currentStage: 'masuk_bolbel',
    outcome: 'aktif',
    documentVersionId: 'cv-1',
    documentName: 'CV_Fadhil.pdf',
    profileSnapshot: {
      fullName: 'Fadhil Pratama',
      email: 'fadhil@bolehdicoba.com',
      domicile: 'Jakarta',
      employmentStatus: 'belum_bekerja',
      opennessStatus: 'aktif_mencari',
      startReadiness: 'segera',
      experienceBand: '1-2_tahun',
      targetRoles: ['Marketing'],
    },
    version: 1,
    lastStageUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const duplicateRes = checkCanApply(dummyJob, dummyProfile, dummyCv, existingProcess);
  assert.equal(duplicateRes.canApply, false);
  assert.ok(duplicateRes.reason?.includes('sudah memiliki catatan lamaran'));
});

test('canTransitionStage enforces consent when forwarding CV via BolBel', () => {
  // bolbel channel forward without consent is blocked
  const blockedForward = canTransitionStage('masuk_bolbel', 'diteruskan_ke_company', false, 'bolbel');
  assert.equal(blockedForward.allowed, false);
  assert.ok(blockedForward.reason?.includes('persetujuan (consent) aktif'));

  // bolbel channel forward WITH consent is allowed
  const allowedForward = canTransitionStage('masuk_bolbel', 'diteruskan_ke_company', true, 'bolbel');
  assert.equal(allowedForward.allowed, true);
});

test('parseAndValidateRosterCsv validates format and flags duplicates', () => {
  const csvContent = `Email,Nama Lengkap,Program,Batch,Eligibility
fadhil@bolehdicoba.com,Fadhil Pratama,Full Course,Batch 10,eligible
invalid-email,Budi Santoso,Career Prep,Batch 8,eligible
sarah@example.com,Sarah Annisa,Full Course,Batch 9,eligible`;

  const results = parseAndValidateRosterCsv(csvContent, ['sarah@example.com']);
  assert.equal(results.length, 3);
  
  // Row 1: valid
  assert.equal(results[0].isValid, true);
  assert.equal(results[0].email, 'fadhil@bolehdicoba.com');

  // Row 2: invalid email
  assert.equal(results[1].isValid, false);
  assert.ok(results[1].errors.some(e => e.includes('Format email tidak valid')));

  // Row 3: duplicate of existing email
  assert.equal(results[2].isValid, false);
  assert.equal(results[2].isDuplicate, true);
});

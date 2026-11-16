// Fills a LOCAL database with demo data so the app can be tried end to end.
// Refuses to run in production. Every demo account uses the password below.
import bcrypt from 'bcryptjs';
import { getPool, tx } from '../src/server/db.ts';
import { runMigrations } from '../src/server/migrate.ts';

if (process.env.NODE_ENV === 'production') throw new Error('seed-demo must not run in production');

const PASSWORD = 'demo-password-123';
const hash = await bcrypt.hash(PASSWORD, 10);
await runMigrations();

const ids = await tx(async (c) => {
  const user = async (email: string, name: string, role: 'admin' | 'alumni', program?: string, batch?: string, eligibility = 'eligible') => {
    let rosterId: string | null = null;
    if (role === 'alumni') {
      rosterId = (
        await c.query(
          `INSERT INTO roster_entries (email, full_name, program, batch, eligibility, activated_at)
           VALUES ($1,$2,$3,$4,$5, CASE WHEN $5 = 'eligible' THEN now() END)
           ON CONFLICT ((lower(email))) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
          [email, name, program, batch, eligibility]
        )
      ).rows[0].id;
      if (eligibility !== 'eligible') return null;
    }
    return (
      await c.query(
        `INSERT INTO users (email, password_hash, role, full_name, roster_id) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT ((lower(email))) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
        [email, hash, role, name, rosterId]
      )
    ).rows[0].id as string;
  };

  const admin = await user('gifari@bolehbelajar.com', 'Gifari (Talent Lead BolBel)', 'admin');
  const fadhil = await user('fadhil@bolehdicoba.com', 'Fadhil Pratama', 'alumni', 'Full Course', 'Batch 10');
  const sarah = await user('sarah.annisa@alumni.com', 'Sarah Annisa', 'alumni', 'Performance Marketing Specialization', 'Batch 8');
  const dimas = await user('dimas.w@alumni.com', 'Dimas Wicaksono', 'alumni', 'Digital Marketing Intensive', 'Batch 12');
  // Not activated yet: use "Aktivasi Akun" with this email to try first-time activation
  await c.query(
    `INSERT INTO roster_entries (email, full_name, program, batch) VALUES ('baru@alumni.com','Alumni Baru','Career Prep','Batch 9')
     ON CONFLICT ((lower(email))) DO NOTHING`
  );

  const profile = (u: string, f: Record<string, unknown>) =>
    c.query(
      `INSERT INTO alumni_profiles (user_id, phone, whatsapp_contact, employment_status, openness_status, start_readiness,
         target_roles, target_work_types, target_work_models, domicile, target_locations, experience_band,
         allow_proactive_contact, availability_confirmed_at)
       VALUES ($1,$2,true,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now() - ($13 || ' days')::interval)
       ON CONFLICT (user_id) DO NOTHING`,
      [u, f.phone, f.emp, f.open, f.start, f.roles, f.types, f.models, f.dom, f.locs, f.exp, f.proactive, f.daysAgo]
    );
  await profile(fadhil!, { phone: '081298765432', emp: 'belum_bekerja', open: 'aktif_mencari', start: 'segera', roles: ['Performance Marketing Specialist', 'Paid Ads Associate'], types: ['full_time', 'contract'], models: ['hybrid', 'remote'], dom: 'Jakarta Selatan', locs: ['Jakarta', 'Bandung'], exp: '1-2_tahun', proactive: true, daysAgo: 4 });
  await profile(sarah!, { phone: '081345678901', emp: 'bekerja', open: 'terbuka', start: 'notice_period', roles: ['Paid Ads Lead'], types: ['full_time'], models: ['hybrid', 'remote'], dom: 'Jakarta Barat', locs: ['Jakarta'], exp: '2-4_tahun', proactive: true, daysAgo: 42 }); // stale -> "Perlu konfirmasi"
  await profile(dimas!, { phone: '087788990011', emp: 'belum_bekerja', open: 'aktif_mencari', start: 'segera', roles: ['Social Media Specialist'], types: ['full_time', 'internship'], models: ['remote'], dom: 'Bandung', locs: ['Bandung'], exp: '<1_tahun', proactive: false, daysAgo: 12 });

  // CV rows are metadata only until real upload exists
  for (const [u, name] of [[fadhil, 'CV_Fadhil_Pratama_2026.pdf'], [sarah, 'CV_Sarah_Annisa.pdf'], [dimas, 'CV_Dimas_Wicaksono.pdf']] as const) {
    await c.query(
      `INSERT INTO cv_documents (owner_id, file_name, file_size_bytes, file_type, is_current_active, storage_key)
       VALUES ($1,$2,1400000,'application/pdf',true,$3) ON CONFLICT (storage_key) DO NOTHING`,
      [u, name, `demo/${u}.pdf`]
    );
  }

  const company = async (name: string, industry: string, src: string, pic: string, notes: string) =>
    (await c.query(
      `INSERT INTO companies (name, industry, relationship_source, internal_pic_name, internal_notes)
       SELECT $1::text,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = $1) RETURNING id`,
      [name, industry, src, pic, notes]
    )).rows[0]?.id ?? (await c.query('SELECT id FROM companies WHERE name = $1', [name])).rows[0].id;
  const tiket = await company('Tiket.com', 'Online Travel Agent', 'company_inbound', 'Clarissa (TA)', 'Cari talent Meta/Google Ads.');
  const bdd = await company('Boleh Dicoba Digital', 'Digital Growth Agency', 'company_inbound', 'Reza (People Ops)', 'Prioritas alumni BolBel.');
  const goto = await company('GoTo Financial', 'Fintech', 'gifari_sourcing', 'Andra (HR Tech)', 'Jalur eksternal resmi.');

  const job = async (co: string, title: string, summary: string, channel: string, status: string, extra: { url?: string; min?: number; max?: number; deadline?: number }) => {
    const exists = await c.query('SELECT id FROM jobs WHERE title = $1 AND company_id = $2', [title, co]);
    if (exists.rows[0]) return exists.rows[0].id as string;
    return (await c.query(
      `INSERT INTO jobs (company_id, title, summary, responsibilities, requirements, experience_level, work_type, work_model, location,
         openings_count, salary_type, salary_min, salary_max, salary_period, apply_channel, external_apply_url, status, process_owner,
         deadline_date, published_at)
       VALUES ($1,$2,$3,$4,$5,'junior','full_time','hybrid','Jakarta',1,$6,$7,$8,$9,$10,$11,$12,'Gifari',
               CASE WHEN $13::int IS NULL THEN NULL ELSE (current_date + $13::int) END, now()) RETURNING id`,
      [co, title, summary, ['Mengelola kampanye berbayar', 'Analisis performa harian'], ['Alumni Boleh Belajar', 'Menguasai Meta Ads & GA4'],
       extra.min ? 'range' : 'uninformed', extra.min ?? null, extra.max ?? null, extra.min ? 'bulan' : null,
       channel, extra.url ?? null, status, extra.deadline ?? null]
    )).rows[0].id as string;
  };
  await job(tiket, 'Performance Marketing Specialist', 'Optimasi kampanye Meta Ads & Google Ads untuk Flight dan Hotel.', 'bolbel', 'published', { min: 9000000, max: 13000000, deadline: 20 });
  await job(bdd, 'Paid Ads Specialist (Meta & TikTok)', 'Strategi paid media multi-brand e-commerce.', 'bolbel', 'published', { min: 7500000, max: 11000000, deadline: 14 });
  await job(goto, 'Growth Marketing Associate', 'Akuisisi merchant dan user baru produk pembayaran digital.', 'external', 'published', { url: 'https://careers.goto.com/jobs/growth-marketing-assoc', deadline: 10 });
  return { admin, fadhil, sarah, dimas };
});

await getPool().end();
console.log(`Demo data ready. All demo accounts use password: ${PASSWORD}`);
console.log('  admin : gifari@bolehbelajar.com');
console.log('  alumni: fadhil@bolehdicoba.com | sarah.annisa@alumni.com | dimas.w@alumni.com');
console.log('  belum diaktivasi (coba "Aktivasi Akun"): baru@alumni.com');
void ids;

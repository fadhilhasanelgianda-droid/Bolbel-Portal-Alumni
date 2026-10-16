import bcrypt from 'bcryptjs';
import { getPool } from '../src/server/db.ts';
import { emailSchema, passwordSchema } from '../src/server/validation.ts';

const email = emailSchema.parse(process.env.ADMIN_EMAIL);
const password = passwordSchema.parse(process.env.ADMIN_PASSWORD);
const pool = getPool();

if ((await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [email])).rowCount) {
  console.log(`${email} already exists, nothing to do`);
} else {
  await pool.query(`INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, $2, 'admin', 'Admin BolBel')`, [
    email,
    await bcrypt.hash(password, 12),
  ]);
  console.log(`created admin ${email}`);
}
await pool.end();

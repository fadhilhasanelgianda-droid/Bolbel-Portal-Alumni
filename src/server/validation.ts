import { z } from 'zod';

export const emailSchema = z.string().trim().max(254).email().transform((e) => e.toLowerCase());
export const passwordSchema = z.string().min(10, 'Password minimal 10 karakter').max(128);

import { NextResponse } from 'next/server';
import { getCurrentUser, jsonError } from '@/server/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError('Belum masuk.', 401);
  return NextResponse.json({ user });
}

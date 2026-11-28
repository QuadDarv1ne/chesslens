// Доступные способы оплаты в текущем окружении.
// GET /api/payments/providers
import { NextResponse } from 'next/server';
import { listAvailableProviders } from '@/lib/payments/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = listAvailableProviders();
  return NextResponse.json({
    providers,
    default: providers[0]?.id ?? null,
  });
}

// Возврат пользователя после оплаты (return_url у провайдера).
// GET /api/payments/callback
// Провайдеры редиректят сюда после оплаты; окончательный статус
// подтверждается вебхуком, поэтому здесь просто уводим в кабинет.
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
  return NextResponse.redirect(`${base}/dashboard?payment=processing`);
}

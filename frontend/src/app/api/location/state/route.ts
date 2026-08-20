import { NextRequest, NextResponse } from 'next/server';
import { isIP } from 'node:net';
import { isSupportedEventState, normalizeEventStateFilter } from '@/lib/event-states';

export const dynamic = 'force-dynamic';

function forwardedIp(request: NextRequest) {
  const candidate = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

export async function GET(request: NextRequest) {
  const headerState = request.headers.get('x-vercel-ip-country-region')?.toUpperCase();
  if (isSupportedEventState(headerState)) {
    return NextResponse.json({ state: headerState }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const ip = forwardedIp(request);
  if (!ip) {
    return NextResponse.json({ state: 'ALL' }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/region_code/`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
      headers: { Accept: 'text/plain' },
    });
    const state = response.ok ? normalizeEventStateFilter((await response.text()).trim()) : 'ALL';
    return NextResponse.json({ state }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ state: 'ALL' }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}

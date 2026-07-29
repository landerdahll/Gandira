import { NextRequest, NextResponse } from 'next/server';
import {
  PREVIEW_ACCESS_COOKIE,
  PREVIEW_ACCESS_MAX_AGE,
  PREVIEW_ACCESS_PATH,
  PROTECTED_PREVIEW_HOST,
  createPreviewCookieValue,
} from '@/lib/preview-access';

export const runtime = 'nodejs';

function requestHostname(request: NextRequest) {
  return (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
}

function safeDestination(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/';
}

export async function POST(request: NextRequest) {
  if (requestHostname(request) !== PROTECTED_PREVIEW_HOST) {
    return new NextResponse(null, { status: 404 });
  }

  const form = await request.formData();
  const passwordField = form.get('password');
  const destination = safeDestination(form.get('next'));
  const receivedPassword = typeof passwordField === 'string' ? passwordField.trim() : '';
  const configuredPassword = process.env.PREVIEW_PASSWORD?.trim() ?? '';
  const cookieSecret = process.env.PREVIEW_COOKIE_SECRET;
  const passwordMatches = configuredPassword.length > 0 && receivedPassword === configuredPassword;

  if (!passwordMatches || !cookieSecret) {
    const errorUrl = new URL(PREVIEW_ACCESS_PATH, request.url);
    errorUrl.searchParams.set('error', 'invalid');
    errorUrl.searchParams.set('next', destination);
    const response = NextResponse.redirect(errorUrl, 303);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set({
    name: PREVIEW_ACCESS_COOKIE,
    value: await createPreviewCookieValue(cookieSecret),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PREVIEW_ACCESS_MAX_AGE,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

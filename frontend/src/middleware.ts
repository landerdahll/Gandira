import { NextRequest, NextResponse } from 'next/server';
import {
  PREVIEW_ACCESS_COOKIE,
  PREVIEW_ACCESS_PATH,
  PROTECTED_PREVIEW_HOST,
  isValidPreviewCookie,
} from '@/lib/preview-access';

const NO_INDEX = 'noindex, nofollow, noarchive, nosnippet, noimageindex';

function requestHostname(request: NextRequest) {
  return (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
}

function isPreviewAccessAsset(pathname: string) {
  return pathname.startsWith('/_next/')
    || pathname === '/favicon.ico'
    || pathname.startsWith('/favicon-')
    || pathname.endsWith('.svg')
    || pathname.endsWith('.png')
    || pathname.endsWith('.jpg')
    || pathname.endsWith('.jpeg')
    || pathname.endsWith('.webp')
    || pathname.endsWith('.woff2');
}

function applyProtectedHostHeaders(response: NextResponse) {
  response.headers.set('X-Robots-Tag', NO_INDEX);
  return response;
}

export async function middleware(request: NextRequest) {
  if (requestHostname(request) !== PROTECTED_PREVIEW_HOST) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === '/robots.txt') {
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': NO_INDEX,
      },
    });
  }

  if (
    request.nextUrl.pathname === PREVIEW_ACCESS_PATH
    || request.nextUrl.pathname === '/api/preview-access'
    || isPreviewAccessAsset(request.nextUrl.pathname)
  ) {
    const response = NextResponse.next();
    if (request.nextUrl.pathname === PREVIEW_ACCESS_PATH) {
      response.headers.set('Cache-Control', 'no-store');
    }
    return applyProtectedHostHeaders(response);
  }

  const cookie = request.cookies.get(PREVIEW_ACCESS_COOKIE)?.value;
  const secret = process.env.PREVIEW_COOKIE_SECRET;

  if (secret && cookie && await isValidPreviewCookie(cookie, secret)) {
    return applyProtectedHostHeaders(NextResponse.next());
  }

  const accessUrl = request.nextUrl.clone();
  accessUrl.pathname = PREVIEW_ACCESS_PATH;
  accessUrl.search = '';
  accessUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = NextResponse.redirect(accessUrl);
  response.headers.set('Cache-Control', 'no-store');
  return applyProtectedHostHeaders(response);
}

export const config = {
  matcher: '/:path*',
};

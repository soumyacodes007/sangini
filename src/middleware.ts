// Route Protection Middleware
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // For API routes without token, return 401
    if (pathname.startsWith('/api/') && !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based route protection for dashboard
    if (pathname.startsWith('/dashboard/admin') && token?.userType !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Suppliers only routes
    if (pathname.startsWith('/dashboard/create') && token?.userType !== 'SUPPLIER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Buyers only routes
    if (pathname.startsWith('/dashboard/requests') && token?.userType !== 'BUYER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Investors only routes (portfolio, market)
    const investorRoutes = ['/dashboard/portfolio', '/dashboard/market'];
    if (investorRoutes.some(route => pathname.startsWith(route)) && token?.userType !== 'INVESTOR') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // KYC required for investing
    if (pathname.startsWith('/dashboard/invest') && token?.kycStatus !== 'APPROVED') {
      return NextResponse.redirect(new URL('/dashboard/kyc', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes - no auth required
        const publicRoutes = ['/', '/auth/signin', '/auth/register', '/auth/error'];
        if (publicRoutes.includes(pathname)) {
          return true;
        }

        // API routes that don't need auth
        if (pathname.startsWith('/api/auth')) {
          return true;
        }

        // For API routes, we handle auth in the middleware function above
        // Return true here to let the middleware function handle it
        if (pathname.startsWith('/api/')) {
          return true;
        }

        // Dashboard routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/api/invoices/:path*',
    '/api/orders/:path*',
    '/api/insurance/:path*',
    '/api/kyc/:path*',
    '/api/upload/:path*',
    '/api/stats/:path*',
  ],
};

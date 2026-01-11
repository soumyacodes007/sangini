// Auth Middleware Helpers
import { getServerSession } from 'next-auth';
import { authOptions, UserType } from './auth';
import { NextResponse } from 'next/server';

export class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Require authentication for API route
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new APIError(401, 'Unauthorized - Please sign in');
  }
  
  return session;
}

/**
 * Require specific user type(s)
 */
export async function requireUserType(allowedTypes: UserType[]) {
  const session = await requireAuth();
  
  if (!allowedTypes.includes(session.user.userType)) {
    throw new APIError(403, `Forbidden - Required role: ${allowedTypes.join(' or ')}`);
  }
  
  return session;
}

/**
 * Require KYC approval
 */
export async function requireKYC() {
  const session = await requireAuth();
  
  if (session.user.kycStatus !== 'APPROVED') {
    throw new APIError(403, 'KYC approval required');
  }
  
  return session;
}

/**
 * Handle API errors consistently
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Wrapper for API routes with error handling
 */
export function withErrorHandler(
  handler: (request: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (request: Request, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

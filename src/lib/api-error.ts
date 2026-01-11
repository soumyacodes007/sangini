// API Error Handling Utilities
import { NextResponse } from 'next/server';

/**
 * Custom API Error class with status code
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Common error types
 */
export const Errors = {
  Unauthorized: () => new APIError(401, 'Unauthorized', 'UNAUTHORIZED'),
  Forbidden: (message = 'Forbidden') => new APIError(403, message, 'FORBIDDEN'),
  NotFound: (resource = 'Resource') => new APIError(404, `${resource} not found`, 'NOT_FOUND'),
  BadRequest: (message: string) => new APIError(400, message, 'BAD_REQUEST'),
  Conflict: (message: string) => new APIError(409, message, 'CONFLICT'),
  TooManyRequests: () => new APIError(429, 'Too many requests', 'RATE_LIMITED'),
  InternalError: (message = 'Internal server error') => new APIError(500, message, 'INTERNAL_ERROR'),
  ServiceUnavailable: (message = 'Service unavailable') => new APIError(503, message, 'SERVICE_UNAVAILABLE'),
};

/**
 * Handle API errors and return appropriate response
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Handle Stellar SDK errors
  if (error instanceof Error && error.message.includes('Simulation failed')) {
    return NextResponse.json(
      {
        error: 'Transaction simulation failed',
        code: 'SIMULATION_FAILED',
        details: error.message,
      },
      { status: 400 }
    );
  }

  // Handle MongoDB errors
  if (error instanceof Error && error.name === 'MongoError') {
    return NextResponse.json(
      {
        error: 'Database error',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }

  // Generic error
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler<T>(
  handler: (request: Request, context?: T) => Promise<NextResponse>
) {
  return async (request: Request, context?: T): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): void {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length > 0) {
    throw Errors.BadRequest(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate that a value is a valid ObjectId string
 */
export function validateObjectId(id: string, fieldName = 'ID'): void {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw Errors.BadRequest(`Invalid ${fieldName} format`);
  }
}

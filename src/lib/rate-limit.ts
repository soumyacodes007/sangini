// Rate Limiting Utility
// Simple in-memory rate limiting for API routes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export const RateLimitPresets = {
  // Authenticated users: 100 requests per minute
  authenticated: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Unauthenticated users: 20 requests per minute
  unauthenticated: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  // Strict: 10 requests per minute (for sensitive operations)
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Very strict: 5 requests per minute (for very sensitive operations)
  veryStrict: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RateLimitPresets.authenticated
): RateLimitResult {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return {
    success,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: success ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create identifier from request
 */
export function getIdentifier(
  request: Request,
  userId?: string
): string {
  // Use user ID if authenticated
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware helper
 * Returns null if allowed, or a Response if rate limited
 */
export function rateLimit(
  request: Request,
  userId?: string,
  config?: RateLimitConfig
): { allowed: boolean; headers: Record<string, string>; retryAfter?: number } {
  const identifier = getIdentifier(request, userId);
  const preset = userId ? RateLimitPresets.authenticated : RateLimitPresets.unauthenticated;
  const result = checkRateLimit(identifier, config || preset);
  const headers = getRateLimitHeaders(result);

  return {
    allowed: result.success,
    headers,
    retryAfter: result.retryAfter,
  };
}

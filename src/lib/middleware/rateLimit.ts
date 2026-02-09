import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter for development
// In production, use Redis or similar

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT = 5; // requests
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(request: NextRequest, identifier?: string): NextResponse | null {
  // Use IP address as identifier if not provided
  const reqWithIp = request as NextRequest & { ip?: string };
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = reqWithIp.ip ?? (forwarded ? forwarded.split(',')[0]?.trim() : undefined);
  const key = identifier || ip || 'unknown';

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return null; // Allow request
  }

  if (entry.count >= RATE_LIMIT) {
    // Rate limit exceeded
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: 'Demasiados intentos. Intente nuevamente más tarde.',
        retryAfter: resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
        },
      }
    );
  }

  // Increment counter
  entry.count++;
  rateLimitMap.set(key, entry);

  return null; // Allow request
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute
export class RateLimiter {
  private attempts: Map<string, { count: number; windowStart: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMinutes: number = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, windowStart: now });
      return { success: true, remaining: this.maxAttempts - 1, resetTime: now + this.windowMs };
    }

    if (now > record.windowStart + this.windowMs) {
      // Reset window
      this.attempts.set(identifier, { count: 1, windowStart: now });
      return { success: true, remaining: this.maxAttempts - 1, resetTime: now + this.windowMs };
    }

    if (record.count >= this.maxAttempts) {
      return { success: false, remaining: 0, resetTime: record.windowStart + this.windowMs };
    }

    record.count++;
    this.attempts.set(identifier, record);
    return { success: true, remaining: this.maxAttempts - record.count, resetTime: record.windowStart + this.windowMs };
  }
}

// Global instance to persist across server action calls in dev (in production this would be Redis/Memcached)
export const loginRateLimiter = new RateLimiter(5, 15);

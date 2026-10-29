import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/shared/env";

// Create Redis client only if credentials are available
const redis =
  env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_URL,
        token: env.UPSTASH_REDIS_TOKEN,
      })
    : null;

// Fallback in-memory rate limiter for when Redis is not configured
class InMemoryRatelimit {
  private store = new Map<string, { count: number; resetAt: number }>();

  async limit(key: string) {
    const now = Date.now();
    const entry = this.store.get(key);
    const windowMs = 60 * 1000; // 1 minute

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, limit: 10, remaining: 9, reset: now + windowMs };
    }

    if (entry.count >= 10) {
      return { success: false, limit: 10, remaining: 0, reset: entry.resetAt };
    }

    entry.count++;
    return {
      success: true,
      limit: 10,
      remaining: 10 - entry.count,
      reset: entry.resetAt,
    };
  }
}

const fallbackLimiter = new InMemoryRatelimit();

// Use Redis if available, otherwise fallback to in-memory
const redisLimiter = redis
  ? new (require("@upstash/ratelimit").Ratelimit)({
      redis,
      limiter: require("@upstash/ratelimit").Ratelimit.slidingWindow(10, "1 m"),
      analytics: false,
      prefix: "ratelimit:login",
    })
  : null;

export const rateLimitLogin = {
  async limit(key: string) {
    if (redisLimiter) return redisLimiter.limit(key);
    return fallbackLimiter.limit(key);
  },
};

export const rateLimitSolicitacao = {
  async limit(key: string) {
    if (redisLimiter) return redisLimiter.limit(key);
    return fallbackLimiter.limit(key);
  },
};

/**
 * Token bucket rate limiter per provider.
 * Ensures we never exceed API rate limits even under concurrent sync pressure.
 *
 * Limits (conservative — 70% of actual to leave headroom):
 * - GitLab CE (self-hosted): no hard limit, but be nice — 30 req/s
 * - GitHub: 5000/hr → ~83/min → we use 50/min
 * - Jira Cloud: ~10 req/s → we use 5/s (300/min)
 * - ClickUp: 100/min → we use 70/min
 */

interface BucketConfig {
  maxTokens: number;    // Max burst
  refillRate: number;   // Tokens per second
  minDelay: number;     // Minimum ms between requests
}

const PROVIDER_LIMITS: Record<string, BucketConfig> = {
  gitlab: { maxTokens: 30, refillRate: 30, minDelay: 0 },      // Self-hosted: generous
  github: { maxTokens: 10, refillRate: 0.8, minDelay: 750 },   // 50/min ≈ 0.8/s
  jira: { maxTokens: 5, refillRate: 5, minDelay: 150 },        // 5/s with 150ms floor
  clickup: { maxTokens: 5, refillRate: 1.1, minDelay: 600 },   // 70/min ≈ 1.1/s
};

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private lastRequest: number = 0;

  constructor(private config: BucketConfig) {
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    // Refill tokens
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.config.maxTokens, this.tokens + elapsed * this.config.refillRate);
    this.lastRefill = now;

    // Wait if no tokens
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / this.config.refillRate) * 1000;
      await new Promise(r => setTimeout(r, Math.ceil(waitMs)));
      this.tokens = 0;
      this.lastRefill = Date.now();
    } else {
      this.tokens -= 1;
    }

    // Enforce minimum delay between requests
    const sinceLast = Date.now() - this.lastRequest;
    if (sinceLast < this.config.minDelay) {
      await new Promise(r => setTimeout(r, this.config.minDelay - sinceLast));
    }
    this.lastRequest = Date.now();
  }
}

const buckets = new Map<string, TokenBucket>();

export function getRateLimiter(provider: string): TokenBucket {
  if (!buckets.has(provider)) {
    const config = PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.github; // Default to GitHub limits
    buckets.set(provider, new TokenBucket(config));
  }
  return buckets.get(provider)!;
}

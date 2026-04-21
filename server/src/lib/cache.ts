const DEFAULT_TTL_SECONDS = 60;
const CHECK_PERIOD_SECONDS = 30;

interface CacheEntry {
  expiresAt: number;
  data: unknown;
}

class SimpleCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly checkPeriodMs: number;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly defaultTtlSeconds: number = DEFAULT_TTL_SECONDS,
    checkPeriodSeconds: number = CHECK_PERIOD_SECONDS,
  ) {
    this.checkPeriodMs = checkPeriodSeconds * 1000;
    this.startCleanup();
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  set(key: string, value: unknown, ttlSeconds?: number): void {
    const ttl = (ttlSeconds ?? this.defaultTtlSeconds) * 1000;
    this.store.set(key, { data: value, expiresAt: Date.now() + ttl });
  }

  flushAll(): void {
    this.store.clear();
  }

  private startCleanup(): void {
    this.intervalHandle = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(key);
        }
      }
    }, this.checkPeriodMs);

    // Allow the process to exit even if the interval is still running.
    if (this.intervalHandle.unref) {
      this.intervalHandle.unref();
    }
  }
}

export const apiCache = new SimpleCache(DEFAULT_TTL_SECONDS, CHECK_PERIOD_SECONDS);
